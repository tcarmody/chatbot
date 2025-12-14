'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Send, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  id?: string; // Unique ID for feedback tracking
  userMessage?: string; // The user message this response is answering (for assistant messages)
  feedback?: 'positive' | 'negative' | null;
}

// Storage key for localStorage
const STORAGE_KEY = 'chatbot_conversation';

// Default greeting message
const DEFAULT_GREETING: Message = {
  role: 'assistant',
  content: 'Hello! How can I help you today? Feel free to ask about our courses, enrollment, pricing, or anything else.',
  timestamp: new Date(),
};

export default function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([DEFAULT_GREETING]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load conversation from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const restored = parsed.map((msg: Message & { timestamp: string }) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(restored);
      }
    } catch (err) {
      console.error('Failed to load conversation from localStorage:', err);
    }
    setIsHydrated(true);
  }, []);

  // Save conversation to localStorage when messages change
  useEffect(() => {
    if (!isHydrated) return; // Don't save until we've loaded
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (err) {
      console.error('Failed to save conversation to localStorage:', err);
    }
  }, [messages, isHydrated]);

  // Start a new conversation
  const startNewChat = () => {
    setMessages([{ ...DEFAULT_GREETING, timestamp: new Date() }]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const submitFeedback = async (messageId: string, feedback: 'positive' | 'negative', userMessage: string, assistantResponse: string) => {
    setFeedbackSubmitting(messageId);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, userMessage, assistantResponse, feedback }),
      });

      if (response.ok) {
        setMessages(prev => prev.map(msg =>
          msg.id === messageId ? { ...msg, feedback } : msg
        ));
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setFeedbackSubmitting(null);
    }
  };

  const scrollToBottom = () => {
    // Scroll within the chat container only, not the browser window
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to chat
    const newMessages = [...messages, { role: 'user' as const, content: userMessage, timestamp: new Date() }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Generate a unique ID for feedback tracking
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          id: messageId,
          userMessage: userMessage,
          feedback: null,
        },
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-w-3xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold">Customer Support</h2>
          <p className="text-sm text-blue-100">We're here to help!</p>
        </div>
        {messages.length > 1 && (
          <button
            onClick={startNewChat}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
            title="Start new conversation"
          >
            <RotateCcw className="w-3 h-3" />
            <span>New Chat</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div className={`max-w-[80%] ${message.role === 'assistant' ? 'group' : ''}`}>
              <div
                className={`rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="text-sm prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-1 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                  </div>
                )}
              </div>
              {/* Timestamp and actions */}
              <div className={`flex items-center gap-2 mt-1 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
                {message.role === 'assistant' && (
                  <>
                    <button
                      onClick={() => copyToClipboard(message.content, index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                      title="Copy to clipboard"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-gray-400" />
                      )}
                    </button>
                    {/* Feedback buttons - only show for messages with IDs (not the initial greeting) */}
                    {message.id && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => submitFeedback(message.id!, 'positive', message.userMessage!, message.content)}
                          disabled={feedbackSubmitting === message.id}
                          className={`p-1 rounded transition-colors ${
                            message.feedback === 'positive'
                              ? 'text-green-500 bg-green-50'
                              : 'text-gray-400 hover:bg-gray-200 hover:text-green-500'
                          }`}
                          title="Helpful"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => submitFeedback(message.id!, 'negative', message.userMessage!, message.content)}
                          disabled={feedbackSubmitting === message.id}
                          className={`p-1 rounded transition-colors ${
                            message.feedback === 'negative'
                              ? 'text-red-500 bg-red-50'
                              : 'text-gray-400 hover:bg-gray-200 hover:text-red-500'
                          }`}
                          title="Not helpful"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 border border-gray-200 rounded-lg px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t border-gray-200 p-4 bg-white">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
