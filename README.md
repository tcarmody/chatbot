# AI Customer Service Chatbot

An AI-powered customer service chatbot for DeepLearning.AI, built with Next.js and Claude Haiku. The chatbot answers common questions about courses, certificates, billing, and account management using a curated knowledge base.

## Features

### Core Chatbot
- **AI-Powered Responses**: Uses Claude Haiku 4.5 for fast, accurate answers
- **Smart FAQ Matching**: Category-based filtering reduces token usage by 50-70%
- **Prompt Caching**: Static instructions cached for 90% cost reduction on repeated queries
- **Conversation Persistence**: Chat history saved in localStorage across page reloads
- **Response Feedback**: Thumbs up/down buttons to track response quality

### Intelligence Features
- **Intent Detection**: Adapts responses for frustrated, confused, or off-topic users
- **FAQ Gap Analysis**: Automatically logs questions the chatbot can't answer
- **Context Window Optimization**: Manages long conversations efficiently (20 message limit)

### Admin & Analytics
- **Admin Dashboard**: View analytics, session management, and usage metrics
- **Question Topic Clustering**: Groups similar questions into actionable insights
- **Cache Savings Tracking**: See estimated cost savings from prompt caching
- **HubSpot Integration**: Seamless ticket creation for issues the chatbot can't resolve

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **LLM**: Claude Haiku 4.5 (Anthropic)
- **Database**: Neon Postgres (serverless)
- **Deployment**: Vercel
- **Error Tracking**: Sentry (optional)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Anthropic API key ([get one here](https://console.anthropic.com/))
- Neon Postgres database ([create free at neon.tech](https://neon.tech))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tcarmody/chatbot.git
   cd chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your credentials:
   ```bash
   # Required
   ANTHROPIC_API_KEY=your_api_key_here
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require

   # Optional
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
   ```

4. **Create an admin user**
   ```bash
   npm run setup-admin
   ```
   Follow the prompts to create your first admin account.

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   - Chatbot: http://localhost:3000
   - Admin Login: http://localhost:3000/admin/login
   - Analytics: http://localhost:3000/analytics (requires login)

## Project Structure

```
chatbot/
├── app/
│   ├── api/
│   │   ├── analytics/      # Analytics API endpoints
│   │   ├── admin/          # Admin auth endpoints
│   │   ├── chat/           # Chat API (LLM integration)
│   │   └── health/         # Health check endpoint
│   ├── admin/              # Admin pages (login, sessions)
│   ├── analytics/          # Analytics dashboard
│   └── components/         # React components
├── lib/
│   ├── analytics.ts        # Analytics tracking & clustering
│   ├── auth.ts             # Admin authentication
│   ├── db.ts               # Database connection & schema
│   ├── faqs.ts             # FAQ knowledge base
│   └── admin-middleware.ts # Auth middleware
├── data/
│   └── faqs.json           # FAQ knowledge base data
├── scripts/
│   └── setup-admin.ts      # Admin user creation script
└── public/                 # Static assets
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | API key for Claude |
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `NEXT_PUBLIC_APP_URL` | No | Application URL (default: http://localhost:3000) |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN for error tracking |
| `SENTRY_DSN` | No | Server-side Sentry DSN |

### FAQ Knowledge Base

FAQs are stored in `data/faqs.json` and organized by category:
- Account & Profile Management
- Certificates & Course Completion
- Billing & Payments
- Membership Support
- Technical Issues & Course Access

To add or modify FAQs, edit the JSON file directly. Changes take effect on the next server restart.

## Admin Features

### Analytics Dashboard (`/analytics`)

- Total query count and average response time
- Token usage breakdown (input, output, cache creation, cache read)
- Estimated costs with cache savings displayed
- Category usage breakdown
- Question topic clustering with drill-down to individual questions
- Response feedback tracking (coming soon)

### Session Management (`/admin/sessions`)

- View active admin sessions
- Monitor login activity

## Scripts

```bash
# Development
npm run dev           # Start dev server
npm run build         # Build for production
npm run start         # Start production server

# Testing
npm run test          # Run tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Admin
npm run setup-admin   # Create admin user

# Linting
npm run lint          # Run ESLint
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js. Ensure you:
- Set all required environment variables
- Configure the build command: `npm run build`
- Configure the start command: `npm run start`

## Architecture Decisions

For detailed architecture and design decisions, see [DOCTRINE.md](./DOCTRINE.md).

Key decisions:
- **Claude Haiku 4.5**: Optimized for speed and cost in customer service
- **Prompt Caching**: Static instructions cached for 90% cost reduction
- **Category-based FAQ filtering**: Reduces token usage without semantic search complexity
- **Intent Detection**: Adapts tone for frustrated/confused users
- **HubSpot Forms**: External forms for ticket creation (zero maintenance)
- **Neon Postgres**: Serverless database for analytics and user management

## License

Private project for DeepLearning.AI.
