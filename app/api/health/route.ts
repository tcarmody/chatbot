import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: 'ok' | 'error' | 'unconfigured';
    anthropic: 'ok' | 'missing';
    hubspot: 'ok' | 'missing';
  };
  version: string;
}

const startTime = Date.now();

export async function GET() {
  const checks: HealthStatus['checks'] = {
    database: 'ok',
    anthropic: process.env.ANTHROPIC_API_KEY ? 'ok' : 'missing',
    hubspot: process.env.HUBSPOT_ACCESS_TOKEN ? 'ok' : 'missing',
  };

  // Check database connectivity (Vercel Postgres)
  try {
    // Only check if database URL is configured
    if (process.env.POSTGRES_URL) {
      const isConnected = await checkDatabaseConnection();
      checks.database = isConnected ? 'ok' : 'error';
    } else {
      checks.database = 'unconfigured';
    }
  } catch {
    checks.database = 'error';
  }

  // Determine overall status
  let status: HealthStatus['status'] = 'healthy';
  if (checks.database === 'error' || checks.anthropic === 'missing') {
    status = 'unhealthy';
  } else if (checks.hubspot === 'missing' || checks.database === 'unconfigured') {
    status = 'degraded';
  }

  const response: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
    version: process.env.npm_package_version || '0.1.0',
  };

  return NextResponse.json(response, {
    status: status === 'unhealthy' ? 503 : 200,
  });
}
