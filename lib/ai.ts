// AI Provider Abstraction Layer
// Supports config-based model switching while preserving provider-specific features
//
// Recommended models (as of December 2025):
//
// Anthropic Claude (https://docs.anthropic.com):
//   - claude-sonnet-4-5      (recommended - best balance of speed/cost/quality)
//   - claude-haiku-4-5       (fastest, most cost-effective)
//   - claude-opus-4-5        (premium, maximum intelligence)
//
// OpenAI GPT (https://platform.openai.com/docs/models):
//   - gpt-5.2                (latest flagship with reasoning)
//   - gpt-5.2-chat-latest    (instant responses, no reasoning)
//   - gpt-4o                 (previous generation, still capable)
//   - gpt-4o-mini            (cost-effective for simple tasks)
//
// Google Gemini (https://ai.google.dev/gemini-api/docs/models):
//   - gemini-3-flash-preview (NEW - fastest frontier model, released Dec 17 2025)
//   - gemini-2.5-flash       (stable - fast and capable)
//   - gemini-2.5-pro         (most advanced 2.5 model)
//   - gemini-2.0-flash       (previous generation)

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Supported providers and their models
export type Provider = 'anthropic' | 'openai' | 'google';

export interface ModelConfig {
  provider: Provider;
  model: string;
}

// Parse model string like "anthropic:claude-haiku-4-5" or "openai:gpt-4o-mini"
export function parseModelConfig(modelString: string): ModelConfig {
  const [provider, ...modelParts] = modelString.split(':');
  const model = modelParts.join(':'); // Handle models with colons

  if (!provider || !model) {
    throw new Error(
      `Invalid model format: "${modelString}". Expected "provider:model" (e.g., "anthropic:claude-haiku-4-5")`
    );
  }

  if (provider !== 'anthropic' && provider !== 'openai' && provider !== 'google') {
    throw new Error(`Unsupported provider: "${provider}". Supported: anthropic, openai, google`);
  }

  return { provider: provider as Provider, model };
}

// Default model from environment or fallback
export function getDefaultModelConfig(): ModelConfig {
  const modelString = process.env.AI_MODEL || 'anthropic:claude-haiku-4-5';
  return parseModelConfig(modelString);
}

// Provider-specific clients (lazy initialized)
let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;
let googleClient: GoogleGenerativeAI | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required for Anthropic models');
    }
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for OpenAI models');
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function getGoogleClient(): GoogleGenerativeAI {
  if (!googleClient) {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is required for Google Gemini models - get your key from https://aistudio.google.com/');
    }
    googleClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }
  return googleClient;
}

// Unified message types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// System prompt configuration
export interface SystemPrompt {
  // Static content that can be cached (Anthropic-specific optimization)
  staticContent?: string;
  // Dynamic content that changes per request
  dynamicContent: string;
}

// Chat completion options
export interface ChatCompletionOptions {
  model?: ModelConfig;
  messages: ChatMessage[];
  systemPrompt: SystemPrompt;
  maxTokens?: number;
  temperature?: number;
}

// Chat completion result
export interface ChatCompletionResult {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
  };
}

// Streaming chat completion options
export interface StreamingChatOptions extends ChatCompletionOptions {
  onText: (text: string) => void;
  onComplete: (result: ChatCompletionResult) => void;
  onError: (error: Error) => void;
}

// Non-streaming chat completion
export async function chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const modelConfig = options.model || getDefaultModelConfig();

  if (modelConfig.provider === 'anthropic') {
    return anthropicChatCompletion(modelConfig.model, options);
  } else if (modelConfig.provider === 'google') {
    return googleChatCompletion(modelConfig.model, options);
  } else {
    return openaiChatCompletion(modelConfig.model, options);
  }
}

// Streaming chat completion
export async function streamingChatCompletion(options: StreamingChatOptions): Promise<void> {
  const modelConfig = options.model || getDefaultModelConfig();

  if (modelConfig.provider === 'anthropic') {
    return anthropicStreamingChat(modelConfig.model, options);
  } else if (modelConfig.provider === 'google') {
    return googleStreamingChat(modelConfig.model, options);
  } else {
    return openaiStreamingChat(modelConfig.model, options);
  }
}

// Anthropic implementation with prompt caching
async function anthropicChatCompletion(
  model: string,
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const client = getAnthropicClient();

  // Build system prompt with caching support
  const systemBlocks: Anthropic.TextBlockParam[] = [];

  if (options.systemPrompt.staticContent) {
    systemBlocks.push({
      type: 'text',
      text: options.systemPrompt.staticContent,
      cache_control: { type: 'ephemeral' },
    });
  }

  systemBlocks.push({
    type: 'text',
    text: options.systemPrompt.dynamicContent,
  });

  // Convert messages to Anthropic format
  const messages: Anthropic.MessageParam[] = options.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens || 1024,
    temperature: options.temperature,
    system: systemBlocks,
    messages,
  });

  const content = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  return {
    content,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheCreationTokens: (response.usage as any).cache_creation_input_tokens,
      cacheReadTokens: (response.usage as any).cache_read_input_tokens,
    },
  };
}

