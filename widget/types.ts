// Widget configuration types

export interface WidgetConfig {
  // Required: The URL of your chatbot API
  apiUrl: string;

  // Optional: Customize appearance
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  placeholder?: string;
  greeting?: string;

  // Optional: Widget behavior
  defaultOpen?: boolean;
  persistConversation?: boolean;

  // Optional: Callbacks
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (message: { role: 'user' | 'assistant'; content: string }) => void;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  id?: string;
  userMessage?: string;
  feedback?: 'positive' | 'negative' | null;
}

export interface ChatBotWidgetAPI {
  init: (config: WidgetConfig) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  destroy: () => void;
  sendMessage: (message: string) => void;
}

declare global {
  interface Window {
    ChatBotWidget?: ChatBotWidgetAPI;
  }
}
