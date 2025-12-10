import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import faqData from '@/data/faq.json';
import { logAnalyticsEvent } from '@/lib/analytics';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
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
        'Certificates & Course Completion': [
          'certificate', 'accomplishment', 'completion', 'finish', 'complete',
          'short course', 'pdf', 'download certificate', 'credential'
        ],
        'Account & Profile Management': [
          'account', 'profile', 'password', 'reset', 'login', 'sign in',
          'email', 'delete account', 'create account', 'preferences'
        ],
        'Technical Issues & Course Access': [
          'locked', 'quiz', 'assignment', 'access', 'technical', 'error',
          'notebook', 'code', 'download', 'api key', 'file'
        ],
        'Membership Support': [
          'pro', 'membership', 'free', 'trial', 'subscribe', 'upgrade',
          'downgrade', 'beginner', 'programming', 'time commit', 'course'
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
    const knowledgeBase = relevantFaqs
      .map(
        (faq) =>
          `Q: ${faq.question}\nA: ${faq.answer}\nCategory: ${faq.category}`
      )
      .join('\n\n');

    // System prompt for the customer service chatbot
    const systemPrompt = `You are a helpful customer service assistant for an AI education company similar to DeepLearning.AI. Your role is to assist users with questions about courses, enrollment, pricing, certificates, and technical support.

Use the following knowledge base to answer questions accurately. If a question is not covered in the knowledge base, politely let the user know and offer to connect them with a human support representative.

KNOWLEDGE BASE:
${knowledgeBase}

VOICE & TONE:
- Be helpful, supportive, and solution-oriented
- Professional but approachable - maintain expertise without being cold
- Clear and direct - get to the point quickly
- Empathetic and patient - acknowledge user concerns
- Encouraging and reassuring

LANGUAGE STYLE:
- Always address the user directly with "you" (never "users" or third person)
- Use present tense for current states and capabilities
- Use active voice (e.g., "We process refunds" not "Refunds are processed")
- Use imperative mood for instructions (e.g., "Click the button" not "You should click")
- Frame information positively when possible

STRUCTURE & FORMATTING:
- Keep paragraphs short (2-4 sentences max)
- CRITICAL: Always use TWO newlines (blank line) between paragraphs - never use single newlines
- Use bullet points (with -) for lists, features, or multiple items
- Use numbered lists (1., 2., 3.) for step-by-step instructions
- Use section headers to organize longer responses (e.g., "How it works:", "What's included:")
- Bold important terms or section labels when introducing them
- Add blank lines before and after lists for visual separation

RESPONSE PATTERN:
1. Brief opening - acknowledge the question or provide context
2. Core answer - direct response to the user's question
3. Supporting details - organized with bullets or numbered steps
4. Next steps - actionable guidance when applicable
5. Standard closing - "Still need help?" footer

CLOSING:
Always end support responses with:
"Still need help? If you have more questions or encounter any issues, please create a support ticket here. Our team will review your request and get back to you as soon as possible."`;

    // Build messages array with conversation history
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history if it exists
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: { role: string; content: string }) => {
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

    // Call Claude Haiku 4.5
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    });

    // Extract the assistant's response
    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Log analytics event
    const responseTime = Date.now() - startTime;
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
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
