# Knowledge Base Gap Analysis

This document identifies gaps in the chatbot's current knowledge base and recommends additions to improve user experience.

## Current Coverage

The knowledge base contains **29 FAQs** across 5 categories plus a **full course catalog**:

| Category | FAQs | Coverage Quality |
|----------|------|------------------|
| Certificates & Course Completion | 5 | Strong |
| Account & Profile Management | 5 | Strong |
| Technical Issues & Course Access | 2 | Partial |
| Membership Support | 10 | Strong |
| Billing & Payments | 7 | Strong |

---

## Identified Gaps

### 1. Prerequisites & Learning Paths

**Current state:** No information about skill dependencies or recommended course sequences.

**User questions we can't answer:**
- "What should I learn before taking the LLM course?"
- "I'm a beginner—where do I start?"
- "What's the best order to take these courses?"

**Recommended additions:**
- FAQ about recommended starting points for beginners vs experienced developers
- Learning path recommendations by goal (career change, upskilling, specific technology)
- Prerequisites listed for advanced courses

**Why it matters:** Users who take courses out of order get frustrated and may abandon the platform. Clear guidance improves completion rates.

---

### 2. Technical Requirements

**Current state:** FAQ 12 covers downloading notebooks and API keys, but nothing about system requirements.

**User questions we can't answer:**
- "What browser works best?"
- "Can I take courses on my phone/tablet?"
- "Do I need a powerful computer for the labs?"

**Recommended additions:**
- Supported browsers and versions
- Mobile/tablet compatibility
- Hardware requirements for interactive labs
- Internet speed recommendations

**Why it matters:** Technical issues due to unsupported setups create unnecessary support tickets.

---

### 3. Enterprise & Teams

**Current state:** No information about team or organizational subscriptions.

**User questions we can't answer:**
- "Does my company have a subscription I can use?"
- "How do I get licenses for my team?"
- "Is there a bulk discount?"

**Recommended additions:**
- Enterprise/team subscription options (if available)
- How to check if employer has a subscription
- Contact process for enterprise inquiries

**Why it matters:** Enterprise users represent high-value accounts. Lack of information forces them to support tickets unnecessarily.

---

### 4. Career & Job Readiness

**Current state:** No information about career outcomes or job preparation.

**User questions we can't answer:**
- "Will this help me get a job in AI?"
- "Do employers recognize these certificates?"
- "Which courses are best for career changers?"

**Recommended additions:**
- How certificates are viewed by employers
- Career transition success stories or statistics
- Which certificates/courses are most valued by industry

**Why it matters:** Career advancement is a primary motivation for learners. Addressing this builds confidence in the platform's value.

---

### 5. Platform Features

**Current state:** No information about community, newsletters, or events.

**User questions we can't answer:**
- "Is there a community forum?"
- "How do I connect with other learners?"
- "What is The Batch newsletter?"
- "Do you host any events?"

**Recommended additions:**
- Community forum access and features
- Newsletter descriptions (The Batch, Data Points)
- Events, webinars, or live sessions
- Social media/Discord presence

**Why it matters:** Community features increase engagement and retention. Users should know these exist.

---

### 6. Platform Comparison (DeepLearning.AI vs Coursera)

**Current state:** System prompt guides chatbot behavior but no FAQ explains the difference to users.

**User questions we can't answer:**
- "What's the difference between taking a course on DeepLearning.AI vs Coursera?"
- "Why should I use DeepLearning.AI instead of Coursera?"
- "If I started on Coursera, can I continue on DeepLearning.AI?"

**Recommended additions:**
- Key differences between platforms (pricing, features, certificates)
- Benefits of DeepLearning.AI platform
- Account/progress portability between platforms

**Why it matters:** Users are confused about the relationship between platforms. Clear guidance supports the business goal of prioritizing DeepLearning.AI.

---

### 7. Accessibility & Accommodations

**Current state:** No information about accessibility features or accommodations.

**User questions we can't answer:**
- "Are courses accessible for screen readers?"
- "Do videos have captions?"
- "Can I get extended time for quizzes?"

**Recommended additions:**
- Accessibility features (captions, transcripts, keyboard navigation)
- How to request accommodations
- Supported assistive technologies

**Why it matters:** Accessibility is both a legal consideration and an inclusivity commitment. Users with disabilities need this information.

---

## Priority Recommendations

### High Priority (add first)
1. **Platform Comparison** — Directly supports business goals
2. **Prerequisites & Learning Paths** — High user demand, reduces confusion
3. **Technical Requirements** — Reduces support tickets

### Medium Priority
4. **Career & Job Readiness** — Builds trust and conversion
5. **Platform Features** — Increases engagement

### Lower Priority (add when resources allow)
6. **Enterprise & Teams** — Only if enterprise offerings exist
7. **Accessibility** — Important but may require coordination with product team

---

## Implementation Notes

When adding new FAQs:

1. **Keep answers concise** — Match the style of existing FAQs (2-4 sentences typical)
2. **Use consistent categories** — Consider adding "Getting Started" or "Platform Features" as new categories
3. **Update keyword detection** — Add relevant keywords to `detectRelevantCategories()` in [route.ts](app/api/chat/route.ts)
4. **Test thoroughly** — Verify the chatbot correctly uses new FAQs in responses
