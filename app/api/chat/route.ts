import { NextRequest, NextResponse } from 'next/server';
import { logAnalyticsEvent } from '@/lib/analytics';
import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
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
  // Rate limiting
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.chat);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const { message, conversationHistory } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
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

    // Build knowledge base from FAQs and course catalog
    const { knowledgeBase, relevantFaqs, relevantCategories } = buildKnowledgeBase(message);

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