// Anthropic streaming implementation
async function anthropicStreamingChat(
  model: string,
  options: StreamingChatOptions
): Promise<void> {
  const client = getAnthropicClient();

  // Build system prompt with caching support
  const systemBlocks: Anthropic.TextBlockParam[] = [];

  if (options.systemPrompt.staticContent) {
    systemBlocks.push({
      type: 'text',
      text: options.systemPrompt.staticContent,
      cache_control: { type: 'ephemeral' },
    });
  }

  systemBlocks.push({
    type: 'text',
    text: options.systemPrompt.dynamicContent,
  });

  // Convert messages to Anthropic format
  const messages: Anthropic.MessageParam[] = options.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  let fullContent = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheCreationTokens: number | undefined;
  let cacheReadTokens: number | undefined;

  try {
    const stream = await client.messages.create({
      model,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature,
      system: systemBlocks,
      messages,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text;
        fullContent += text;
        options.onText(text);
      } else if (event.type === 'message_start' && event.message.usage) {
        inputTokens = event.message.usage.input_tokens;
        cacheCreationTokens = (event.message.usage as any).cache_creation_input_tokens;
        cacheReadTokens = (event.message.usage as any).cache_read_input_tokens;
      } else if (event.type === 'message_delta' && event.usage) {
        outputTokens = event.usage.output_tokens;
      }
    }

    options.onComplete({
      content: fullContent,
      usage: {
        inputTokens,
        outputTokens,
        cacheCreationTokens,
        cacheReadTokens,
      },
    });
  } catch (error) {
    options.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

// OpenAI implementation
async function openaiChatCompletion(
  model: string,
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const client = getOpenAIClient();

  // Build messages array with system prompt
  const messages: OpenAI.ChatCompletionMessageParam[] = [];

  // Combine static and dynamic system content
  const systemContent = [
    options.systemPrompt.staticContent,
    options.systemPrompt.dynamicContent,
  ].filter(Boolean).join('\n\n');

  if (systemContent) {
    messages.push({ role: 'system', content: systemContent });
  }

  // Add conversation messages
  options.messages
    .filter((m) => m.role !== 'system')
    .forEach((m) => {
      messages.push({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      });
    });

  const response = await client.chat.completions.create({
    model,
    max_tokens: options.maxTokens || 1024,
    temperature: options.temperature,
    messages,
  });

  const content = response.choices[0]?.message?.content || '';

  return {
    content,
    usage: {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
    },
  };
}

// OpenAI streaming implementation
async function openaiStreamingChat(
  model: string,
  options: StreamingChatOptions
): Promise<void> {
  const client = getOpenAIClient();

  // Build messages array with system prompt
  const messages: OpenAI.ChatCompletionMessageParam[] = [];

  // Combine static and dynamic system content
  const systemContent = [
    options.systemPrompt.staticContent,
    options.systemPrompt.dynamicContent,
  ].filter(Boolean).join('\n\n');

  if (systemContent) {
    messages.push({ role: 'system', content: systemContent });
  }

  // Add conversation messages
  options.messages
    .filter((m) => m.role !== 'system')
    .forEach((m) => {
      messages.push({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      });
    });

  let fullContent = '';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const stream = await client.chat.completions.create({
      model,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature,
      messages,
      stream: true,
      stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        options.onText(delta);
      }

      // OpenAI sends usage in the final chunk
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens;
        outputTokens = chunk.usage.completion_tokens;
      }
    }

    options.onComplete({
      content: fullContent,
      usage: {
        inputTokens,
        outputTokens,
      },
    });
  } catch (error) {
    options.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

// Google Gemini implementation
async function googleChatCompletion(
  model: string,
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const client = getGoogleClient();
  const genModel = client.getGenerativeModel({ model });

  // Combine system prompt
  const systemContent = [
    options.systemPrompt.staticContent,
    options.systemPrompt.dynamicContent,
  ].filter(Boolean).join('\n\n');

  // Build conversation history for Gemini
  const history = options.messages
    .filter((m) => m.role !== 'system')
    .slice(0, -1) // All except the last message
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  // Get the last user message
  const lastMessage = options.messages[options.messages.length - 1];
  const userMessage = lastMessage?.content || '';

  const chat = genModel.startChat({
    history: history as any,
    systemInstruction: systemContent || undefined,
    generationConfig: {
      maxOutputTokens: options.maxTokens || 1024,
      temperature: options.temperature,
    },
  });

  const result = await chat.sendMessage(userMessage);
  const response = result.response;
  const content = response.text();

  // Gemini provides token counts in usageMetadata
  const usage = response.usageMetadata;

  return {
    content,
    usage: {
      inputTokens: usage?.promptTokenCount || 0,
      outputTokens: usage?.candidatesTokenCount || 0,
    },
  };
}

// Google Gemini streaming implementation
async function googleStreamingChat(
  model: string,
  options: StreamingChatOptions
): Promise<void> {
  const client = getGoogleClient();
  const genModel = client.getGenerativeModel({ model });

  // Combine system prompt
  const systemContent = [
    options.systemPrompt.staticContent,
    options.systemPrompt.dynamicContent,
  ].filter(Boolean).join('\n\n');

  // Build conversation history for Gemini
  const history = options.messages
    .filter((m) => m.role !== 'system')
    .slice(0, -1) // All except the last message
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  // Get the last user message
  const lastMessage = options.messages[options.messages.length - 1];
  const userMessage = lastMessage?.content || '';

  const chat = genModel.startChat({
    history: history as any,
    systemInstruction: systemContent || undefined,
    generationConfig: {
      maxOutputTokens: options.maxTokens || 1024,
      temperature: options.temperature,
    },
  });

  let fullContent = '';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const result = await chat.sendMessageStream(userMessage);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullContent += text;
        options.onText(text);
      }
    }

    // Get final response for usage metadata
    const response = await result.response;
    const usage = response.usageMetadata;
    inputTokens = usage?.promptTokenCount || 0;
    outputTokens = usage?.candidatesTokenCount || 0;

    options.onComplete({
      content: fullContent,
      usage: {
        inputTokens,
        outputTokens,
      },
    });
  } catch (error) {
    options.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

// Export model info for logging/display
export function getModelInfo(): { provider: Provider; model: string; displayName: string } {
  const config = getDefaultModelConfig();
  return {
    ...config,
    displayName: `${config.provider}:${config.model}`,
  };
}
