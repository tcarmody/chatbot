# Chatbot Improvement TODOs

## Completed Features

- [x] **1. Prompt Caching** - Split system prompt into static (cached) and dynamic parts
- [x] **2. Response Feedback** - Thumbs up/down UI with database tracking
- [x] **3. Conversation Persistence** - localStorage with hydration handling
- [x] **5. Context Window Optimization** - Truncate to last 20 messages
- [x] **6. FAQ Gap Analysis** - Detect and log knowledge gaps to database
- [x] **7. Intent Detection** - Classify user intent (frustrated, confused, etc.)

---

## Remaining Features

### 4. Vector Embeddings (Semantic Search)

**Purpose:** Replace keyword-based FAQ matching with semantic similarity search for better accuracy.

**Implementation plan:**
- Add OpenAI or Cohere embeddings API integration
- Create `faq_embeddings` table with pgvector extension in Neon
- Pre-compute embeddings for all FAQ entries on startup/deploy
- At query time: embed user message → find top-k similar FAQs via cosine similarity
- Fall back to keyword matching if embedding service unavailable

**Complexity:** Medium-high (requires pgvector setup, embedding API costs)

---

### 8. Multi-Instance Scaling (Upstash Redis)

**Purpose:** Support horizontal scaling by moving session state from in-memory to Redis.

**Current problem:** Rate limiting uses in-memory `Map` in `lib/rate-limit.ts`. On Vercel, each serverless function instance has isolated memory, so rate limits don't accumulate across instances. A user could bypass limits by hitting different instances.

**Implementation plan:**
- Add Upstash Redis (serverless, ~1-2ms latency from Vercel edge)
- Use `@upstash/ratelimit` package with sliding window algorithm:
  ```typescript
  import { Ratelimit } from '@upstash/ratelimit';
  import { Redis } from '@upstash/redis';

  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(20, '1m'),
  });
  ```
- Replace in-memory rate limiting in `/api/chat/stream` and `/api/chat`
- Free tier: 10,000 requests/day (sufficient for development)

**Complexity:** Low-Medium (Upstash has excellent Vercel integration, purpose-built SDK)

---

### 9. Fine-Tuning

**Purpose:** Train a custom model on your specific support patterns for better responses.

**Implementation plan:**
- Export conversation logs and feedback data as training pairs
- Filter to high-quality examples (positive feedback, successful resolutions)
- Create fine-tuning dataset in Claude/OpenAI format
- Fine-tune a smaller model for cost efficiency
- A/B test fine-tuned vs base model

**Complexity:** High (requires significant data volume, ongoing maintenance)

---

### 10. Multi-Language Support

**Purpose:** Serve users in their preferred language.

**Implementation plan:**
- Detect language from user message (can use Claude or a lightweight detector)
- Translate FAQ knowledge base on-demand or pre-translate common languages
- Add `language` field to analytics for usage tracking
- Store translated responses in cache to avoid repeated translation costs
- Update UI to show language selector (optional)

**Complexity:** Medium (translation adds latency/cost, need to decide on approach)
