# Project Doctrine: AI Customer Service Chatbot

This document captures the key design, architectural, and technical decisions made during the development of this AI customer service chatbot. It serves as a reference for future maintainers and collaborators when reconsidering or extending these choices.

## Table of Contents
- [Architecture Decisions](#architecture-decisions)
- [LLM Selection](#llm-selection)
- [Knowledge Base Strategy](#knowledge-base-strategy)
- [Visual Design & UX](#visual-design--ux)
- [Frontend Implementation](#frontend-implementation)
- [Production Considerations](#production-considerations)

---

## Architecture Decisions

### Full-Stack Framework: Next.js 15

**Decision**: Use Next.js as a unified full-stack framework instead of separate frontend and backend services.

**Rationale**:
- **Single Codebase**: Reduces complexity by keeping frontend and backend in one repository
- **API Routes**: Built-in serverless API routes eliminate need for separate backend infrastructure
- **Performance**: Server-side rendering and automatic code splitting improve load times
- **Developer Experience**: Hot reload, TypeScript support, and modern tooling out of the box
- **Deployment**: Simple one-click deployment to Vercel with automatic scaling

**Alternatives Considered**:
- **Separate React + Express/FastAPI**: More flexible but increases deployment complexity and maintenance burden
- **Pure Backend Framework**: Would require separate frontend deployment and CORS configuration

**Trade-offs**:
- More opinionated structure than separate services
- Slightly heavier than pure backend-only solutions
- Vercel deployment is optimal; other platforms require more configuration

---

## LLM Selection

### Model: Claude Haiku 4.5

**Decision**: Use Anthropic's Claude Haiku 4.5 (`claude-haiku-4-5`) as the primary LLM.

**Rationale**:
- **Cost-Effective**: Haiku is optimized for high-volume applications with lower per-token costs
- **Speed**: Fast response times (critical for customer service chat experience)
- **Quality**: Maintains high-quality responses despite being the smaller model in Claude family
- **Anthropic Alignment**: Claude models are specifically designed to be helpful, harmless, and honest—ideal for customer service
- **Context Window**: Sufficient for FAQ knowledge base injection and conversation history

**Alternatives Considered**:
- **GPT-4/GPT-3.5 (OpenAI)**: Excellent quality but higher cost per request; GPT-3.5-turbo was close alternative
- **Claude Sonnet/Opus**: Higher quality but unnecessary cost for FAQ-based customer service
- **Open-source (Llama via Ollama)**: Free but requires local compute; not suitable for production high-volume deployment

**Trade-offs**:
- Requires Anthropic API key (external dependency)
- API costs scale with usage (though Haiku minimizes this)
- Cannot run fully offline

---

## Knowledge Base Strategy

### Approach: Hybrid JSON with Category-Based Filtering

**Decision**: Store FAQs in a simple JSON file with intelligent category-based filtering before injection into Claude's system prompt.

**Rationale**:
- **Simplicity**: No additional infrastructure or dependencies required (still just JSON)
- **Version Control**: FAQ changes tracked in Git with full history
- **Fast Iteration**: Developers can edit FAQs directly without database tools
- **Cost**: No vector database hosting or embedding generation costs
- **Efficiency**: Only inject relevant FAQs based on category detection (~50-70% reduction in context size)
- **Better Performance**: Smaller context = faster responses and lower token costs
- **Scalability**: Can handle more FAQs before hitting context limits

**Current Implementation**:
- **Total FAQs**: 29 FAQs organized into 5 categories
- **Category Detection**: Keyword-based matching on user messages
- **Categories**:
  - Certificates & Course Completion (5 FAQs)
  - Account & Profile Management (5 FAQs)
  - Technical Issues & Course Access (2 FAQs)
  - Membership Support (10 FAQs)
  - Billing & Payments (7 FAQs)
- **Fallback**: If no keywords match, all categories are included (ensures robustness)

**How It Works**:
1. User sends a message (e.g., "How do I reset my password?")
2. System detects relevant categories via keyword matching ("password" → Account & Profile Management)
3. Only FAQs from matched categories are injected into Claude's context
4. Typical context reduction: 29 FAQs → 5-12 relevant FAQs

**Benefits Over Full Injection**:
- **Lower Token Costs**: ~50-70% reduction in input tokens per request
- **Faster Responses**: Smaller context = quicker Claude processing
- **Better Accuracy**: Claude focuses on relevant FAQs, not entire knowledge base
- **Scalability Headroom**: Can grow to 50-75 FAQs before context becomes an issue

**When to Migrate to Vector Database**:
- FAQ database exceeds 100+ questions (even with filtering)
- Need true semantic search (e.g., "money back" → "refund")
- Require dynamic FAQ updates without redeployment
- Want to implement advanced RAG (Retrieval Augmented Generation)
- Need multilingual support

**Alternatives Considered**:
- **Full Injection (no filtering)**: Simpler but wastes tokens and context space
- **Vector Database (Pinecone, Weaviate, Chroma)**: Better semantic search but adds infrastructure complexity
- **Traditional Database (PostgreSQL)**: Better for CRUD but doesn't enable semantic search
- **LLM-based category detection**: More accurate but adds API call latency and cost

**Migration Path**:
```
Hybrid JSON (current, <100 FAQs) → Vector DB with semantic search (100-1000 FAQs) → Advanced RAG (1000+ FAQs)
```

**Trade-offs**:
- **Keyword matching limitations**: May miss semantic variations (e.g., "money back" doesn't match "refund" keywords)
- **Maintenance**: Keyword lists need occasional updates as FAQ language evolves
- **Edge cases**: Ambiguous queries may match multiple categories (acceptable, just larger context)
- **No semantic understanding**: Unlike vector DB, can't find similar concepts without exact keywords

---

## Visual Design & UX

### Design Philosophy: Clean, Professional, Accessible

**Decision**: Create a clean, professional interface inspired by DeepLearning.AI's design language.

**Key Design Choices**:

#### Color Palette
- **Primary**: Blue (`blue-600`) to Indigo (`indigo-700`) gradient
- **Rationale**: Blue conveys trust and professionalism; common in educational platforms
- **Alternatives**: Purple (considered but less professional), Green (too casual for AI education)

#### Layout Structure
- **Full-page design** with header, main content, and footer
- **Centered chatbot** as primary focal point
- **Quick links** below chat for secondary actions
- **Rationale**: Guides user attention to chat while providing context and alternatives

#### Chat Interface
- **Bubble-style messages**: Familiar pattern from messaging apps
- **User messages (right-aligned, blue)**: Clear visual distinction from assistant
- **Assistant messages (left-aligned, white with border)**: Professional, readable
- **Max width 80%**: Prevents overly long messages; maintains readability
- **Rationale**: Standard chat UX patterns reduce cognitive load

#### Typography
- **Tailwind Typography (prose classes)**: For Markdown rendering in assistant messages
- **Sans-serif font stack**: Clean, modern, highly readable
- **Font sizes**: Small (text-sm) for chat, larger for headings
- **Rationale**: Optimizes readability at typical screen sizes

#### Spacing & Padding
- **Generous padding**: Makes interface feel less cramped
- **Consistent spacing**: 4px increments (Tailwind scale)
- **Rationale**: Professional, breathable layout

**Alternatives Considered**:
- **Dark theme**: Modern but less accessible; harder to read long-form text
- **Minimalist white**: Too sterile for customer service warmth
- **Colorful/playful**: Inappropriate tone for professional AI education company

---

## Frontend Implementation

### UI Framework: React with TypeScript

**Decision**: Use React with TypeScript and Tailwind CSS for the frontend.

**Rationale**:
- **React**: Industry standard, component-based architecture, large ecosystem
- **TypeScript**: Type safety prevents runtime errors, better IDE support
- **Tailwind CSS**: Rapid styling, consistent design system, no CSS file overhead

**Alternatives Considered**:
- **Vue.js**: Easier learning curve but smaller ecosystem
- **Plain HTML/CSS/JS**: Simpler but more verbose for complex interactions
- **Other CSS frameworks (Bootstrap, Material-UI)**: More opinionated, heavier bundles

### Markdown Rendering: react-markdown

**Decision**: Use `react-markdown` library to render formatted assistant responses.

**Rationale**:
- **LLM Output**: Claude naturally generates Markdown formatting (bold, lists, links)
- **User Experience**: Formatted responses are more readable and professional
- **Lightweight**: react-markdown is small and has no complex dependencies
- **Customization**: Can style with Tailwind's typography plugin

**Alternatives Considered**:
- **Plain text**: Simpler but loses formatting benefits
- **marked.js**: Requires manual HTML sanitization
- **Custom parser**: Unnecessary complexity

**Implementation Details**:
- User messages render as plain text (no Markdown parsing needed)
- Assistant messages render with ReactMarkdown component
- Tailwind prose classes provide professional typography

---

## Production Considerations

### Scaling Strategy

**Current Architecture**: Optimized for demo and medium-scale deployment

**Recommended Scaling Path**:

#### Phase 1: Demo/MVP (Current)
- **Infrastructure**: Vercel serverless
- **Knowledge Base**: JSON file (20-50 FAQs)
- **Cost**: ~$20-50/month for moderate usage

#### Phase 2: Growing User Base (100-1000 users/day)
- **Add**: Rate limiting middleware
- **Add**: Response caching (Redis)
- **Add**: Analytics tracking (Vercel Analytics or PostHog)
- **Consider**: Migrating to PostgreSQL for FAQ management UI

#### Phase 3: High Volume (1000+ users/day)
- **Migrate**: Vector database (Pinecone, Weaviate) for semantic search
- **Add**: Streaming responses for better UX
- **Add**: Load balancing and CDN optimization
- **Consider**: Dedicated backend (separate from frontend) for better scaling

### Security Considerations

**Current Security Measures**:
- API key stored in environment variables (`.env.local`)
- `.gitignore` prevents API key from being committed
- Next.js API routes provide server-side security boundary

**Production Additions Needed**:
- Rate limiting (prevent API abuse)
- Input sanitization (prevent injection attacks)
- CORS configuration (if opening to external domains)
- API key rotation policy
- Monitoring and alerting for unusual usage patterns

### Cost Optimization

**Current Cost Drivers**:
- Anthropic API calls (Claude Haiku: ~$0.25 per 1M input tokens, ~$1.25 per 1M output tokens)
- Vercel hosting (free tier sufficient for demo)

**Current Optimizations**:
- **Category-based filtering**: Reduces input tokens by ~50-70% per request
- **Keyword matching**: Pre-filters FAQs before sending to Claude (no API cost)
- **Efficient model choice**: Claude Haiku 4.5 provides excellent quality at lowest price point

**Additional Optimization Strategies**:
- Cache common FAQ responses (Redis/Vercel KV)
- Implement conversation pruning (limit history length)
- Use lower max_tokens for simple queries
- Monitor usage patterns and refine category keywords
- Track which FAQs are never used and consider archiving

---

## Technology Stack Summary

| Layer | Technology | Why Chosen |
|-------|-----------|------------|
| Framework | Next.js 15 | Full-stack simplicity, Vercel deployment |
| Language | TypeScript | Type safety, better DX |
| Styling | Tailwind CSS | Rapid development, consistent design system |
| LLM | Claude Haiku 4.5 | Cost-effective, fast, high-quality for customer service |
| Knowledge Base | JSON with category filtering | Simple, version-controlled, token-efficient |
| Markdown | react-markdown | LLM-friendly, clean rendering |
| Hosting | Vercel (recommended) | Automatic scaling, edge network, simple deployment |

---

## Future Considerations

### When to Reconsider These Decisions

**Switch LLM Provider If**:
- Anthropic pricing becomes non-competitive
- Need specific features (e.g., function calling) only available elsewhere
- Require on-premise deployment (consider open-source models)

**Migrate Knowledge Base If**:
- FAQ count exceeds 100 questions (even with category filtering)
- Keyword-based filtering misses too many relevant FAQs
- Need true semantic search or similarity matching (e.g., "money back" → "refund")
- Want dynamic FAQ updates without redeployment
- Implement multi-language support
- Need analytics on FAQ relevance and usage patterns

**Refactor Architecture If**:
- Frontend and backend need to scale independently
- Multiple applications need to share the chat API
- Require WebSocket support for real-time features
- Need complex backend logic beyond simple API routes

**Redesign UI If**:
- User testing reveals accessibility issues
- Brand guidelines change significantly
- Adding voice or video chat capabilities
- Supporting mobile-first or responsive design needs change

---

## Document History

**Created**: December 2024
**Last Updated**: December 2024
**Authors**: Tim (Project Owner), Claude Sonnet 4.5 (AI Assistant)

This document should be updated whenever significant architectural or design decisions are made or reconsidered.
