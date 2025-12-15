// Analytics tracking using Neon Postgres
import { sql, initializeSchema } from './db';

// Query cluster definitions - keywords that indicate a topic
const QUERY_CLUSTERS: { name: string; keywords: string[] }[] = [
  { name: 'Password & Login Issues', keywords: ['password', 'reset', 'login', 'sign in', 'forgot', 'locked out', 'can\'t access', 'authentication'] },
  { name: 'Enrollment & Registration', keywords: ['enroll', 'register', 'sign up', 'join', 'start', 'begin', 'how do i take', 'how to take'] },
  { name: 'Course Recommendations', keywords: ['recommend', 'suggest', 'which course', 'what course', 'best course', 'should i take', 'beginner', 'start with'] },
  { name: 'LLM & GenAI Courses', keywords: ['llm', 'large language', 'genai', 'generative ai', 'chatgpt', 'gpt', 'langchain', 'prompt'] },
  { name: 'Machine Learning Courses', keywords: ['machine learning', 'ml ', 'deep learning', 'neural network', 'tensorflow', 'pytorch'] },
  { name: 'RAG & Agents', keywords: ['rag', 'retrieval', 'agent', 'agents', 'agentic', 'vector', 'embedding'] },
  { name: 'Certificates & Completion', keywords: ['certificate', 'completion', 'credential', 'download', 'pdf', 'accomplishment', 'finished'] },
  { name: 'Refunds & Billing', keywords: ['refund', 'money back', 'charge', 'billing', 'payment', 'price', 'cost', 'invoice', 'receipt'] },
  { name: 'Subscription & Membership', keywords: ['subscription', 'cancel', 'pro', 'membership', 'free', 'trial', 'upgrade', 'downgrade', 'monthly', 'annual'] },
  { name: 'Technical Issues', keywords: ['error', 'bug', 'broken', 'not working', 'locked', 'quiz', 'assignment', 'notebook', 'won\'t load', 'stuck'] },
  { name: 'Course Duration & Time', keywords: ['how long', 'duration', 'time', 'hours', 'weeks', 'commitment', 'finish', 'complete'] },
  { name: 'Prerequisites & Requirements', keywords: ['prerequisite', 'requirement', 'need to know', 'background', 'experience', 'before'] },
  { name: 'Partners & Instructors', keywords: ['instructor', 'teacher', 'taught by', 'partner', 'openai', 'google', 'meta', 'aws', 'microsoft', 'andrew ng'] },
  { name: 'Contact & Support', keywords: ['contact', 'support', 'help', 'talk to', 'human', 'email', 'phone', 'ticket'] },
];

// Classify a query into clusters
function classifyQuery(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const matches: string[] = [];

  for (const cluster of QUERY_CLUSTERS) {
    if (cluster.keywords.some(keyword => lowerQuery.includes(keyword))) {
      matches.push(cluster.name);
    }
  }

  return matches.length > 0 ? matches : ['Other Questions'];
}

export interface AnalyticsEvent {
  timestamp: string;
  userMessage: string;
  detectedCategories: string[];
  faqCount: number;
  responseTime?: number;
  tokenUsage?: {
    input: number;
    output: number;
    cacheCreation?: number;
    cacheRead?: number;
  };
}

// Log an analytics event
export async function logAnalyticsEvent(event: AnalyticsEvent) {
  try {
    await initializeSchema();

    await sql`
      INSERT INTO analytics_events (
        timestamp, user_message, detected_categories, faq_count,
        response_time, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens
      ) VALUES (
        ${event.timestamp},
        ${event.userMessage},
        ${JSON.stringify(event.detectedCategories)},
        ${event.faqCount},
        ${event.responseTime || null},
        ${event.tokenUsage?.input || null},
        ${event.tokenUsage?.output || null},
        ${event.tokenUsage?.cacheCreation || 0},
        ${event.tokenUsage?.cacheRead || 0}
      )
    `;
  } catch (error) {
    // Fail silently - analytics shouldn't break the app
    console.error('Analytics logging error:', error);
  }
}

// Get questions for a specific cluster
export async function getQuestionsForCluster(clusterName: string) {
  try {
    await initializeSchema();

    const queriesResult = await sql`SELECT user_message, timestamp FROM analytics_events ORDER BY timestamp DESC`;
    const questions: { message: string; timestamp: string }[] = [];

    (queriesResult as { user_message: string; timestamp: string }[]).forEach(event => {
      const clusters = classifyQuery(event.user_message);
      if (clusters.includes(clusterName)) {
        questions.push({
          message: event.user_message,
          timestamp: event.timestamp,
        });
      }
    });

    return questions;
  } catch (error) {
    console.error('Error getting questions for cluster:', error);
    return [];
  }
}

