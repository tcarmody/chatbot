'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import Navigation from '../components/Navigation';

export default function WidgetDemoPage() {
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [apiUrl, setApiUrl] = useState('');

  const initWidget = () => {
    const url = window.location.origin;
    if (window.ChatBotWidget) {
      window.ChatBotWidget.init({
        apiUrl: url,
        position: 'bottom-right',
        primaryColor: '#2563eb',
        headerTitle: 'Customer Support',
        headerSubtitle: "We're here to help!",
        mascotImage: '/mascots/server-ai.png',
        tooltipText: 'Chat with us!',
      });
      setWidgetLoaded(true);
    }
  };

  useEffect(() => {
    // Set apiUrl on client side only to avoid hydration mismatch
    setApiUrl(window.location.origin);

    // If widget script is already loaded (e.g., after client-side navigation),
    // initialize immediately
    if (window.ChatBotWidget) {
      initWidget();
    }

    // Cleanup widget on unmount
    return () => {
      if (window.ChatBotWidget) {
        window.ChatBotWidget.destroy();
      }
    };
  }, []);

  const handleWidgetLoad = () => {
    initWidget();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation variant="public" />
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Widget Demo</h1>
          <p className="text-gray-600 mb-6">
            This page demonstrates the embeddable chatbot widget. Look for the chat
            button in the bottom-right corner of the screen.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-blue-900 mb-2">How to embed on your site</h2>
            <p className="text-blue-800 text-sm mb-3">
              Add this single script tag to your HTML. For external sites, you&apos;ll need an API key (see Security section below):
            </p>
            <pre className="bg-blue-900 text-blue-100 p-4 rounded text-sm overflow-x-auto">
{`<script
  src="${apiUrl || 'https://your-domain.com'}/widget.js"
  data-api-url="${apiUrl || 'https://your-domain.com'}"
  data-api-key="YOUR_API_KEY"
></script>`}
            </pre>
          </div>

          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Try it out</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => window.ChatBotWidget?.open()}
                disabled={!widgetLoaded}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Open Chat
              </button>
              <button
                onClick={() => window.ChatBotWidget?.close()}
                disabled={!widgetLoaded}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              >
                Close Chat
              </button>
              <button
                onClick={() => window.ChatBotWidget?.sendMessage('Hello!')}
                disabled={!widgetLoaded}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              >
                Send &quot;Hello!&quot;
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="font-semibold text-gray-900 mb-3">Configuration Options</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 font-medium text-gray-700">Option</th>
                    <th className="text-left py-2 pr-4 font-medium text-gray-700">Default</th>
                    <th className="text-left py-2 font-medium text-gray-700">Description</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-mono text-xs">data-api-url</td>
                    <td className="py-2 pr-4 text-red-600">required</td>
                    <td className="py-2">Your chatbot API URL</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-mono text-xs">data-api-key</td>
                    <td className="py-2 pr-4 text-orange-600">recommended</td>
                    <td className="py-2">API key for authentication (required for external sites)</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-mono text-xs">data-position</td>
                    <td className="py-2 pr-4">bottom-right</td>
                    <td className="py-2">bottom-right or bottom-left</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-mono text-xs">data-primary-color</td>
                    <td className="py-2 pr-4">#2563eb</td>
                    <td className="py-2">Primary color (hex)</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-mono text-xs">data-header-title</td>
                    <td className="py-2 pr-4">Customer Support</td>
                    <td className="py-2">Chat header title</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-mono text-xs">data-default-open</td>
                    <td className="py-2 pr-4">false</td>
                    <td className="py-2">Open chat on page load</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-mono text-xs">data-mascot-image</td>
                    <td className="py-2 pr-4">none</td>
                    <td className="py-2">URL to custom mascot image</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-mono text-xs">data-tooltip-text</td>
                    <td className="py-2 pr-4">none</td>
                    <td className="py-2">Tooltip text shown next to launcher</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">data-tooltip-dismiss-delay</td>
                    <td className="py-2 pr-4">0</td>
                    <td className="py-2">Auto-dismiss tooltip after ms (0 = manual)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="font-semibold text-gray-900 mb-3">Security &amp; Rate Limits</h2>

            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-medium text-amber-900 mb-2">API Key Required for External Sites</h3>
                <p className="text-amber-800 text-sm">
                  When embedding the widget on external domains, you must include an API key to authenticate requests.
                  API keys can be created and managed in the <a href="/admin/api-keys" className="underline font-medium">Admin &gt; API Keys</a> dashboard.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Rate Limits</h3>
                <p className="text-gray-700 text-sm mb-3">
                  To prevent abuse, the following rate limits apply to widget usage:
                </p>
                <ul className="text-gray-700 text-sm space-y-2">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span><strong>Daily Token Budget:</strong> 50,000 tokens per day per API key or IP address. Resets at midnight UTC.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span><strong>Conversation Limit:</strong> Maximum 30 messages per conversation. Users can start a new conversation to continue.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span><strong>Request Rate:</strong> 5 messages per 10 seconds. Rapid requests may trigger a cooldown period.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Error Codes</h3>
                <p className="text-gray-700 text-sm mb-3">
                  When rate limits are exceeded, the API will return the following error codes:
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 pr-4 font-medium text-gray-700">Code</th>
                        <th className="text-left py-2 pr-4 font-medium text-gray-700">HTTP</th>
                        <th className="text-left py-2 font-medium text-gray-700">Description</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600">
                      <tr className="border-b border-gray-100">
                        <td className="py-2 pr-4 font-mono text-xs">INVALID_API_KEY</td>
                        <td className="py-2 pr-4">401</td>
                        <td className="py-2">API key is missing or invalid</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 pr-4 font-mono text-xs">TOKEN_BUDGET_EXCEEDED</td>
                        <td className="py-2 pr-4">429</td>
                        <td className="py-2">Daily token limit reached</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 pr-4 font-mono text-xs">CONVERSATION_LIMIT</td>
                        <td className="py-2 pr-4">400</td>
                        <td className="py-2">Maximum messages in conversation reached</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs">RATE_LIMIT_COOLDOWN</td>
                        <td className="py-2 pr-4">429</td>
                        <td className="py-2">Too many rapid requests, must wait before continuing</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Script src="/widget.js" onLoad={handleWidgetLoad} />
    </div>
  );
}
