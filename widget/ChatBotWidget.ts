import { WidgetConfig, Message } from './types';
import { getWidgetStyles } from './styles';
import { icons } from './icons';
import { parseMarkdown } from './markdown';

const STORAGE_KEY_PREFIX = 'chatbot_widget_';

export class ChatBotWidget {
  private config: Required<WidgetConfig>;
  private container: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private isOpen: boolean = false;
  private messages: Message[] = [];
  private isLoading: boolean = false;

  // DOM references
  private launcher: HTMLButtonElement | null = null;
  private window: HTMLDivElement | null = null;
  private messagesContainer: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private sendButton: HTMLButtonElement | null = null;
  private newChatButton: HTMLButtonElement | null = null;

  constructor(config: WidgetConfig) {
    this.config = {
      apiUrl: config.apiUrl,
      position: config.position || 'bottom-right',
      primaryColor: config.primaryColor || '#2563eb',
      headerTitle: config.headerTitle || 'Customer Support',
      headerSubtitle: config.headerSubtitle || "We're here to help!",
      placeholder: config.placeholder || 'Type your message...',
      greeting: config.greeting || 'Hello! How can I help you today? Feel free to ask about our courses, enrollment, pricing, or anything else.',
      mascotImage: config.mascotImage || '',
      defaultOpen: config.defaultOpen || false,
      persistConversation: config.persistConversation !== false,
      onOpen: config.onOpen || (() => {}),
      onClose: config.onClose || (() => {}),
      onMessage: config.onMessage || (() => {}),
    };

    this.init();
  }

  private init(): void {
    // Create container element
    this.container = document.createElement('div');
    this.container.id = 'chatbot-widget-container';

    // Attach shadow DOM for style isolation
    this.shadowRoot = this.container.attachShadow({ mode: 'open' });

    // Inject styles
    const styleElement = document.createElement('style');
    styleElement.textContent = getWidgetStyles(this.config.primaryColor);
    this.shadowRoot.appendChild(styleElement);

    // Create widget structure
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'widget-container';
    widgetContainer.innerHTML = this.getWidgetHTML();
    this.shadowRoot.appendChild(widgetContainer);

    // Add to document
    document.body.appendChild(this.container);

    // Get DOM references
    this.launcher = this.shadowRoot.querySelector('.widget-launcher');
    this.window = this.shadowRoot.querySelector('.widget-window');
    this.messagesContainer = this.shadowRoot.querySelector('.widget-messages');
    this.input = this.shadowRoot.querySelector('.widget-input');
    this.sendButton = this.shadowRoot.querySelector('.widget-send-btn');
    this.newChatButton = this.shadowRoot.querySelector('.widget-new-chat');

    // Bind event listeners
    this.bindEvents();

    // Load persisted conversation
    this.loadConversation();

    // Open by default if configured
    if (this.config.defaultOpen) {
      this.open();
    }
  }

