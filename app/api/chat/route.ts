import { NextRequest, NextResponse } from 'next/server';
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
import { chatCompletion, getModelInfo } from '@/lib/ai';
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
  return new NextResponse(null, { status: 204 });
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
      return NextResponse.json(
        { error: 'Invalid API key', code: 'INVALID_API_KEY' },
        { status: 401 }
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
    return NextResponse.json(
      {
        error: 'Too many requests. Please wait before sending more messages.',
        code: 'RATE_LIMIT_COOLDOWN',
        cooldownUntil: abuseCheck.cooldownUntil?.toISOString(),
      },
      { status: 429 }
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
    return NextResponse.json(
      {
        error: 'Daily token limit reached. Limit resets at midnight UTC.',
        code: 'TOKEN_BUDGET_EXCEEDED',
        used: tokenBudget.used,
        limit: tokenBudget.limit,
        resetsAt: tokenBudget.resetsAt.toISOString(),
      },
      { status: 429 }
    );
  }

  try {
    const { message, conversationHistory } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // 5. Check conversation length
    const convCheck = checkConversationLength(conversationHistory || []);
    if (!convCheck.allowed) {
      logRateLimitEvent(identifier, identifierType, 'conversation_limit', {
        conversationLength: convCheck.current,
        limit: convCheck.limit,
      }).catch(() => {});
      return NextResponse.json(
        {
          error: 'Conversation limit reached. Please start a new conversation.',
          code: 'CONVERSATION_LIMIT',
          current: convCheck.current,
          limit: convCheck.limit,
        },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Detect user intent
    const userIntent = detectUserIntent(message);

    // Log intent for analytics (especially non-standard intents)
    if (userIntent.intent !== 'standard_query') {
      chatLogger.info('User intent detected', {
        intent: userIntent.intent,
        confidence: userIntent.confidence,
        messagePreview: message.substring(0, 50),
      });
    }

    // Build knowledge base from FAQs and course catalog using semantic search
    const { knowledgeBase, relevantFaqs, relevantCategories } = await buildKnowledgeBase(message);

    // Build messages array with conversation history
    const messages = buildMessagesArray(conversationHistory, message);

    // Build intent context hint for special cases
    const intentContext = buildIntentContext(userIntent);

    // Dynamic knowledge base content (changes per request based on detected categories)
    const dynamicKnowledgeBase = `KNOWLEDGE BASE:\n${knowledgeBase}${intentContext}`;

    // Get model info for logging
    const modelInfo = getModelInfo();

    // Call AI provider with prompt caching support
    const response = await chatCompletion({
      messages,
      systemPrompt: {
        staticContent: SYSTEM_INSTRUCTIONS,
        dynamicContent: dynamicKnowledgeBase,
      },
      maxTokens: 1024,
    });

    // Extract the assistant's response
    const assistantMessage = response.content;

    // Check for FAQ gaps and log them (non-blocking)
    const gapDetection = detectKnowledgeGap(assistantMessage);
    if (gapDetection.isGap) {
      logFaqGap(message, relevantCategories, gapDetection.gapType).catch(() => {});
    }

    // Log analytics
    const responseTime = Date.now() - startTime;
    const cacheCreationTokens = response.usage.cacheCreationTokens ?? 0;
    const cacheReadTokens = response.usage.cacheReadTokens ?? 0;

    chatLogger.info('Chat request completed', {
      responseTime,
      categories: relevantCategories,
      faqCount: relevantFaqs.length,
      intent: userIntent.intent,
      intentConfidence: userIntent.confidence,
      model: modelInfo.displayName,
      tokens: {
        input: response.usage.inputTokens,
        output: response.usage.outputTokens,
        cacheCreation: cacheCreationTokens,
        cacheRead: cacheReadTokens,
      },
    });

    logAnalyticsEvent({
      timestamp: new Date().toISOString(),
      userMessage: message,
      detectedCategories: relevantCategories,
      faqCount: relevantFaqs.length,
      responseTime,
      tokenUsage: {
        input: response.usage.inputTokens,
        output: response.usage.outputTokens,
        cacheCreation: cacheCreationTokens,
        cacheRead: cacheReadTokens,
      },
    });

    // 6. Record token usage for rate limiting (non-blocking)
    const totalTokens = response.usage.inputTokens + response.usage.outputTokens;
    recordTokenUsage(identifier, identifierType, totalTokens).catch(() => {});

    // Update API key usage stats if using API key
    if (apiKeyId) {
      updateApiKeyUsage(apiKeyId, totalTokens).catch(() => {});
    }

    return NextResponse.json({
      response: assistantMessage,
      usage: {
        input_tokens: response.usage.inputTokens,
        output_tokens: response.usage.outputTokens,
      },
    });
  } catch (error) {
    const modelInfo = getModelInfo();
    logError(error as Error, { endpoint: '/api/chat', ip: clientIP, model: modelInfo.displayName });
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
