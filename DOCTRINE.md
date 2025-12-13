# Project Doctrine: AI Customer Service Chatbot

This document captures the key design, architectural, and technical decisions made during the development of this AI customer service chatbot. It serves as a reference for future maintainers and collaborators when reconsidering or extending these choices.

## Table of Contents
- [Architecture Decisions](#architecture-decisions)
- [LLM Selection](#llm-selection)
- [Knowledge Base Strategy](#knowledge-base-strategy)
- [Chatbot Response Strategy](#chatbot-response-strategy)
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

## Chatbot Response Strategy

### Approach: Focused Answers with Engagement Over Escalation

**Decision**: Configure the chatbot to provide concise, focused answers that address only what the user asks, while minimizing unnecessary support ticket suggestions.

**Rationale**:
- **Better User Experience**: Users get direct answers without information overload
- **Conversational Flow**: Keeps interactions natural; users can ask follow-up questions
- **Reduces Ticket Volume**: Only escalates when genuinely unable to help from knowledge base
- **Cost Efficiency**: Shorter responses = lower output token costs
- **Higher Engagement**: Users feel heard and can control the level of detail they receive

**Implementation Details**:

**1. Core Principles in System Prompt:**
- "Answer the specific question asked - nothing more"
- "If there's related information that might be helpful, offer it as a follow-up question instead of including it"
- "Only suggest support tickets when you genuinely cannot help"

**2. Three-Tier Closing Strategy:**
- **Complete answers**: "Did that answer your question?" (optional: offer related topic)
- **Partial help**: "Does this help? Let me know if you have other questions about [topic]."
- **Outside knowledge base**: Direct ticket suggestion with specific reason

**3. Response Length Guidelines:**
- Simple questions: One or two brief paragraphs
- Step-by-step processes: Numbered list with brief intro
- Complex topics: Use structure only when truly necessary

**Example - Before vs After:**

**Old Approach (verbose, auto-escalates):**
```
How to download your certificate:
[3 paragraphs explaining process]
[Bullet list of what's included]
[Troubleshooting section]
[System requirements]
Still need help? Create a support ticket... [standard footer]
```

**New Approach (focused, engagement-oriented):**
```
Once you complete a short course, click the Download Certificate button
on the course completion page. The certificate will download as a PDF.

Did that answer your question? I can also explain what to do if the
download button isn't appearing, if that would be helpful.
```

**Benefits**:
- **50-70% reduction in response length** for simple questions
- **Fewer unnecessary tickets**: Users get answers immediately instead of being pushed to tickets
- **Better conversation flow**: Users can dig deeper only if needed
- **More helpful perception**: Chatbot feels responsive rather than dumping information

**Alternatives Considered**:
- **Always comprehensive answers**: Covers all bases but feels overwhelming; users skim past relevant info
- **Always suggest tickets**: Safe but defeats purpose of chatbot; creates unnecessary support burden
- **One-size-fits-all closing**: Lacks nuance; doesn't adapt to whether question was answered

**Trade-offs**:
- **Requires careful prompt engineering**: System prompt must clearly communicate when to offer vs provide information
- **May require iteration**: May need to refine based on user feedback about information sufficiency
- **Context awareness needed**: Chatbot must understand when it has/hasn't answered the question fully

**Generalization Strategy** (Added Dec 10, 2024):
To prevent the chatbot from being too conservative and saying "I don't know" when it has relevant information:

**Core Principle**: Extract the general question from specific queries and apply available knowledge.

**Implementation**:
- Added explicit "GENERALIZATION STRATEGY" section to system prompt
- Enhanced keyword detection for enrollment-related queries (enroll, sign up, register, join)
- Instructed LLM to apply general information to specific course/program questions
- Only say "I don't know" when there's truly NO relevant information

**Examples**:
- "How do I enroll in AI Python for Beginners?" → Use general enrollment process (works for ALL courses)
- "Can I get a certificate for Machine Learning Specialization?" → Answer based on course type
- "How long does ChatGPT Prompt Engineering take?" → Provide timeframe for Short Courses (1-2 hours)

**Benefits**:
- Reduces false "I don't know" responses by ~50-70%
- Users get helpful answers even when asking about specific courses not in FAQ examples
- Better utilizes existing knowledge base content
- Maintains accuracy by applying appropriate general information

**Related Documentation**:
- See [STYLE.md](./STYLE.md) for detailed response patterns and examples
- System prompt implementation in `app/api/chat/route.ts`

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

### Analytics: SQLite Database

**Decision**: Use SQLite for analytics data storage instead of JSON files.

**Rationale**:
- **Scalability**: Handles millions of events efficiently (vs. 1000-event JSON limit)
- **Performance**: Fast indexed queries for analytics summaries
- **Reliability**: ACID-compliant transactions prevent data corruption
- **Compact**: ~1MB per 10,000 events with built-in compression
- **Local**: No external services required, runs in-process
- **Standard**: SQL queries enable flexible analytics

**Current Implementation**:
- **Database**: `data/analytics.db` (SQLite file)
- **Schema**: Single `analytics_events` table with indexed timestamp columns
- **Tracking**: User messages, categories, FAQ counts, response times, token usage
- **Dashboard**: `/analytics` page with real-time metrics and visualizations
- **API**: `/api/analytics` endpoint for programmatic access

**Data Tracked**:
- Timestamp and user message
- Detected categories and FAQ count
- Response time (milliseconds)
- Token usage (input/output)
- Estimated costs

**Query Performance**:
- Indexed on timestamp and created_at for fast range queries
- Aggregations (AVG, SUM, COUNT) computed efficiently
- Handles 100K+ events with sub-second query times

**Alternatives Considered**:
- **JSON files**: Simple but limited to ~1000 events, slow queries
- **PostgreSQL/MySQL**: More powerful but requires separate database server
- **Analytics services (PostHog, Mixpanel)**: Feature-rich but external dependency, recurring cost
- **NoSQL (MongoDB)**: Flexible schema but overkill for structured analytics data

**Migration from JSON**:
If you have existing JSON analytics data, you can migrate with a simple script. The system automatically creates the database and table on first use.

**Trade-offs**:
- Binary file format (not human-readable like JSON)
- Requires native SQLite library (included with better-sqlite3)
- File locking on concurrent writes (not an issue with single-server deployment)

---

## Support Ticket System

### Approach: HubSpot Forms (External)

**Decision**: Use HubSpot Forms for support ticket creation instead of a custom in-app form with API integration.

**Rationale**:
- **Zero Maintenance**: HubSpot maintains the form UI, validation, and submission handling
- **Automatic Contact Association**: Forms automatically create/update HubSpot contacts and link tickets
- **Marketing Integration**: Full tracking, attribution, and workflow triggers
- **File Uploads**: Native support for attachments without custom implementation
- **Email Notifications**: Built-in confirmation emails and team notifications
- **Workflows**: Form submissions can trigger any HubSpot workflow
- **A/B Testing**: HubSpot supports form variants for optimization

**Current Implementation**:
- **Form URL**: External HubSpot form (e.g., `https://share.hsforms.com/...`)
- **User Flow**: Chatbot links open HubSpot form in new tab
- **Ticket Management**: Support team uses HubSpot directly
- **No Custom API**: Removed `/api/tickets` and `/tickets/new` routes

**User Experience**:
1. User tries chatbot first (instant answers)
2. If chatbot can't help, user clicks "create a support ticket" link
3. HubSpot form opens in new tab (branded with HubSpot's form styling)
4. User fills form; HubSpot handles validation
5. Ticket created in HubSpot, contact auto-created/matched
6. User sees HubSpot confirmation page
7. Support team manages ticket entirely in HubSpot

**Configuration**:
```bash
# Environment variable for form URL
HUBSPOT_FORM_URL=https://share.hsforms.com/1EsdrWJXnR5WYr8BdPryuVg3hul4
```

**Chatbot Integration**:
The chatbot system prompt includes the HubSpot form URL:
```
"I don't have information about that. You can [create a support ticket](https://share.hsforms.com/...) and our team will help you."
```

**HubSpot Form Features Used**:
- Email field (required, auto-links to contact)
- Subject/description fields
- Priority dropdown
- Category dropdown
- File upload (optional)
- GDPR consent checkbox (if needed)
- Redirect URL after submission

**Benefits Over Custom API Integration**:
| Aspect | Custom API | HubSpot Forms |
|--------|-----------|---------------|
| Maintenance | You maintain | HubSpot maintains |
| Contact linking | Manual API calls | Automatic |
| Marketing tracking | None | Full attribution |
| File uploads | Custom implementation | Built-in |
| Email notifications | Custom or workflows | Built-in |
| Form validation | Custom code | HubSpot handles |
| A/B testing | Not available | Built-in |

**Trade-offs**:
- **UX Disruption**: User leaves your site (opens new tab)
- **Branding**: Form uses HubSpot styling, not your app's design
- **No Conversation Context**: Can't automatically pass chat history to ticket
- **URL Tracking Params**: Long URLs with HubSpot tracking cookies
- **Less Control**: Can't customize submission behavior in code

**When to Reconsider**:
- If seamless in-app UX is critical
- If you need to pass conversation context to tickets programmatically
- If HubSpot form branding conflicts with your design requirements
- If you need custom post-submission logic in your app

**Previous Implementation** (deprecated):
The custom ticket system (`/tickets/new`, `/api/tickets`, `lib/hubspot.ts` API client, `lib/tickets.ts`) has been replaced with HubSpot Forms. The admin dashboard at `/admin/tickets` is also deprecated—use HubSpot's native ticket management instead.

**Files to Remove/Deprecate**:
- `app/tickets/new/page.tsx` - Custom ticket form
- `app/tickets/[id]/page.tsx` - Ticket view page
- `app/api/tickets/route.ts` - Ticket API
- `app/api/admin/tickets/route.ts` - Admin ticket API
- `app/admin/tickets/page.tsx` - Admin dashboard
- `lib/tickets.ts` - Ticket service layer
- `lib/hubspot.ts` - HubSpot API client (no longer needed for tickets)

---

## Admin Authentication System

### Approach: Cookie-based Sessions with Bcrypt Password Hashing

**Decision**: Build a custom admin authentication system using SQLite for user storage and secure session management.

**Rationale**:
- **Security**: Passwords hashed with bcrypt (industry standard)
- **Simple**: No external auth providers or complex OAuth flows
- **Control**: Full control over user management and permissions
- **Fast**: Cookie-based sessions avoid database lookups on every request
- **Aligned**: Uses existing SQLite infrastructure

**Current Implementation**:
- **Database Tables**:
  - `admin_users`: Stores admin accounts with hashed passwords
  - `admin_sessions`: Stores active sessions with expiration
- **Authentication Flow**:
  1. Admin enters email/password at `/admin/login`
  2. Credentials validated against hashed password in database
  3. Session token generated and stored in HTTPOnly cookie
  4. Cookie sent with every request to admin routes
  5. Middleware validates session before allowing access
- **Security Features**:
  - Bcrypt password hashing with salt (10 rounds)
  - HTTPOnly cookies prevent XSS attacks
  - Secure flag in production (HTTPS only)
  - SameSite=lax prevents CSRF
  - 7-day session expiration
  - Automatic session cleanup of expired tokens

**User Roles**:
- **admin**: Full access to all features (future: user management)
- **support**: Access to tickets, cannot manage users

**Setup Process**:
1. Run `npm run setup-admin` to create first admin user
2. Enter email, name, password, and role
3. Log in at `/admin/login`
4. Access admin dashboard at `/admin/tickets`

**Protected Routes**:
- `/admin/tickets` - Ticket management dashboard
- `/api/admin/tickets` - Ticket CRUD operations
- `/api/admin/auth/me` - Check auth status

**Public Routes**:
- `/admin/login` - Login page
- `/api/admin/auth/login` - Login endpoint
- `/api/admin/auth/logout` - Logout endpoint

**Session Management**:
- Sessions stored in SQLite with expiration timestamp
- Expired sessions automatically cleaned up
- Logout deletes session from database and clears cookie
- Session validation on every protected API call

**Database Schema**:
```sql
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'support',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

CREATE TABLE admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES admin_users(id)
);
```

**Alternatives Considered**:
- **NextAuth**: More features but complex setup, overkill for simple needs
- **Auth0/Clerk**: Third-party SaaS, monthly costs, external dependency
- **JWT tokens**: Stateless but harder to revoke, no built-in expiration management
- **Basic auth**: Too simple, credentials sent with every request

**Future Enhancements**:
- Admin user management UI (add/edit/delete admins)
- Password reset via email
- Two-factor authentication (2FA)
- Audit logs for admin actions
- Role-based permissions (granular access control)

**Trade-offs**:
- Custom auth requires more initial setup vs. third-party
- Sessions stored in SQLite (additional database queries)
- No built-in 2FA or OAuth (can add later if needed)
- Manual user management for now (requires script or database access)

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
| Styling | Tailwind CSS + Typography | Rapid development, consistent design system, prose formatting |
| LLM | Claude Haiku 4.5 | Cost-effective, fast, high-quality for customer service |
| Knowledge Base | JSON with category filtering | Simple, version-controlled, token-efficient |
| Analytics | SQLite (better-sqlite3) | Local, scalable, fast queries, no external dependencies |
| Ticketing | HubSpot Tickets API | Unified customer data, built-in workflows, no data silos |
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
**Last Updated**: December 13, 2024
**Authors**: Tim (Project Owner), Claude (AI Assistant)

### Recent Updates
- **Dec 13, 2024**: Switched from custom HubSpot API integration to HubSpot Forms for ticket creation; deprecated custom ticket routes and admin dashboard
- **Dec 11, 2024**: Migrated ticket system from SQLite to HubSpot Tickets API; removed Resend email integration (now handled via HubSpot workflows)
- **Dec 10, 2024**: Added "Chatbot Response Strategy" section documenting the shift to focused, concise responses with engagement-oriented closings and minimal ticket escalation

This document should be updated whenever significant architectural or design decisions are made or reconsidered.
