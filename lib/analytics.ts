import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

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

const DB_PATH = path.join(process.cwd(), 'data', 'analytics.db');

// Initialize database and create table if needed
function getDatabase() {
  // Ensure data directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);

  // Create table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      user_message TEXT NOT NULL,
      detected_categories TEXT NOT NULL,
      faq_count INTEGER NOT NULL,
      response_time INTEGER,
      input_tokens INTEGER,
      output_tokens INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_timestamp ON analytics_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_created_at ON analytics_events(created_at);
  `);

  return db;
}

// Log an analytics event
export function logAnalyticsEvent(event: AnalyticsEvent) {
  try {
    const db = getDatabase();

    const stmt = db.prepare(`
      INSERT INTO analytics_events (
        timestamp, user_message, detected_categories, faq_count,
        response_time, input_tokens, output_tokens
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.timestamp,
      event.userMessage,
      JSON.stringify(event.detectedCategories),
      event.faqCount,
      event.responseTime || null,
      event.tokenUsage?.input || null,
      event.tokenUsage?.output || null
    );

    db.close();
  } catch (error) {
    // Fail silently - analytics shouldn't break the app
    console.error('Analytics logging error:', error);
  }
}

// Get analytics summary
export function getAnalyticsSummary() {
  try {
    const db = getDatabase();

    // Total queries
    const totalQueries = db.prepare('SELECT COUNT(*) as count FROM analytics_events').get() as { count: number };

    // Category usage
    const events = db.prepare('SELECT detected_categories FROM analytics_events').all() as { detected_categories: string }[];
    const categoryCount: { [key: string]: number } = {};
    events.forEach(event => {
      const categories = JSON.parse(event.detected_categories) as string[];
      categories.forEach(category => {
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
    });

    // Common queries (first 50 chars)
    const queries = db.prepare('SELECT user_message FROM analytics_events').all() as { user_message: string }[];
    const queryCount: { [key: string]: number } = {};
    queries.forEach(event => {
      const query = event.user_message.substring(0, 50).toLowerCase();
      queryCount[query] = (queryCount[query] || 0) + 1;
    });

    // Average response time
    const avgResponseTimeResult = db.prepare(`
      SELECT AVG(response_time) as avg FROM analytics_events WHERE response_time IS NOT NULL
    `).get() as { avg: number | null };
    const avgResponseTime = avgResponseTimeResult.avg ? Math.round(avgResponseTimeResult.avg) : 0;

    // Token usage
    const tokenStats = db.prepare(`
      SELECT
        COALESCE(SUM(input_tokens), 0) as total_input,
        COALESCE(SUM(output_tokens), 0) as total_output
      FROM analytics_events
    `).get() as { total_input: number; total_output: number };

    db.close();

    return {
      totalQueries: totalQueries.count,
      categoryUsage: Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)
        .map(([category, count]) => ({ category, count })),
      topQueries: Object.entries(queryCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([query, count]) => ({ query, count })),
      avgResponseTime,
      totalInputTokens: tokenStats.total_input,
      totalOutputTokens: tokenStats.total_output,
      estimatedCost: {
        input: (tokenStats.total_input / 1_000_000) * 0.25,
        output: (tokenStats.total_output / 1_000_000) * 1.25,
        total: ((tokenStats.total_input / 1_000_000) * 0.25) + ((tokenStats.total_output / 1_000_000) * 1.25),
      },
    };
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    return null;
  }
}