// Get questions for a specific category
export async function getQuestionsForCategory(categoryName: string) {
  try {
    await initializeSchema();

    const queriesResult = await sql`
      SELECT user_message, timestamp, detected_categories
      FROM analytics_events
      ORDER BY timestamp DESC
    `;
    const questions: { message: string; timestamp: string }[] = [];

    (queriesResult as { user_message: string; timestamp: string; detected_categories: string }[]).forEach(event => {
      const categories = JSON.parse(event.detected_categories) as string[];
      if (categories.includes(categoryName)) {
        questions.push({
          message: event.user_message,
          timestamp: event.timestamp,
        });
      }
    });

    return questions;
  } catch (error) {
    console.error('Error getting questions for category:', error);
    return [];
  }
}

// Get analytics summary
export async function getAnalyticsSummary() {
  try {
    await initializeSchema();

    // Total queries
    const totalResult = await sql`SELECT COUNT(*) as count FROM analytics_events`;
    const totalQueries = Number((totalResult[0] as { count: string })?.count || 0);

    // Category usage
    const eventsResult = await sql`SELECT detected_categories FROM analytics_events`;
    const categoryCount: { [key: string]: number } = {};
    (eventsResult as { detected_categories: string }[]).forEach(event => {
      const categories = JSON.parse(event.detected_categories) as string[];
      categories.forEach(category => {
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
    });

    // Query clusters - group similar questions together
    const queriesResult = await sql`SELECT user_message FROM analytics_events`;
    const clusterCount: { [key: string]: number } = {};
    (queriesResult as { user_message: string }[]).forEach(event => {
      const clusters = classifyQuery(event.user_message);
      clusters.forEach(cluster => {
        clusterCount[cluster] = (clusterCount[cluster] || 0) + 1;
      });
    });

    // Average response time
    const avgResponseTimeResult = await sql`
      SELECT AVG(response_time) as avg FROM analytics_events WHERE response_time IS NOT NULL
    `;
    const avgResponseTime = (avgResponseTimeResult[0] as { avg: string })?.avg
      ? Math.round(Number((avgResponseTimeResult[0] as { avg: string }).avg))
      : 0;

    // Token usage including cache tokens
    const tokenStatsResult = await sql`
      SELECT
        COALESCE(SUM(input_tokens), 0) as total_input,
        COALESCE(SUM(output_tokens), 0) as total_output,
        COALESCE(SUM(cache_creation_tokens), 0) as total_cache_creation,
        COALESCE(SUM(cache_read_tokens), 0) as total_cache_read
      FROM analytics_events
    `;
    const tokenRow = tokenStatsResult[0] as {
      total_input: string;
      total_output: string;
      total_cache_creation: string;
      total_cache_read: string;
    };
    const totalInputTokens = Number(tokenRow?.total_input || 0);
    const totalOutputTokens = Number(tokenRow?.total_output || 0);
    const totalCacheCreationTokens = Number(tokenRow?.total_cache_creation || 0);
    const totalCacheReadTokens = Number(tokenRow?.total_cache_read || 0);

    // Claude Haiku 4.5 pricing (per million tokens):
    // - Regular input: $0.25/M
    // - Cache write (creation): $0.30/M (20% more than regular)
    // - Cache read: $0.025/M (90% discount)
    // - Output: $1.25/M
    const regularInputTokens = totalInputTokens - totalCacheCreationTokens - totalCacheReadTokens;
    const inputCost = (Math.max(0, regularInputTokens) / 1_000_000) * 0.25;
    const cacheCreationCost = (totalCacheCreationTokens / 1_000_000) * 0.30;
    const cacheReadCost = (totalCacheReadTokens / 1_000_000) * 0.025;
    const outputCost = (totalOutputTokens / 1_000_000) * 1.25;

    // Calculate savings from cache reads (what it would have cost vs what it did cost)
    const cacheSavings = (totalCacheReadTokens / 1_000_000) * (0.25 - 0.025);

    return {
      totalQueries,
      categoryUsage: Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)
        .map(([category, count]) => ({ category, count })),
      queryClusters: Object.entries(clusterCount)
        .sort(([, a], [, b]) => b - a)
        .map(([cluster, count]) => ({ cluster, count })),
      avgResponseTime,
      totalInputTokens,
      totalOutputTokens,
      totalCacheCreationTokens,
      totalCacheReadTokens,
      estimatedCost: {
        input: inputCost,
        cacheCreation: cacheCreationCost,
        cacheRead: cacheReadCost,
        output: outputCost,
        total: inputCost + cacheCreationCost + cacheReadCost + outputCost,
        savings: cacheSavings,
      },
    };
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    return null;
  }
}
