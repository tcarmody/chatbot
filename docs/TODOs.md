# Chatbot Improvement TODOs

## Completed Features

- [x] **1. Prompt Caching** - Split system prompt into static (cached) and dynamic parts
- [x] **2. Response Feedback** - Thumbs up/down UI with database tracking
- [x] **3. Conversation Persistence** - localStorage with hydration handling
- [x] **4. Context Window Optimization** - Truncate to last 20 messages
- [x] **5. FAQ Gap Analysis** - Detect and log knowledge gaps to database
- [x] **6. Intent Detection** - Classify user intent (frustrated, confused, etc.)
- [x] **7. Multi-Provider AI Support** - Config-based switching between Anthropic, OpenAI, and Google Gemini

---

## Remaining Features

### 8. RAG with Vector Search

**Purpose:** Replace keyword-based FAQ matching with semantic similarity search for better accuracy.

**Implementation plan:**
- Enable pgvector extension in Neon database
- Add OpenAI or Voyage embeddings API integration
- Create `faq_embeddings` table with vector column
- Pre-compute embeddings for all FAQ entries and course catalog on startup/deploy
- At query time: embed user message → cosine similarity search → return top-k results
- Hybrid approach: combine vector results with keyword fallback for robustness

**Complexity:** Medium-high (requires pgvector setup, embedding API costs, reindexing on content updates)

---

### 9. Multi-Instance Scaling (Upstash Redis)

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

### 10. Fine-Tuning

**Purpose:** Train a custom model on your specific support patterns for better responses.

**Implementation plan:**
- Export conversation logs and feedback data as training pairs
- Filter to high-quality examples (positive feedback, successful resolutions)
- Create fine-tuning dataset in Claude/OpenAI format
- Fine-tune a smaller model for cost efficiency
- A/B test fine-tuned vs base model

**Complexity:** High (requires significant data volume, ongoing maintenance)

---

### 11. Multi-Language Support

**Purpose:** Serve users in their preferred language.

**Implementation plan:**
- Detect language from user message (can use Claude or a lightweight detector)
- Translate FAQ knowledge base on-demand or pre-translate common languages
- Add `language` field to analytics for usage tracking
- Store translated responses in cache to avoid repeated translation costs
- Update UI to show language selector (optional)

**Complexity:** Medium (translation adds latency/cost, need to decide on approach)

---

### 12. Multi-Turn Context Summarization

**Purpose:** Preserve conversation context while reducing token usage by summarizing older messages instead of truncating.

**Implementation plan:**
- When conversation exceeds threshold (e.g., 15 messages), summarize older messages
- Use a fast model (Haiku) to generate 2-3 sentence summary of truncated portion
- Prepend summary as system context: "Previous conversation summary: ..."
- Cache summaries to avoid re-summarizing on each request
- Track summarization in analytics to measure token savings

**Complexity:** Medium (adds latency for summarization call, need caching strategy)

---

### 13. Response Caching

**Purpose:** Cache responses for common questions to reduce latency and API costs.

**Implementation plan:**
- Create cache key from: normalized question + detected categories
- Store in Redis/Upstash with TTL (e.g., 24 hours)
- Return cached response for exact/near-exact matches
- Invalidate cache when FAQ data changes
- Track cache hit rate in analytics
- Consider semantic cache matching using embeddings for fuzzy matches

**Complexity:** Medium (need cache invalidation strategy, hit rate monitoring)

---

### 14. Streaming to Non-Streaming Fallback

**Purpose:** Improve reliability by falling back to non-streaming when stream fails mid-response.

**Implementation plan:**
- Detect stream failures (connection drop, timeout, incomplete response)
- On failure, retry with non-streaming `chatCompletion()` endpoint
- Return complete response to client with indicator that streaming failed
- Log fallback events for monitoring
- Set reasonable timeout for stream chunks (e.g., 30s between chunks)

**Complexity:** Low-medium (need to handle partial stream state)

---

### 15. Rich Responses

**Purpose:** Return structured data that the widget can render as rich UI components.

**Implementation plan:**
- Define response schema: `{ type: 'text' | 'course_card' | 'step_list' | 'faq_card', data: ... }`
- Detect when response contains course recommendations → return as `course_card` array
- Detect numbered steps → return as `step_list` with checkboxes
- Update widget to render different response types with appropriate UI
- Keep backward compatibility with plain text responses

**Complexity:** Medium (requires widget UI updates, response parsing logic)

---

### 16. A/B Testing Framework

**Purpose:** Test different system prompts, models, or features and measure impact on user satisfaction.

**Implementation plan:**
- Create `experiments` table: id, name, variants (JSON), traffic_split, active
- Assign users to variants via consistent hashing (user_id or session_id)
- Log variant assignment with each conversation
- Track metrics per variant: response time, feedback scores, escalation rate
- Build simple admin UI to create/view experiments
- Support prompt variants, model variants, feature flags

**Complexity:** Medium-high (need statistical analysis, admin UI)

---

### 17. Session Analytics

**Purpose:** Track conversation-level metrics to measure chatbot effectiveness.

**Implementation plan:**
- Create `sessions` table: id, started_at, ended_at, message_count, resolved, escalated
- Track per session: resolution rate, escalation rate, avg turns to resolution
- Define "resolved" heuristic: positive feedback, or session ended without ticket
- Define "escalated" heuristic: support ticket created during session
- Build analytics dashboard showing trends over time
- Alert on degradation (e.g., resolution rate drops below threshold)

**Complexity:** Medium (need to define resolution heuristics, build dashboard)

---

### 18. Provider Failover

**Purpose:** Automatically switch to backup AI provider when primary fails.

**Implementation plan:**
- Define provider priority order in config (e.g., Anthropic → OpenAI → Google)
- On API error (5xx, timeout, rate limit), retry with next provider
- Log failover events with reason
- Optionally notify on repeated failovers (indicates provider issues)
- Ensure all providers configured with API keys for failover to work
- Consider cost implications (fallback provider may be more expensive)

**Complexity:** Low-medium (already have multi-provider support)

---

### 19. Circuit Breaker

**Purpose:** Prevent cascade failures by temporarily disabling failing providers.

**Implementation plan:**
- Track failure count per provider in sliding window (e.g., last 60 seconds)
- When failures exceed threshold (e.g., 5 failures in 60s), open circuit
- While circuit open, skip provider and use fallback immediately
- After cooldown period (e.g., 30s), allow one test request (half-open state)
- If test succeeds, close circuit; if fails, reset cooldown
- Use Redis for shared state across serverless instances

**Complexity:** Medium (need distributed state for serverless)

---

### 20. Request Queuing

**Purpose:** Queue requests during rate limits instead of rejecting them.

**Implementation plan:**
- When rate limited, add request to queue instead of returning 429
- Process queue in order as capacity becomes available
- Set max queue size and max wait time to prevent unbounded growth
- Return estimated wait time to client for UI feedback
- Use Redis list for distributed queue
- Consider priority queuing (e.g., paid users get priority)

**Complexity:** Medium-high (need queue management, timeout handling, client-side wait UI)
