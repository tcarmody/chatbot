# AI Customer Service Chatbot

A customer service chatbot demo for an AI education company, powered by Claude Haiku 4.5 and built with Next.js.

## Features

- 💬 Real-time chat interface with Claude Haiku 4.5
- 📚 FAQ knowledge base for common questions
- 🎨 Clean, professional UI inspired by DeepLearning.AI
- ⚡ Built for high-volume with Next.js and streaming support
- 🔄 Conversation history tracking

## Getting Started

### Prerequisites

- Node.js 18+ installed
- An Anthropic API key ([get one here](https://console.anthropic.com/))

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables:
```bash
cp .env.local.example .env.local
```

3. Add your Anthropic API key to `.env.local`:
```
ANTHROPIC_API_KEY=your_actual_api_key_here
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the chatbot in action.

## Project Structure

```
chatbot/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # API endpoint for chat with Claude
│   ├── components/
│   │   └── ChatBot.tsx            # Main chatbot UI component
│   └── page.tsx                   # Home page with chatbot
├── data/
│   └── faq.json                   # FAQ knowledge base
└── .env.local                     # Environment variables (API key)
```

## Customizing the Knowledge Base

Edit the `data/faq.json` file to add, remove, or modify FAQs:

```json
{
  "faqs": [
    {
      "id": 1,
      "category": "Courses",
      "question": "Your question here?",
      "answer": "Your answer here."
    }
  ]
}
```

The chatbot will automatically use the updated knowledge base on the next request.

## Scaling for Production

For high-volume production deployment:

1. **Deploy to Vercel**: Click the button below or run `vercel deploy`
   - Automatic scaling and edge network
   - Built-in monitoring

2. **Add Rate Limiting**: Implement rate limiting middleware to prevent abuse

3. **Upgrade Knowledge Base**: Consider migrating to a vector database (Pinecone, Weaviate) for:
   - Semantic search across large FAQ databases
   - Better context retrieval with RAG (Retrieval Augmented Generation)

4. **Add Analytics**: Track usage, popular questions, and user satisfaction

5. **Implement Caching**: Cache common responses to reduce API costs

## Technology Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **LLM**: Claude Haiku 4.5 (via Anthropic SDK)
- **Knowledge Base**: JSON (easily upgradeable to vector DB)

## Architecture & Design Decisions

For detailed documentation on why specific technologies and design patterns were chosen, see [DOCTRINE.md](DOCTRINE.md).

This document covers:
- Architecture decisions (why Next.js, full-stack approach)
- LLM selection rationale (why Claude Haiku 4.5)
- Knowledge base strategy (JSON vs vector database)
- Visual design & UX choices
- Scaling and migration paths

**For maintainers and contributors**: Please review DOCTRINE.md before making significant architectural changes.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## License

MIT
