import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import faqData from '@/data/faq.json';
import courseCatalog from '@/deeplearning-ai-course-catalog.json';
import { logAnalyticsEvent } from '@/lib/analytics';
import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { chatLogger, logError } from '@/lib/logger';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Context window optimization settings
const MAX_CONVERSATION_MESSAGES = 20; // Keep last N messages

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
    const messages: Anthropic.MessageParam[] = [];

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

    // Dynamic knowledge base content (changes per request based on detected categories)
    const dynamicKnowledgeBase = `KNOWLEDGE BASE:
${knowledgeBase}`;

    // Call Claude Haiku 4.5 with prompt caching
    // Static instructions are cached to reduce token costs on repeated queries
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: staticInstructions,
          cache_control: { type: 'ephemeral' },
        },
        {
          type: 'text',
          text: dynamicKnowledgeBase,
        },
      ],
      messages: messages,
    });

    // Extract the assistant's response
    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Log analytics event
    const responseTime = Date.now() - startTime;

    // Extract cache usage from response (if available)
    const cacheCreationTokens = (response.usage as any).cache_creation_input_tokens ?? 0;
    const cacheReadTokens = (response.usage as any).cache_read_input_tokens ?? 0;

    chatLogger.info('Chat request completed', {
      responseTime,
      categories: relevantCategories,
      faqCount: relevantFaqs.length,
      tokens: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
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
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    });

    return NextResponse.json({
      response: assistantMessage,
      usage: response.usage,
    });
  } catch (error) {
    logError(error as Error, { endpoint: '/api/chat', ip: clientIP });
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
