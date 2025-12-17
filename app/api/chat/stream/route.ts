import { NextRequest } from 'next/server';
import { logAnalyticsEvent } from '@/lib/analytics';
import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
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
      'Access-Control-Allow-Headers': 'Content-Type, X-Widget-Origin',
    },
  });
}

export async function POST(req: NextRequest) {
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.chat);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const { message, conversationHistory } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const startTime = Date.now();

    // Detect user intent and build knowledge base
    const userIntent = detectUserIntent(message);
    const { knowledgeBase, relevantFaqs, relevantCategories } = buildKnowledgeBase(message);

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
