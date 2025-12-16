# ChatBot Widget

A standalone JavaScript widget that can be embedded on any website to add a chatbot interface.

## Quick Start

Add the following script tag to your HTML:

```html
<script
  src="https://your-domain.com/widget.js"
  data-api-url="https://your-domain.com"
></script>
```

That's it! The chat widget will appear as a floating button in the bottom-right corner.

## Configuration Options

### Using Data Attributes

Configure the widget using data attributes on the script tag:

```html
<script
  src="https://your-domain.com/widget.js"
  data-api-url="https://your-domain.com"
  data-position="bottom-right"
  data-primary-color="#2563eb"
  data-header-title="Customer Support"
  data-header-subtitle="We're here to help!"
  data-placeholder="Type your message..."
  data-greeting="Hello! How can I help you today?"
  data-default-open="false"
  data-persist-conversation="true"
></script>
```

### Programmatic Initialization

For more control, initialize the widget with JavaScript:

```html
<script src="https://your-domain.com/widget.js"></script>
<script>
  ChatBotWidget.init({
    apiUrl: 'https://your-domain.com',
    position: 'bottom-right',        // or 'bottom-left'
    primaryColor: '#2563eb',
    headerTitle: 'Customer Support',
    headerSubtitle: "We're here to help!",
    placeholder: 'Type your message...',
    greeting: 'Hello! How can I help you today?',
    defaultOpen: false,
    persistConversation: true,
    onOpen: function() {
      console.log('Chat opened');
    },
    onClose: function() {
      console.log('Chat closed');
    },
    onMessage: function(message) {
      console.log('New message:', message.role, message.content);
    }
  });
</script>
```

## Configuration Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiUrl` | string | *required* | The base URL of your chatbot API |
| `position` | string | `'bottom-right'` | Widget position: `'bottom-right'` or `'bottom-left'` |
| `primaryColor` | string | `'#2563eb'` | Primary color for the widget (hex) |
| `headerTitle` | string | `'Customer Support'` | Title displayed in the chat header |
| `headerSubtitle` | string | `"We're here to help!"` | Subtitle displayed in the chat header |
| `placeholder` | string | `'Type your message...'` | Input placeholder text |
| `greeting` | string | `'Hello! How can I help you today?'` | Initial greeting message |
| `defaultOpen` | boolean | `false` | Open chat automatically on page load |
| `persistConversation` | boolean | `true` | Save conversation to localStorage |
| `onOpen` | function | - | Callback when chat opens |
| `onClose` | function | - | Callback when chat closes |
| `onMessage` | function | - | Callback when a message is sent/received |

## JavaScript API

The widget exposes a global `ChatBotWidget` object with the following methods:

### `ChatBotWidget.init(config)`
Initialize the widget with the given configuration. Must be called before other methods if not using data attributes.

### `ChatBotWidget.open()`
Programmatically open the chat window.

### `ChatBotWidget.close()`
Programmatically close the chat window.

### `ChatBotWidget.toggle()`
Toggle the chat window open/closed.

### `ChatBotWidget.sendMessage(message)`
Send a message programmatically.

### `ChatBotWidget.destroy()`
Remove the widget from the page. Call `init()` again to reinitialize.

## Examples

### Open chat on button click

```html
<button onclick="ChatBotWidget.open()">Need Help?</button>
```

### Open chat after delay

```html
<script>
  setTimeout(function() {
    ChatBotWidget.open();
  }, 5000); // Open after 5 seconds
</script>
```

### Custom styling integration

The widget uses Shadow DOM for style isolation, so your site's CSS won't affect it. To customize the widget appearance, use the configuration options like `primaryColor`.

### Track analytics

```html
<script>
  ChatBotWidget.init({
    apiUrl: 'https://your-domain.com',
    onMessage: function(message) {
      // Send to your analytics
      gtag('event', 'chat_message', {
        role: message.role,
        content_length: message.content.length
      });
    }
  });
</script>
```

## Building the Widget

To build the widget bundle:

```bash
# Install dependencies
npm install

# Build the widget
npm run build:widget

# Or watch for changes during development
npm run build:widget:watch
```

The built file will be output to `public/widget.js`.

## Technical Details

- **Bundle size**: ~25KB minified
- **Dependencies**: None (vanilla JavaScript)
- **Browser support**: All modern browsers (ES2018+)
- **Style isolation**: Shadow DOM prevents CSS conflicts
- **Storage**: Uses localStorage for conversation persistence (domain-scoped)

## Troubleshooting

### Widget doesn't appear
- Check browser console for errors
- Verify the `apiUrl` is correct and accessible
- Ensure the script URL is correct

### CORS errors
- The chatbot server includes CORS headers by default
- If you've customized the server, ensure `/api/chat` and `/api/feedback` allow cross-origin requests

### Styles look wrong
- The widget uses Shadow DOM, so external CSS shouldn't affect it
- Try clearing localStorage and refreshing if conversation state seems corrupted
