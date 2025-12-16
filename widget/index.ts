// Widget entry point - exposes global ChatBotWidget API

import { ChatBotWidget } from './ChatBotWidget';
import type { WidgetConfig, ChatBotWidgetAPI } from './types';

let instance: ChatBotWidget | null = null;

const api: ChatBotWidgetAPI = {
  init(config: WidgetConfig): void {
    if (instance) {
      console.warn('ChatBotWidget is already initialized. Call destroy() first to reinitialize.');
      return;
    }

    if (!config.apiUrl) {
      console.error('ChatBotWidget: apiUrl is required');
      return;
    }

    instance = new ChatBotWidget(config);
  },

  open(): void {
    if (!instance) {
      console.warn('ChatBotWidget is not initialized. Call init() first.');
      return;
    }
    instance.open();
  },

  close(): void {
    if (!instance) {
      console.warn('ChatBotWidget is not initialized. Call init() first.');
      return;
    }
    instance.close();
  },

  toggle(): void {
    if (!instance) {
      console.warn('ChatBotWidget is not initialized. Call init() first.');
      return;
    }
    instance.toggle();
  },

  destroy(): void {
    if (!instance) {
      return;
    }
    instance.destroy();
    instance = null;
  },

  sendMessage(message: string): void {
    if (!instance) {
      console.warn('ChatBotWidget is not initialized. Call init() first.');
      return;
    }
    instance.sendMessage(message);
  },
};

// Expose to window
if (typeof window !== 'undefined') {
  window.ChatBotWidget = api;

  // Auto-initialize if data attributes are present on script tag
  const currentScript = document.currentScript as HTMLScriptElement | null;
  if (currentScript) {
    const apiUrl = currentScript.getAttribute('data-api-url');
    if (apiUrl) {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initFromAttributes(currentScript, apiUrl));
      } else {
        initFromAttributes(currentScript, apiUrl);
      }
    }
  }
}

function initFromAttributes(script: HTMLScriptElement, apiUrl: string): void {
  const config: WidgetConfig = {
    apiUrl,
    position: (script.getAttribute('data-position') as 'bottom-right' | 'bottom-left') || undefined,
    primaryColor: script.getAttribute('data-primary-color') || undefined,
    headerTitle: script.getAttribute('data-header-title') || undefined,
    headerSubtitle: script.getAttribute('data-header-subtitle') || undefined,
    placeholder: script.getAttribute('data-placeholder') || undefined,
    greeting: script.getAttribute('data-greeting') || undefined,
    defaultOpen: script.getAttribute('data-default-open') === 'true',
    persistConversation: script.getAttribute('data-persist-conversation') !== 'false',
  };

  api.init(config);
}

export { api as ChatBotWidget };
export type { WidgetConfig, ChatBotWidgetAPI };
