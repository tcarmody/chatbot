import fs from 'fs';
import path from 'path';

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

const ANALYTICS_FILE = path.join(process.cwd(), 'data', 'analytics.json');

// Ensure analytics file exists
function ensureAnalyticsFile() {
  const dir = path.dirname(ANALYTICS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(ANALYTICS_FILE)) {
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify({ events: [] }, null, 2));
  }
}

// Log an analytics event
export function logAnalyticsEvent(event: AnalyticsEvent) {
  try {
    ensureAnalyticsFile();

    const data = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf-8'));
    data.events.push(event);

    // Keep only last 1000 events to prevent file from growing too large
    if (data.events.length > 1000) {
      data.events = data.events.slice(-1000);
    }

    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    // Fail silently - analytics shouldn't break the app
    console.error('Analytics logging error:', error);
  }
}

// Get analytics summary
export function getAnalyticsSummary() {
  try {
    ensureAnalyticsFile();

    const data = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf-8'));
    const events = data.events as AnalyticsEvent[];

    // Category usage
    const categoryCount: { [key: string]: number } = {};
    events.forEach(event => {
      event.detectedCategories.forEach(category => {
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
    });

    // Common queries (simplified by first 50 chars)
    const queryCount: { [key: string]: number } = {};
    events.forEach(event => {
      const query = event.userMessage.substring(0, 50).toLowerCase();
      queryCount[query] = (queryCount[query] || 0) + 1;
    });

    // Average response time
    const responseTimes = events
      .filter(e => e.responseTime)
      .map(e => e.responseTime!);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // Token usage
    const totalInputTokens = events
      .filter(e => e.tokenUsage)
      .reduce((sum, e) => sum + (e.tokenUsage?.input || 0), 0);
    const totalOutputTokens = events
      .filter(e => e.tokenUsage)
      .reduce((sum, e) => sum + (e.tokenUsage?.output || 0), 0);

    return {
      totalQueries: events.length,
      categoryUsage: Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)
        .map(([category, count]) => ({ category, count })),
      topQueries: Object.entries(queryCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([query, count]) => ({ query, count })),
      avgResponseTime: Math.round(avgResponseTime),
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