  private getWidgetHTML(): string {
    const launcherContent = this.config.mascotImage
      ? `<img class="mascot-icon" src="${this.escapeHtml(this.config.mascotImage)}" alt="Chat" />
        <svg class="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>`
      : `<svg class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <svg class="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>`;

    return `
      <!-- Launcher button -->
      <button class="widget-launcher ${this.config.position}${this.config.mascotImage ? ' has-mascot' : ''}" aria-label="Open chat">
        ${launcherContent}
      </button>

      <!-- Chat window -->
      <div class="widget-window ${this.config.position}">
        <!-- Header -->
        <div class="widget-header">
          <div class="widget-header-info">
            ${this.config.mascotImage ? `<img class="widget-header-mascot" src="${this.escapeHtml(this.config.mascotImage)}" alt="" />` : ''}
            <div>
              <h2 class="widget-header-title">${this.escapeHtml(this.config.headerTitle)}</h2>
              <p class="widget-header-subtitle">${this.escapeHtml(this.config.headerSubtitle)}</p>
            </div>
          </div>
          <button class="widget-new-chat" style="display: none;">
            ${icons.refresh}
            <span>New Chat</span>
          </button>
        </div>

        <!-- Messages -->
        <div class="widget-messages"></div>

        <!-- Input area -->
        <div class="widget-input-area">
          <form class="widget-input-form">
            <input
              type="text"
              class="widget-input"
              placeholder="${this.escapeHtml(this.config.placeholder)}"
              autocomplete="off"
            />
            <button type="submit" class="widget-send-btn">
              ${icons.send}
            </button>
          </form>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    // Launcher click
    this.launcher?.addEventListener('click', () => this.toggle());

    // Form submit
    const form = this.shadowRoot?.querySelector('.widget-input-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSend();
    });

    // New chat button
    this.newChatButton?.addEventListener('click', () => this.startNewChat());

    // Enter key in input
    this.input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  private loadConversation(): void {
    if (!this.config.persistConversation) {
      this.initializeWithGreeting();
      return;
    }

    try {
      const storageKey = this.getStorageKey();
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.messages = parsed.map((msg: Message & { timestamp: string }) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      } else {
        this.initializeWithGreeting();
      }
    } catch {
      this.initializeWithGreeting();
    }

    this.renderMessages();
    this.updateNewChatVisibility();
  }

  private initializeWithGreeting(): void {
    this.messages = [
      {
        role: 'assistant',
        content: this.config.greeting,
        timestamp: new Date(),
      },
    ];
  }

  private saveConversation(): void {
    if (!this.config.persistConversation) return;

    try {
      const storageKey = this.getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(this.messages));
    } catch {
      // Storage full or unavailable
    }
  }

  private getStorageKey(): string {
    // Use domain-specific key to avoid conflicts
    const domain = new URL(this.config.apiUrl).hostname;
    return `${STORAGE_KEY_PREFIX}${domain}`;
  }

  private async handleSend(): Promise<void> {
    const message = this.input?.value.trim();
    if (!message || this.isLoading) return;

    // Clear input
    if (this.input) this.input.value = '';

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    this.messages.push(userMessage);
    this.renderMessages();
    this.saveConversation();
    this.config.onMessage(userMessage);

    // Show loading
    this.isLoading = true;
    this.updateInputState();

    try {
      // Use streaming endpoint
      const response = await fetch(`${this.config.apiUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Widget-Origin': window.location.origin,
        },
        body: JSON.stringify({
          message,
          conversationHistory: this.messages.slice(0, -1),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let fullContent = '';

      // Render initial streaming message
      this.renderStreamingMessage('');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                fullContent += data.text;
                this.updateStreamingMessage(fullContent);
              } else if (data.done) {
                // Stream complete
                const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                const assistantMessage: Message = {
                  role: 'assistant',
                  content: fullContent,
                  timestamp: new Date(),
                  id: messageId,
                  userMessage: message,
                  feedback: null,
                };
                this.messages.push(assistantMessage);
                this.config.onMessage(assistantMessage);
              } else if (data.error) {
                throw new Error(data.error);
              }
            } catch {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      this.messages.push(errorMessage);
    }

    this.isLoading = false;
    this.updateInputState();
    this.renderMessages();
    this.saveConversation();
    this.updateNewChatVisibility();
  }

