import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import faqData from '@/data/faq.json';

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

    // Build the knowledge base context from FAQ
    const knowledgeBase = faqData.faqs
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

Guidelines:
- Be friendly, professional, and concise
- If you're unsure, admit it and offer to escalate to human support
- Provide specific, actionable information when possible
- Ask clarifying questions if the user's request is ambiguous`;

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
