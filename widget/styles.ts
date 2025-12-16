// Self-contained CSS for the widget (injected into Shadow DOM)

export function getWidgetStyles(primaryColor: string = '#2563eb'): string {
  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .widget-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
    }

    /* Launcher button */
    .widget-launcher {
      position: fixed;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${primaryColor};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 9998;
    }

    .widget-launcher:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    .widget-launcher.bottom-right {
      bottom: 20px;
      right: 20px;
    }

    .widget-launcher.bottom-left {
      bottom: 20px;
      left: 20px;
    }

    .widget-launcher svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    .widget-launcher.open svg.chat-icon {
      display: none;
    }

    .widget-launcher.open svg.close-icon {
      display: block;
    }

    .widget-launcher:not(.open) svg.chat-icon {
      display: block;
    }

    .widget-launcher:not(.open) svg.close-icon {
      display: none;
    }

    /* Chat window */
    .widget-window {
      position: fixed;
      width: 380px;
      height: 520px;
      max-height: calc(100vh - 100px);
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 9999;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: opacity 0.2s, transform 0.2s;
    }

    .widget-window.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .widget-window.bottom-right {
      bottom: 90px;
      right: 20px;
    }

    .widget-window.bottom-left {
      bottom: 90px;
      left: 20px;
    }

    /* Header */
    .widget-header {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -20)} 100%);
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .widget-header-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }

    .widget-header-subtitle {
      font-size: 12px;
      opacity: 0.9;
      margin-top: 2px;
    }

    .widget-new-chat {
      background: rgba(255, 255, 255, 0.15);
      border: none;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: background 0.2s;
    }

    .widget-new-chat:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .widget-new-chat svg {
      width: 12px;
      height: 12px;
    }

    /* Messages container */
    .widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #f9fafb;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Message bubbles */
    .widget-message {
      display: flex;
      flex-direction: column;
      max-width: 85%;
    }

    .widget-message.user {
      align-self: flex-end;
    }

    .widget-message.assistant {
      align-self: flex-start;
    }

    .widget-message-bubble {
      padding: 10px 14px;
      border-radius: 12px;
      word-wrap: break-word;
    }

    .widget-message.user .widget-message-bubble {
      background: ${primaryColor};
      color: white;
      border-bottom-right-radius: 4px;
    }

    .widget-message.assistant .widget-message-bubble {
      background: white;
      border: 1px solid #e5e7eb;
      border-bottom-left-radius: 4px;
    }

    .widget-message-time {
      font-size: 10px;
      color: #9ca3af;
      margin-top: 4px;
      padding: 0 4px;
    }

    .widget-message.user .widget-message-time {
      text-align: right;
    }

    /* Message actions */
    .widget-message-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .widget-message:hover .widget-message-actions {
      opacity: 1;
    }

    .widget-action-btn {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      border-radius: 4px;
      color: #9ca3af;
      transition: background 0.2s, color 0.2s;
    }

    .widget-action-btn:hover {
      background: #f3f4f6;
    }

    .widget-action-btn.positive {
      color: #22c55e;
      background: #f0fdf4;
    }

    .widget-action-btn.negative {
      color: #ef4444;
      background: #fef2f2;
    }

    .widget-action-btn svg {
      width: 14px;
      height: 14px;
    }

    /* Markdown content */
    .widget-message-content {
      font-size: 14px;
      line-height: 1.5;
    }

    .widget-message-content p {
      margin: 0 0 8px 0;
    }

    .widget-message-content p:last-child {
      margin-bottom: 0;
    }

    .widget-message-content ul,
    .widget-message-content ol {
      margin: 8px 0;
      padding-left: 20px;
    }

    .widget-message-content li {
      margin: 4px 0;
    }

    .widget-message-content code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 13px;
    }

    .widget-message-content pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 8px 0;
    }

    .widget-message-content pre code {
      background: none;
      padding: 0;
      color: inherit;
    }

    .widget-message-content a {
      color: ${primaryColor};
      text-decoration: underline;
    }

    .widget-message-content strong {
      font-weight: 600;
    }

    /* Loading indicator */
    .widget-loading {
      display: flex;
      gap: 4px;
      padding: 10px 14px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
    }

    .widget-loading-dot {
      width: 8px;
      height: 8px;
      background: #9ca3af;
      border-radius: 50%;
      animation: widget-bounce 1.4s ease-in-out infinite;
    }

    .widget-loading-dot:nth-child(1) { animation-delay: 0ms; }
    .widget-loading-dot:nth-child(2) { animation-delay: 150ms; }
    .widget-loading-dot:nth-child(3) { animation-delay: 300ms; }

    @keyframes widget-bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }

    /* Input area */
    .widget-input-area {
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
      background: white;
    }

    .widget-input-form {
      display: flex;
      gap: 8px;
    }

    .widget-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .widget-input:focus {
      border-color: ${primaryColor};
      box-shadow: 0 0 0 3px ${primaryColor}20;
    }

    .widget-input:disabled {
      background: #f9fafb;
      cursor: not-allowed;
    }

    .widget-send-btn {
      padding: 10px 16px;
      background: ${primaryColor};
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }

    .widget-send-btn:hover:not(:disabled) {
      background: ${adjustColor(primaryColor, -15)};
    }

    .widget-send-btn:disabled {
      background: #d1d5db;
      cursor: not-allowed;
    }

    .widget-send-btn svg {
      width: 16px;
      height: 16px;
    }

    /* Mobile responsiveness */
    @media (max-width: 480px) {
      .widget-window {
        width: calc(100vw - 20px);
        height: calc(100vh - 100px);
        max-height: none;
        bottom: 80px;
        right: 10px;
        left: 10px;
        border-radius: 12px;
      }

      .widget-window.bottom-left {
        right: 10px;
      }

      .widget-launcher {
        width: 54px;
        height: 54px;
      }

      .widget-launcher.bottom-right,
      .widget-launcher.bottom-left {
        bottom: 16px;
      }

      .widget-launcher.bottom-right {
        right: 16px;
      }

      .widget-launcher.bottom-left {
        left: 16px;
      }
    }
  `;
}

// Helper function to darken/lighten a hex color
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
