// Analytics tracking using Neon Postgres
import { sql, initializeSchema } from './db';

export interface AnalyticsEvent {
  timestamp: string;
  userMessage: string;
  detectedCategories: string[];
  faqCount: number;
  responseTime?: number;
  tokenUsage?: {
    input: number;
    output: number;
  };
}

// Log an analytics event
export async function logAnalyticsEvent(event: AnalyticsEvent) {
  try {
    await initializeSchema();

    await sql`
      INSERT INTO analytics_events (
        timestamp, user_message, detected_categories, faq_count,
        response_time, input_tokens, output_tokens
      ) VALUES (
        ${event.timestamp},
        ${event.userMessage},
        ${JSON.stringify(event.detectedCategories)},
        ${event.faqCount},
        ${event.responseTime || null},
        ${event.tokenUsage?.input || null},
        ${event.tokenUsage?.output || null}
      )
    `;
  } catch (error) {
    // Fail silently - analytics shouldn't break the app
    console.error('Analytics logging error:', error);
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

    // Common queries (first 50 chars)
    const queriesResult = await sql`SELECT user_message FROM analytics_events`;
    const queryCount: { [key: string]: number } = {};
    (queriesResult as { user_message: string }[]).forEach(event => {
      const query = event.user_message.substring(0, 50).toLowerCase();
      queryCount[query] = (queryCount[query] || 0) + 1;
    });

    // Average response time
    const avgResponseTimeResult = await sql`
      SELECT AVG(response_time) as avg FROM analytics_events WHERE response_time IS NOT NULL
    `;
    const avgResponseTime = (avgResponseTimeResult[0] as { avg: string })?.avg
      ? Math.round(Number((avgResponseTimeResult[0] as { avg: string }).avg))
      : 0;

    // Token usage
    const tokenStatsResult = await sql`
      SELECT
        COALESCE(SUM(input_tokens), 0) as total_input,
        COALESCE(SUM(output_tokens), 0) as total_output
      FROM analytics_events
    `;
    const tokenRow = tokenStatsResult[0] as { total_input: string; total_output: string };
    const totalInputTokens = Number(tokenRow?.total_input || 0);
    const totalOutputTokens = Number(tokenRow?.total_output || 0);

    return {
      totalQueries,
      categoryUsage: Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)
        .map(([category, count]) => ({ category, count })),
      topQueries: Object.entries(queryCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([query, count]) => ({ query, count })),
      avgResponseTime,
      totalInputTokens,
      totalOutputTokens,
      estimatedCost: {
        input: (totalInputTokens / 1_000_000) * 0.25,
        output: (totalOutputTokens / 1_000_000) * 1.25,
        total: ((totalInputTokens / 1_000_000) * 0.25) + ((totalOutputTokens / 1_000_000) * 1.25),
      },
    };
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    return null;
  }
}
