import { NextRequest, NextResponse } from 'next/server';
import faqData from '@/data/faq.json';
import courseCatalog from '@/data/deeplearning-ai-course-catalog.json';
import { logAnalyticsEvent } from '@/lib/analytics';
import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { chatLogger, logError } from '@/lib/logger';
import { sql, initializeSchema } from '@/lib/db';
import { chatCompletion, getModelInfo, type ChatMessage } from '@/lib/ai';

// Handle CORS preflight requests for widget embedding
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

// Context window optimization settings
const MAX_CONVERSATION_MESSAGES = 20; // Keep last N messages

// FAQ gap detection patterns - using regex for flexible matching
// Gap types:
//   - no_match: Relevant question but FAQ doesn't have the answer (ACTIONABLE - add to FAQ)
//   - partial_match: FAQ has some info but incomplete (ACTIONABLE - improve FAQ)
//   - off_topic: Completely unrelated questions like math, trivia (NOT ACTIONABLE)
//   - out_of_scope: Related to learning but not our platform, e.g. competitor questions (NOT ACTIONABLE)
const GAP_PATTERNS: { pattern: RegExp; gapType: 'no_match' | 'partial_match' | 'off_topic' | 'out_of_scope' }[] = [
  // No match - relevant question but FAQ doesn't have answer (ACTIONABLE)
  { pattern: /i don't have (specific )?information (about|on|regarding)/i, gapType: 'no_match' },
  { pattern: /i don't have (any )?(details|data|knowledge) (about|on|regarding)/i, gapType: 'no_match' },
  { pattern: /outside (of )?my knowledge base/i, gapType: 'no_match' },
  { pattern: /beyond (the scope of )?(what )?my knowledge/i, gapType: 'no_match' },
  { pattern: /i('m| am) unable to (find|locate|provide)/i, gapType: 'no_match' },
  { pattern: /i don't have.*in my (knowledge base|faq|database)/i, gapType: 'no_match' },
  { pattern: /that('s| is) (outside|beyond|not within) my (area|scope|expertise)/i, gapType: 'no_match' },
  { pattern: /not (within|in) my (area|scope|domain)/i, gapType: 'no_match' },
  { pattern: /that('s| is) not (something|a question) i can/i, gapType: 'no_match' },

  // Partial match - has some info but incomplete (ACTIONABLE)
  { pattern: /i('m| am) not (entirely )?sure (about|if|whether)/i, gapType: 'partial_match' },
  { pattern: /my information (may be|might be|is) (limited|incomplete|outdated)/i, gapType: 'partial_match' },
  { pattern: /i (only )?have limited information/i, gapType: 'partial_match' },
  { pattern: /i don't have (the )?(latest|current|updated) information/i, gapType: 'partial_match' },
  { pattern: /for (the )?(most )?(up-to-date|current|latest) information/i, gapType: 'partial_match' },
  { pattern: /i('d| would) recommend (checking|visiting|contacting)/i, gapType: 'partial_match' },
  { pattern: /you (may|might|should) (want to )?(check|visit|contact)/i, gapType: 'partial_match' },

  // Off-topic - completely unrelated questions (NOT ACTIONABLE - expected behavior)
  { pattern: /that('s| is) (more of )?a (general|math|science|trivia) question/i, gapType: 'off_topic' },
  { pattern: /i('m| am) not (able|equipped) to (help|assist) with.*(math|calculation|arithmetic)/i, gapType: 'off_topic' },
  { pattern: /i can't (do|perform|help with) (math|calculation|arithmetic)/i, gapType: 'off_topic' },
  { pattern: /not something i (can|am able to) (help|assist|answer)/i, gapType: 'off_topic' },
  { pattern: /i('m| am) (designed|built|here) to (help|assist|answer).*(deeplearning|course|platform|learning)/i, gapType: 'off_topic' },
  { pattern: /i specialize in.*(deeplearning|course|education|learning)/i, gapType: 'off_topic' },
  { pattern: /my (focus|expertise|knowledge) is (on|limited to|specifically).*(course|learning|platform)/i, gapType: 'off_topic' },
  { pattern: /i (can only|only) (help|assist|answer).*(deeplearning|course|learning|platform)/i, gapType: 'off_topic' },
  { pattern: /i('m| am) a.*(deeplearning|course|support).*(assistant|chatbot|bot)/i, gapType: 'off_topic' },
  { pattern: /not (really )?related to (our |the )?(courses|platform|deeplearning|learning)/i, gapType: 'off_topic' },
  { pattern: /that('s| is) (a bit )?outside (of )?what i('m| am) here (to|for)/i, gapType: 'off_topic' },

  // Out of scope - related to learning but not our platform (NOT ACTIONABLE)
  { pattern: /(create|submit|open|file) a (support )?ticket/i, gapType: 'out_of_scope' },
  { pattern: /contact (our )?support/i, gapType: 'out_of_scope' },
  { pattern: /reach out to (our )?(support|team|staff)/i, gapType: 'out_of_scope' },
  { pattern: /beyond what i can help with/i, gapType: 'out_of_scope' },
  { pattern: /i('m| am) not (able|equipped) to (help|assist|answer)/i, gapType: 'out_of_scope' },
  { pattern: /i can't (help|assist|answer|provide).*(that|this)/i, gapType: 'out_of_scope' },
  { pattern: /i don't have information about.*(openai|coursera|udemy|udacity|edx|linkedin learning)/i, gapType: 'out_of_scope' },
  { pattern: /(openai|coursera|udemy|udacity|edx|linkedin learning)('s|s)? (platform|offering|course)/i, gapType: 'out_of_scope' },
];

// Gap type definition
type GapType = 'no_match' | 'partial_match' | 'off_topic' | 'out_of_scope';

// Log FAQ gaps to database for analysis
async function logFaqGap(
  userMessage: string,
  detectedCategories: string[],
  gapType: GapType,
  suggestedTopic?: string,
): Promise<void> {
  try {
    await initializeSchema();
    await sql`
      INSERT INTO faq_gaps (user_message, detected_categories, gap_type, suggested_topic)
      VALUES (${userMessage}, ${JSON.stringify(detectedCategories)}, ${gapType}, ${suggestedTopic || null})
    `;
    chatLogger.info('FAQ gap logged', { gapType, suggestedTopic, messagePreview: userMessage.substring(0, 50) });
  } catch (error) {
    // Don't fail the request if gap logging fails
    chatLogger.error('Failed to log FAQ gap', { error });
  }
}

// Detect if response indicates a knowledge gap
function detectKnowledgeGap(response: string): { isGap: boolean; gapType: GapType } {
  for (const { pattern, gapType } of GAP_PATTERNS) {
    if (pattern.test(response)) {
      return { isGap: true, gapType };
    }
  }

  return { isGap: false, gapType: 'no_match' };
}

// Intent detection types
type UserIntent = 'help_seeking' | 'confused' | 'frustrated' | 'off_topic' | 'greeting' | 'feedback' | 'standard_query';

// Intent detection patterns
const INTENT_PATTERNS: Record<UserIntent, string[]> = {
  help_seeking: [
    'help me', 'can you help', 'i need help', 'please help', 'assist me',
    'i\'m stuck', 'i\'m having trouble', 'i can\'t figure out', 'how do i',
    'what should i do', 'i don\'t know how', 'guide me', 'walk me through',
  ],
  confused: [
    'i don\'t understand', 'confused', 'what do you mean', 'unclear',
    'i\'m lost', 'doesn\'t make sense', 'can you explain', 'what?',
    'huh?', 'sorry?', 'i still don\'t get', 'that didn\'t help',
  ],
  frustrated: [
    'this is frustrating', 'not working', 'broken', 'useless', 'waste of time',
    'doesn\'t work', 'still not working', 'nothing works', 'terrible',
    'awful', 'hate this', 'so annoying', 'ridiculous', 'unacceptable',
  ],
  off_topic: [
    'weather', 'joke', 'tell me a story', 'what\'s your name', 'who made you',
    'are you a robot', 'are you ai', 'what can you do', 'play a game',
    'sing', 'poem', 'recipe', 'news', 'sports', 'politics',
  ],
  greeting: [
    'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
    'howdy', 'greetings', 'what\'s up', 'yo', 'hiya',
  ],
  feedback: [
    'thank you', 'thanks', 'that helped', 'great', 'perfect', 'awesome',
    'excellent', 'good job', 'well done', 'appreciate', 'helpful',
  ],
  standard_query: [], // Default - no specific patterns
};

// Detect user intent from message
function detectUserIntent(message: string): { intent: UserIntent; confidence: 'high' | 'medium' | 'low' } {
  const messageLower = message.toLowerCase().trim();

  // Check each intent pattern
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (intent === 'standard_query') continue; // Skip default

    const matchCount = patterns.filter(pattern => messageLower.includes(pattern)).length;

    if (matchCount >= 2) {
      return { intent: intent as UserIntent, confidence: 'high' };
    }
    if (matchCount === 1) {
      return { intent: intent as UserIntent, confidence: 'medium' };
    }
  }

  // Check for very short messages that might indicate confusion
  if (messageLower.length < 10 && (messageLower.includes('?') || messageLower === 'what' || messageLower === 'how')) {
    return { intent: 'confused', confidence: 'low' };
  }

  return { intent: 'standard_query', confidence: 'high' };
}

// Truncate conversation history to manage context window
function optimizeConversationHistory(
  history: Array<{ role: string; content: string }>,
): Array<{ role: string; content: string }> {
  if (!history || history.length <= MAX_CONVERSATION_MESSAGES) {
    return history;
  }

  // Keep the most recent messages
  const recentMessages = history.slice(-MAX_CONVERSATION_MESSAGES);

  // If we had to truncate, add a context note at the beginning
  const truncatedCount = history.length - MAX_CONVERSATION_MESSAGES;
  const contextNote = {
    role: 'user',
    content: `[Note: ${truncatedCount} earlier messages in this conversation have been summarized. The conversation has been ongoing.]`,
  };

  // Ensure we start with a user message (required by Claude API)
  if (recentMessages[0]?.role === 'assistant') {
    return [contextNote, ...recentMessages];
  }

  return recentMessages;
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

    // Detect relevant categories based on keywords in the user's message
    const detectRelevantCategories = (userMessage: string): string[] => {
      const messageLower = userMessage.toLowerCase();
      const categoryKeywords: { [key: string]: string[] } = {
        'Courses & Programs': [
          'course', 'courses', 'program', 'programs', 'catalog', 'specialization',
          'learning path', 'curriculum', 'what courses', 'which course', 'recommend',
          'beginner', 'intermediate', 'advanced', 'llm', 'genai', 'machine learning',
          'deep learning', 'ai', 'chatgpt', 'langchain', 'tensorflow', 'pytorch',
          'rag', 'agent', 'agents', 'nlp', 'computer vision', 'transformers',
          'partner', 'instructor', 'taught by', 'duration', 'hours', 'certificate program',
          'professional certificate', 'short course', 'available', 'offer', 'openai',
          'google', 'meta', 'aws', 'microsoft', 'hugging face', 'anthropic'
        ],
        'Certificates & Course Completion': [
          'certificate', 'accomplishment', 'completion', 'finish', 'complete',
          'pdf', 'download certificate', 'credential'
        ],
        'Account & Profile Management': [
          'account', 'profile', 'password', 'reset', 'login', 'sign in',
          'email', 'delete account', 'create account', 'preferences', 'enroll',
          'sign up', 'register', 'registration', 'join'
        ],
        'Technical Issues & Course Access': [
          'locked', 'quiz', 'assignment', 'access', 'technical', 'error',
          'notebook', 'code', 'download', 'api key', 'file'
        ],
        'Membership Support': [
          'pro', 'membership', 'free', 'trial', 'subscribe', 'upgrade',
          'downgrade', 'programming', 'time commit'
        ],
        'Billing & Payments': [
          'billing', 'payment', 'refund', 'price', 'cost', 'receipt',
          'invoice', 'credit card', 'charge', 'tax', 'monthly', 'annual'
        ],
      };

      const relevantCategories: string[] = [];

      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => messageLower.includes(keyword))) {
          relevantCategories.push(category);
        }
      }

      // If no categories matched, return all categories (fallback)
      return relevantCategories.length > 0
        ? relevantCategories
        : Object.keys(categoryKeywords);
    };

    // Track start time for analytics
    const startTime = Date.now();

    // Get relevant categories for this query
    const relevantCategories = detectRelevantCategories(message);

    // Filter FAQs to only include relevant categories
    const relevantFaqs = faqData.faqs.filter(faq =>
      relevantCategories.includes(faq.category)
    );

    // Build the knowledge base context from filtered FAQs
    const faqKnowledgeBase = relevantFaqs
      .map(
        (faq) =>
          `Q: ${faq.question}\nA: ${faq.answer}\nCategory: ${faq.category}`
      )
      .join('\n\n');

    // Build course catalog knowledge base if relevant
    let courseCatalogKnowledgeBase = '';
    if (relevantCategories.includes('Courses & Programs')) {
      // Build a searchable course catalog
      const coursesByPartner: { [key: string]: any[] } = {};

      // Organize courses by partner for better context
      for (const [partner, courses] of Object.entries(courseCatalog.courses_by_partner)) {
        if (Array.isArray(courses) && courses.length > 0) {
          coursesByPartner[partner] = courses;
        }
      }

      // Create a comprehensive course listing
      const courseEntries: string[] = [];

      for (const [partner, courses] of Object.entries(coursesByPartner)) {
        courses.forEach((course: any) => {
          const partnerName = partner === 'DeepLearning.AI (Independent)' ? 'DeepLearning.AI' : partner;
          courseEntries.push(
            `Course: ${course.name}
Format: ${course.format}
Partner: ${partnerName}
Platform: ${course.platform}
Learner Hours: ${course.learner_hours || 'N/A'}
Launch Date: ${course.launch_date}
Description: ${course.description}`
          );
        });
      }

      courseCatalogKnowledgeBase = `\n\nCOURSE CATALOG (${courseCatalog.catalog_info.total_courses} courses available):
Last Updated: ${courseCatalog.catalog_info.last_updated}

${courseEntries.join('\n\n---\n\n')}`;
    }

    // Combine knowledge bases
    const knowledgeBase = faqKnowledgeBase + courseCatalogKnowledgeBase;

    // Build messages array with conversation history
    const messages: ChatMessage[] = [];

    // Add conversation history if it exists (with context window optimization)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const optimizedHistory = optimizeConversationHistory(conversationHistory);
      const wasTruncated = conversationHistory.length > optimizedHistory.length;

      if (wasTruncated) {
        chatLogger.info('Conversation history truncated', {
          original: conversationHistory.length,
          optimized: optimizedHistory.length,
        });
      }

      optimizedHistory.forEach((msg: { role: string; content: string }) => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      });
    }

    // Add the current user message
    messages.push({
      role: 'user',
      content: message,
    });

    // Build system prompt with caching
    // The static instructions are cached, while the dynamic knowledge base is not
    const staticInstructions = `You are a helpful customer service assistant for an AI education company similar to DeepLearning.AI. Your role is to assist users with questions about courses, enrollment, pricing, certificates, and technical support.

Use the following knowledge base to answer questions directly and concisely. Answer only what the user asks - don't provide extra information they didn't request.

COURSE CATALOG GUIDANCE:
- When users ask about courses, recommend specific courses from the catalog that match their interests
- Focus on course name, format, partner, and a brief description from the catalog
- If asked about a topic (e.g., "LLM courses"), search the catalog descriptions for relevant keywords
- Limit recommendations to 3-5 most relevant courses unless they ask for more
- Include learner hours to help them understand time commitment
- Professional Certificates are comprehensive multi-course programs; Short Courses are 1-3 hour quick learning modules

PLATFORM GUIDANCE (IMPORTANT):
- ALWAYS recommend DeepLearning.AI as the primary platform for taking courses
- If a course is available on BOTH DeepLearning.AI and Coursera, mention both platforms but lead with DeepLearning.AI (e.g., "You can take this on DeepLearning.AI, and it's also available on Coursera")
- Only recommend Coursera as the primary option if the user specifically asks about Coursera
- If a user asks specifically about Coursera, answer their Coursera question directly and appropriately

CORE PRINCIPLES:
- Answer the specific question asked - nothing more
- Keep responses focused and concise
- If there's related information that might be helpful, offer it as a follow-up question instead of including it
- Be confident in your answers from the knowledge base
- GENERALIZE from the knowledge base - if the user asks about a specific course or topic, and you have general information that applies, provide that information
- Only suggest support tickets when you genuinely cannot help with ANY relevant information
- When a user asks about enrolling in a specific course, treat it the same as asking "How do I enroll?" - the process is the same for all courses

VOICE & TONE:
- Clear and direct - get straight to the answer
- Professional but approachable
- Conversational and helpful
- Confident without being verbose

LANGUAGE STYLE:
- Always address the user directly with "you" (never "users" or third person)
- Use active voice (e.g., "We process refunds" not "Refunds are processed")
- Use imperative mood for instructions (e.g., "Click the button" not "You should click")
- Keep it simple and scannable

STRUCTURE & FORMATTING:
- Keep responses short - one or two brief paragraphs for simple questions
- CRITICAL: Always use TWO newlines (blank line) between paragraphs - never use single newlines
- Use bullet points (with -) only when listing multiple distinct items
- Use numbered lists (1., 2., 3.) only for step-by-step instructions
- Add blank lines before and after lists for visual separation
- Avoid unnecessary section headers unless the answer truly requires structure

RESPONSE PATTERN:
1. Direct answer to the specific question asked
2. Relevant details ONLY if necessary to answer the question
3. Simple closing that checks understanding or offers related help

CLOSING STRATEGY:
Choose the appropriate closing based on the situation. IMPORTANT: Vary your closings - don't always use the same phrase!

1. FOR SIMPLE, COMPLETE ANSWERS - use ONE of these (rotate between them):
   - "Did that answer your question?"
   - "Does that help?"
   - "Let me know if you have any other questions!"
   - "Is there anything else I can help with?"
   - "Hope that helps!"
   - "Feel free to ask if you need more details."

   If there's related info that might be helpful, you can add:
   - "I can also explain [related topic] if you'd like."
   - "Would you like more details about [related topic]?"
   - "I'm happy to cover [related topic] too if that would help."

2. FOR PARTIAL ANSWERS (you provided help but question is partially outside knowledge base):
   - "Does this help? Let me know if you have other questions about [topic]."
   - "I hope that's useful! Feel free to ask more about [topic]."
   - "Let me know if you'd like more info on [topic]."

3. FOR QUESTIONS COMPLETELY OUTSIDE YOUR KNOWLEDGE:
   Be direct: "I don't have information about that in my knowledge base. You can [create a support ticket](https://share.hsforms.com/1EsdrWJXnR5WYr8BdPryuVg3hul4) and our team will help you with [specific need]."

SUPPORT TICKET GUIDANCE (IMPORTANT):
- Support tickets are for TECHNICAL ISSUES, CUSTOMER SERVICE, BILLING, PAYMENTS, SUBSCRIPTIONS, and account problems
- Do NOT suggest support tickets for course selection or recommendations - you can handle those through the course catalog
- Do NOT promise personalized course guidance via support tickets
- If someone wants help choosing a course, help them directly using the course catalog - ask clarifying questions about their goals, experience level, and interests
- Only suggest tickets for issues that require human intervention (bugs, payment disputes, account access problems, etc.)

IMPORTANT RULES:
- Answer ONLY what was asked - resist the urge to over-explain
- Don't dump all related information just because it's in the knowledge base
- Offer additional context as a follow-up option, not by default
- Keep it conversational - users can always ask for more details
- Do NOT suggest tickets unless you genuinely can't answer from the knowledge base

GENERALIZATION STRATEGY:
- If the user asks about a specific course, program, or scenario and you have general information that applies, USE IT
- Example: "How do I enroll in [Specific Course]?" → Answer with the general enrollment process, which works for ALL courses
- Example: "Can I get a certificate for [Specific Course]?" → Answer based on whether it's a Short Course, Course, or Specialization
- Example: "How long does [Specific Course] take?" → Provide general timeframes for that course type
- Don't refuse to answer just because the user mentioned a specific name - extract the general question and answer it
- Only say you don't have information if there's truly NO relevant information in your knowledge base`;

    // Build intent context hint for special cases
    let intentContext = '';
    if (userIntent.intent === 'frustrated' && userIntent.confidence !== 'low') {
      intentContext = `\n\nUSER CONTEXT: The user may be frustrated. Be extra empathetic, acknowledge their concern, and focus on solving their problem quickly. If you can't help, apologize and direct them to support.`;
    } else if (userIntent.intent === 'confused' && userIntent.confidence !== 'low') {
      intentContext = `\n\nUSER CONTEXT: The user seems confused. Use simpler language, break down your explanation into steps, and ask clarifying questions if needed.`;
    } else if (userIntent.intent === 'off_topic') {
      intentContext = `\n\nUSER CONTEXT: The user's question may be off-topic. Politely redirect them to topics you can help with (courses, enrollment, certificates, technical support, billing).`;
    }

    // Dynamic knowledge base content (changes per request based on detected categories)
    const dynamicKnowledgeBase = `KNOWLEDGE BASE:
${knowledgeBase}${intentContext}`;

    // Get model info for logging
    const modelInfo = getModelInfo();

    // Call AI provider with prompt caching support
    // Static instructions are cached to reduce token costs on repeated queries (Anthropic-specific)
    const response = await chatCompletion({
      messages,
      systemPrompt: {
        staticContent: staticInstructions,
        dynamicContent: dynamicKnowledgeBase,
      },
      maxTokens: 1024,
    });

    // Extract the assistant's response
    const assistantMessage = response.content;

    // Check for FAQ gaps and log them (non-blocking)
    const gapDetection = detectKnowledgeGap(assistantMessage);
    if (gapDetection.isGap) {
      // Fire and forget - don't await to avoid slowing response
      logFaqGap(message, relevantCategories, gapDetection.gapType).catch(() => {});
    }

    // Log analytics event
    const responseTime = Date.now() - startTime;

    // Extract cache usage from response (if available - Anthropic-specific)
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
