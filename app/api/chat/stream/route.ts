import { NextRequest } from 'next/server';
import { logAnalyticsEvent } from '@/lib/analytics';
import {
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
  RATE_LIMITS,
  checkTokenBudget,
  recordTokenUsage,
  checkConversationLength,
  checkAbuseThreshold,
  logRateLimitEvent,
} from '@/lib/rate-limit';
import { validateApiKey, updateApiKeyUsage } from '@/lib/api-keys';
import { chatLogger, logError } from '@/lib/logger';
import { streamingChatCompletion, getModelInfo } from '@/lib/ai';
import {
  detectUserIntent,
  buildIntentContext,
  buildKnowledgeBase,
  buildMessagesArray,
  detectKnowledgeGap,
  logFaqGap,
  SYSTEM_INSTRUCTIONS,
} from '@/lib/chat-utils';

// Handle CORS preflight requests for widget embedding
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Widget-Origin, X-API-Key',
    },
  });
}

export async function POST(req: NextRequest) {
  const clientIP = getClientIP(req);
  const apiKeyHeader = req.headers.get('X-API-Key');

  // Determine identifier (API key or IP)
  let identifier = clientIP;
  let identifierType: 'ip' | 'api_key' = 'ip';
  let apiKeyId: string | null = null;

  // 1. Validate API key if provided
  if (apiKeyHeader) {
    const keyValidation = await validateApiKey(apiKeyHeader);
    if (!keyValidation.valid) {
      logRateLimitEvent(clientIP, 'ip', 'invalid_api_key', { providedKey: apiKeyHeader.substring(0, 10) + '...' }).catch(() => {});
      return new Response(
        JSON.stringify({ error: 'Invalid API key', code: 'INVALID_API_KEY' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    identifier = keyValidation.keyId!;
    identifierType = 'api_key';
    apiKeyId = keyValidation.keyId;
  }

  // 2. Check abuse threshold (rapid requests detection)
  const abuseCheck = checkAbuseThreshold(identifier);
  if (abuseCheck.triggered) {
    logRateLimitEvent(identifier, identifierType, 'abuse_threshold', {
      cooldownUntil: abuseCheck.cooldownUntil?.toISOString(),
    }).catch(() => {});
    return new Response(
      JSON.stringify({
        error: 'Too many requests. Please wait before sending more messages.',
        code: 'RATE_LIMIT_COOLDOWN',
        cooldownUntil: abuseCheck.cooldownUntil?.toISOString(),
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Standard rate limiting (requests per minute)
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.chat);
  if (!rateLimitResult.success) {
    logRateLimitEvent(identifier, identifierType, 'rate_limit_exceeded', {
      limit: rateLimitResult.limit,
      resetTime: new Date(rateLimitResult.resetTime).toISOString(),
    }).catch(() => {});
    return rateLimitResponse(rateLimitResult);
  }

  // 4. Check daily token budget
  const tokenBudget = await checkTokenBudget(identifier, identifierType);
  if (!tokenBudget.allowed) {
    logRateLimitEvent(identifier, identifierType, 'token_budget_exceeded', {
      used: tokenBudget.used,
      limit: tokenBudget.limit,
      resetTime: tokenBudget.resetsAt.toISOString(),
    }).catch(() => {});
    return new Response(
      JSON.stringify({
        error: 'Daily token limit reached. Limit resets at midnight UTC.',
        code: 'TOKEN_BUDGET_EXCEEDED',
        used: tokenBudget.used,
        limit: tokenBudget.limit,
        resetsAt: tokenBudget.resetsAt.toISOString(),
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { message, conversationHistory } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Check conversation length
    const convCheck = checkConversationLength(conversationHistory || []);
    if (!convCheck.allowed) {
      logRateLimitEvent(identifier, identifierType, 'conversation_limit', {
        conversationLength: convCheck.current,
        limit: convCheck.limit,
      }).catch(() => {});
      return new Response(
        JSON.stringify({
          error: 'Conversation limit reached. Please start a new conversation.',
          code: 'CONVERSATION_LIMIT',
          current: convCheck.current,
          limit: convCheck.limit,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();

    // Detect user intent and build knowledge base using semantic search
    const userIntent = detectUserIntent(message);
    const { knowledgeBase, relevantFaqs, relevantCategories } = await buildKnowledgeBase(message);

    // Build messages array with conversation history
    const messages = buildMessagesArray(conversationHistory, message);

    // Build intent context and dynamic knowledge base
    const intentContext = buildIntentContext(userIntent);
    const dynamicKnowledgeBase = `KNOWLEDGE BASE:\n${knowledgeBase}${intentContext}`;

    // Create streaming response
    const encoder = new TextEncoder();
    let fullResponse = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheCreationTokens = 0;
    let cacheReadTokens = 0;

    const modelInfo = getModelInfo();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          await streamingChatCompletion({
            messages,
            systemPrompt: {
              staticContent: SYSTEM_INSTRUCTIONS,
              dynamicContent: dynamicKnowledgeBase,
            },
            maxTokens: 1024,
            onText: (text) => {
              fullResponse += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            },
            onComplete: (result) => {
              inputTokens = result.usage.inputTokens;
              outputTokens = result.usage.outputTokens;
              cacheCreationTokens = result.usage.cacheCreationTokens || 0;
              cacheReadTokens = result.usage.cacheReadTokens || 0;

              // Send done signal with usage info
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, usage: { input_tokens: inputTokens, output_tokens: outputTokens } })}\n\n`));
              controller.close();

              // Log analytics and gaps after stream completes
              const responseTime = Date.now() - startTime;
              const gapDetection = detectKnowledgeGap(fullResponse);
              if (gapDetection.isGap) {
                logFaqGap(message, relevantCategories, gapDetection.gapType).catch(() => {});
              }

              chatLogger.info('Streaming chat completed', {
                responseTime,
                categories: relevantCategories,
                intent: userIntent.intent,
                model: modelInfo.displayName,
                tokens: { input: inputTokens, output: outputTokens, cacheCreation: cacheCreationTokens, cacheRead: cacheReadTokens },
              });

              logAnalyticsEvent({
                timestamp: new Date().toISOString(),
                userMessage: message,
                detectedCategories: relevantCategories,
                faqCount: relevantFaqs.length,
                responseTime,
                tokenUsage: {
                  input: inputTokens,
                  output: outputTokens,
                  cacheCreation: cacheCreationTokens,
                  cacheRead: cacheReadTokens,
                },
              });

              // 6. Record token usage for rate limiting (non-blocking)
              const totalTokens = inputTokens + outputTokens;
              recordTokenUsage(identifier, identifierType, totalTokens).catch(() => {});

              // Update API key usage stats if using API key
              if (apiKeyId) {
                updateApiKeyUsage(apiKeyId, totalTokens).catch(() => {});
              }
            },
            onError: (error) => {
              logError(error, { endpoint: '/api/chat/stream', ip: clientIP, model: modelInfo.displayName });
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`));
              controller.close();
            },
          });
        } catch (error) {
          logError(error as Error, { endpoint: '/api/chat/stream', ip: clientIP, model: modelInfo.displayName });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    logError(error as Error, { endpoint: '/api/chat/stream', ip: clientIP });
    return new Response(JSON.stringify({ error: 'Failed to process chat request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
