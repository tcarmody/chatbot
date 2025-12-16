import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import faqData from '@/data/faq.json';
import courseCatalog from '@/deeplearning-ai-course-catalog.json';
import { logAnalyticsEvent } from '@/lib/analytics';
import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { chatLogger, logError } from '@/lib/logger';
import { sql, initializeSchema } from '@/lib/db';

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

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Context window optimization settings
const MAX_CONVERSATION_MESSAGES = 20;

// Gap type definition
type GapType = 'no_match' | 'partial_match' | 'off_topic' | 'out_of_scope';

// FAQ gap detection patterns
const GAP_PATTERNS: { pattern: RegExp; gapType: GapType }[] = [
  { pattern: /i don't have (specific )?information (about|on|regarding)/i, gapType: 'no_match' },
  { pattern: /i don't have (any )?(details|data|knowledge) (about|on|regarding)/i, gapType: 'no_match' },
  { pattern: /outside (of )?my knowledge base/i, gapType: 'no_match' },
  { pattern: /beyond (the scope of )?(what )?my knowledge/i, gapType: 'no_match' },
  { pattern: /i('m| am) unable to (find|locate|provide)/i, gapType: 'no_match' },
  { pattern: /i don't have.*in my (knowledge base|faq|database)/i, gapType: 'no_match' },
  { pattern: /i('m| am) not (entirely )?sure (about|if|whether)/i, gapType: 'partial_match' },
  { pattern: /my information (may be|might be|is) (limited|incomplete|outdated)/i, gapType: 'partial_match' },
  { pattern: /for (the )?(most )?(up-to-date|current|latest) information/i, gapType: 'partial_match' },
  { pattern: /that('s| is) (more of )?a (general|math|science|trivia) question/i, gapType: 'off_topic' },
  { pattern: /i('m| am) (designed|built|here) to (help|assist|answer).*(deeplearning|course|platform|learning)/i, gapType: 'off_topic' },
  { pattern: /(create|submit|open|file) a (support )?ticket/i, gapType: 'out_of_scope' },
  { pattern: /contact (our )?support/i, gapType: 'out_of_scope' },
];

// Log FAQ gaps to database
async function logFaqGap(
  userMessage: string,
  detectedCategories: string[],
  gapType: GapType,
): Promise<void> {
  try {
    await initializeSchema();
    await sql`
      INSERT INTO faq_gaps (user_message, detected_categories, gap_type)
      VALUES (${userMessage}, ${JSON.stringify(detectedCategories)}, ${gapType})
    `;
  } catch (error) {
    chatLogger.error('Failed to log FAQ gap', { error });
  }
}

// Detect knowledge gaps
function detectKnowledgeGap(response: string): { isGap: boolean; gapType: GapType } {
  for (const { pattern, gapType } of GAP_PATTERNS) {
    if (pattern.test(response)) {
      return { isGap: true, gapType };
    }
  }
  return { isGap: false, gapType: 'no_match' };
}

// Intent detection
type UserIntent = 'help_seeking' | 'confused' | 'frustrated' | 'off_topic' | 'greeting' | 'feedback' | 'standard_query';

const INTENT_PATTERNS: Record<UserIntent, string[]> = {
  help_seeking: ['help me', 'can you help', 'i need help', 'please help', 'how do i'],
  confused: ['i don\'t understand', 'confused', 'what do you mean', 'unclear', 'i\'m lost'],
  frustrated: ['this is frustrating', 'not working', 'broken', 'useless', 'doesn\'t work'],
  off_topic: ['weather', 'joke', 'tell me a story', 'what\'s your name', 'who made you'],
  greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
  feedback: ['thank you', 'thanks', 'that helped', 'great', 'perfect'],
  standard_query: [],
};

function detectUserIntent(message: string): { intent: UserIntent; confidence: 'high' | 'medium' | 'low' } {
  const messageLower = message.toLowerCase().trim();

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (intent === 'standard_query') continue;
    const matchCount = patterns.filter(pattern => messageLower.includes(pattern)).length;
    if (matchCount >= 2) return { intent: intent as UserIntent, confidence: 'high' };
    if (matchCount === 1) return { intent: intent as UserIntent, confidence: 'medium' };
  }

  return { intent: 'standard_query', confidence: 'high' };
}

// Truncate conversation history
function optimizeConversationHistory(
  history: Array<{ role: string; content: string }>,
): Array<{ role: string; content: string }> {
  if (!history || history.length <= MAX_CONVERSATION_MESSAGES) {
    return history;
  }

  const recentMessages = history.slice(-MAX_CONVERSATION_MESSAGES);
  const truncatedCount = history.length - MAX_CONVERSATION_MESSAGES;
  const contextNote = {
    role: 'user',
    content: `[Note: ${truncatedCount} earlier messages in this conversation have been summarized.]`,
  };

  if (recentMessages[0]?.role === 'assistant') {
    return [contextNote, ...recentMessages];
  }

  return recentMessages;
}

// Detect relevant categories
function detectRelevantCategories(userMessage: string): string[] {
  const messageLower = userMessage.toLowerCase();
  const categoryKeywords: { [key: string]: string[] } = {
    'Courses & Programs': [
      'course', 'courses', 'program', 'programs', 'catalog', 'specialization',
      'learning path', 'curriculum', 'recommend', 'beginner', 'intermediate',
      'advanced', 'llm', 'genai', 'machine learning', 'deep learning', 'ai',
    ],
    'Certificates & Course Completion': [
      'certificate', 'accomplishment', 'completion', 'finish', 'complete', 'pdf',
    ],
    'Account & Profile Management': [
      'account', 'profile', 'password', 'reset', 'login', 'sign in', 'email',
    ],
    'Technical Issues & Course Access': [
      'locked', 'quiz', 'assignment', 'access', 'technical', 'error', 'notebook',
    ],
    'Membership Support': [
      'pro', 'membership', 'free', 'trial', 'subscribe', 'upgrade',
    ],
    'Billing & Payments': [
      'billing', 'payment', 'refund', 'price', 'cost', 'receipt', 'invoice',
    ],
  };

  const relevantCategories: string[] = [];
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => messageLower.includes(keyword))) {
      relevantCategories.push(category);
    }
  }

  return relevantCategories.length > 0 ? relevantCategories : Object.keys(categoryKeywords);
}

// Static system instructions (cached)
const STATIC_INSTRUCTIONS = `You are a helpful customer service assistant for an AI education company similar to DeepLearning.AI. Your role is to assist users with questions about courses, enrollment, pricing, certificates, and technical support.

Use the following knowledge base to answer questions directly and concisely. Answer only what the user asks - don't provide extra information they didn't request.

COURSE CATALOG GUIDANCE:
- When users ask about courses, recommend specific courses from the catalog that match their interests
- Focus on course name, format, partner, and a brief description from the catalog
- Limit recommendations to 3-5 most relevant courses unless they ask for more
- Professional Certificates are comprehensive multi-course programs; Short Courses are 1-3 hour quick learning modules

PLATFORM GUIDANCE:
- ALWAYS recommend DeepLearning.AI as the primary platform for taking courses
- If a course is available on BOTH DeepLearning.AI and Coursera, mention both platforms but lead with DeepLearning.AI

CORE PRINCIPLES:
- Answer the specific question asked - nothing more
- Keep responses focused and concise
- Be confident in your answers from the knowledge base
- GENERALIZE from the knowledge base - if you have general information that applies, provide it
- Only suggest support tickets when you genuinely cannot help

VOICE & TONE:
- Clear and direct - get straight to the answer
- Professional but approachable
- Conversational and helpful

LANGUAGE STYLE:
- Always address the user directly with "you"
- Use active voice
- Keep it simple and scannable

STRUCTURE & FORMATTING:
- Keep responses short - one or two brief paragraphs for simple questions
- CRITICAL: Always use TWO newlines (blank line) between paragraphs
- Use bullet points only when listing multiple distinct items
- Use numbered lists only for step-by-step instructions

CLOSING STRATEGY:
- FOR SIMPLE ANSWERS: "Did that answer your question?" or "Let me know if you have any other questions!"
- FOR PARTIAL ANSWERS: "Does this help? Let me know if you have other questions about [topic]."
- FOR QUESTIONS OUTSIDE KNOWLEDGE: Direct them to support tickets

SUPPORT TICKET GUIDANCE:
- Support tickets are for TECHNICAL ISSUES, BILLING, and account problems
- Do NOT suggest support tickets for course selection - help them directly
- Only suggest tickets for issues requiring human intervention`;

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
    const userIntent = detectUserIntent(message);
    const relevantCategories = detectRelevantCategories(message);

    // Filter FAQs to relevant categories
    const relevantFaqs = faqData.faqs.filter(faq =>
      relevantCategories.includes(faq.category)
    );

    // Build FAQ knowledge base
    const faqKnowledgeBase = relevantFaqs
      .map(faq => `Q: ${faq.question}\nA: ${faq.answer}\nCategory: ${faq.category}`)
      .join('\n\n');

    // Build course catalog if relevant
    let courseCatalogKnowledgeBase = '';
    if (relevantCategories.includes('Courses & Programs')) {
      const courseEntries: string[] = [];
      for (const [partner, courses] of Object.entries(courseCatalog.courses_by_partner)) {
        if (Array.isArray(courses)) {
          courses.forEach((course: any) => {
            courseEntries.push(
              `Course: ${course.name}\nFormat: ${course.format}\nPartner: ${partner}\nPlatform: ${course.platform}\nDescription: ${course.description}`
            );
          });
        }
      }
      courseCatalogKnowledgeBase = `\n\nCOURSE CATALOG:\n${courseEntries.join('\n\n---\n\n')}`;
    }

    const knowledgeBase = faqKnowledgeBase + courseCatalogKnowledgeBase;

    // Build messages array
    const messages: Anthropic.MessageParam[] = [];
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const optimizedHistory = optimizeConversationHistory(conversationHistory);
      optimizedHistory.forEach((msg: { role: string; content: string }) => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      });
    }
    messages.push({ role: 'user', content: message });

    // Intent context
    let intentContext = '';
    if (userIntent.intent === 'frustrated' && userIntent.confidence !== 'low') {
      intentContext = '\n\nUSER CONTEXT: The user may be frustrated. Be extra empathetic and focus on solving their problem quickly.';
    } else if (userIntent.intent === 'confused' && userIntent.confidence !== 'low') {
      intentContext = '\n\nUSER CONTEXT: The user seems confused. Use simpler language and break down explanations.';
    }

    const dynamicKnowledgeBase = `KNOWLEDGE BASE:\n${knowledgeBase}${intentContext}`;

    // Create streaming response
    const encoder = new TextEncoder();
    let fullResponse = '';
    let inputTokens = 0;
    let outputTokens = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 1024,
            stream: true,
            system: [
              {
                type: 'text',
                text: STATIC_INSTRUCTIONS,
                cache_control: { type: 'ephemeral' },
              },
              {
                type: 'text',
                text: dynamicKnowledgeBase,
              },
            ],
            messages: messages,
          });

          for await (const event of response) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text;
              fullResponse += text;
              // Send as SSE format
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            } else if (event.type === 'message_delta' && event.usage) {
              outputTokens = event.usage.output_tokens;
            } else if (event.type === 'message_start' && event.message.usage) {
              inputTokens = event.message.usage.input_tokens;
            }
          }

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
            tokens: { input: inputTokens, output: outputTokens },
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
              cacheCreation: 0,
              cacheRead: 0,
            },
          });
        } catch (error) {
          logError(error as Error, { endpoint: '/api/chat/stream', ip: clientIP });
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