  private renderStreamingMessage(content: string): void {
    if (!this.messagesContainer) return;

    const streamingHtml = `
      <div class="widget-message assistant widget-streaming">
        <div class="widget-message-bubble">
          <div class="widget-message-content">
            ${content ? parseMarkdown(content) : ''}
            <span class="widget-streaming-cursor"></span>
          </div>
        </div>
      </div>
    `;

    this.messagesContainer.innerHTML = this.messages
      .map((msg, index) => this.renderMessage(msg, index))
      .join('') + streamingHtml;

    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  private updateStreamingMessage(content: string): void {
    if (!this.messagesContainer) return;

    const streamingEl = this.messagesContainer.querySelector('.widget-streaming .widget-message-content');
    if (streamingEl) {
      streamingEl.innerHTML = parseMarkdown(content) + '<span class="widget-streaming-cursor"></span>';
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  private async submitFeedback(messageId: string, feedback: 'positive' | 'negative'): Promise<void> {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return;

    try {
      const response = await fetch(`${this.config.apiUrl}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Widget-Origin': window.location.origin,
        },
        body: JSON.stringify({
          messageId,
          userMessage: message.userMessage,
          assistantResponse: message.content,
          feedback,
        }),
      });

      if (response.ok) {
        message.feedback = feedback;
        this.saveConversation();
        this.renderMessages();
      }
    } catch {
      // Silently fail feedback submission
    }
  }

  private renderMessages(): void {
    if (!this.messagesContainer) return;

    this.messagesContainer.innerHTML = this.messages
      .map((msg, index) => this.renderMessage(msg, index))
      .join('');

    // Scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

    // Bind feedback buttons
    this.bindFeedbackButtons();
    this.bindCopyButtons();
  }

  private renderMessage(message: Message, index: number): string {
    const timeString = this.formatTime(message.timestamp);
    const isAssistant = message.role === 'assistant';

    let actionsHtml = '';
    if (isAssistant) {
      const copyBtnClass = 'widget-action-btn copy-btn';
      const thumbsUpClass = `widget-action-btn thumbs-up ${message.feedback === 'positive' ? 'positive' : ''}`;
      const thumbsDownClass = `widget-action-btn thumbs-down ${message.feedback === 'negative' ? 'negative' : ''}`;

      actionsHtml = `
        <div class="widget-message-actions">
          <button class="${copyBtnClass}" data-index="${index}" title="Copy">
            ${icons.copy}
          </button>
          ${
            message.id
              ? `
            <button class="${thumbsUpClass}" data-id="${message.id}" title="Helpful">
              ${icons.thumbsUp}
            </button>
            <button class="${thumbsDownClass}" data-id="${message.id}" title="Not helpful">
              ${icons.thumbsDown}
            </button>
          `
              : ''
          }
        </div>
      `;
    }

    return `
      <div class="widget-message ${message.role}">
        <div class="widget-message-bubble">
          <div class="widget-message-content">
            ${isAssistant ? parseMarkdown(message.content) : this.escapeHtml(message.content)}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <span class="widget-message-time">${timeString}</span>
          ${actionsHtml}
        </div>
      </div>
    `;
  }

  private bindFeedbackButtons(): void {
    const thumbsUpButtons = this.shadowRoot?.querySelectorAll('.thumbs-up');
    const thumbsDownButtons = this.shadowRoot?.querySelectorAll('.thumbs-down');

    thumbsUpButtons?.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) this.submitFeedback(id, 'positive');
      });
    });

    thumbsDownButtons?.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) this.submitFeedback(id, 'negative');
      });
    });
  }

  private bindCopyButtons(): void {
    const copyButtons = this.shadowRoot?.querySelectorAll('.copy-btn');

    copyButtons?.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const index = parseInt(btn.getAttribute('data-index') || '0', 10);
        const message = this.messages[index];
        if (message) {
          try {
            await navigator.clipboard.writeText(message.content);
            btn.innerHTML = icons.check;
            setTimeout(() => {
              btn.innerHTML = icons.copy;
            }, 2000);
          } catch {
            // Clipboard API failed
          }
        }
      });
    });
  }

  private updateInputState(): void {
    if (this.input) {
      this.input.disabled = this.isLoading;
    }
    if (this.sendButton) {
      this.sendButton.disabled = this.isLoading;
    }
  }

  private updateNewChatVisibility(): void {
    if (this.newChatButton) {
      this.newChatButton.style.display = this.messages.length > 1 ? 'flex' : 'none';
    }
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private startNewChat(): void {
    this.messages = [
      {
        role: 'assistant',
        content: this.config.greeting,
        timestamp: new Date(),
      },
    ];
    this.renderMessages();
    this.saveConversation();
    this.updateNewChatVisibility();
  }

  // Public API methods
  public open(): void {
    this.isOpen = true;
    this.launcher?.classList.add('open');
    this.window?.classList.add('visible');
    this.input?.focus();
    this.config.onOpen();
  }

  public close(): void {
    this.isOpen = false;
    this.launcher?.classList.remove('open');
    this.window?.classList.remove('visible');
    this.config.onClose();
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public destroy(): void {
    this.container?.remove();
    this.container = null;
    this.shadowRoot = null;
  }

  public sendMessage(message: string): void {
    if (this.input) {
      this.input.value = message;
      this.handleSend();
    }
  }
}
