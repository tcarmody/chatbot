// Next.js instrumentation file - runs once when the server starts
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize Sentry for server
    await import('./sentry.server.config');

    // Validate environment variables
    const { getValidatedEnv } = await import('@/lib/env');

    try {
      getValidatedEnv();
      console.log('✅ Environment validation passed');
    } catch (error) {
      console.error('❌ Server startup failed due to environment configuration');
      // In production, we want the server to fail to start
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
      throw error;
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Initialize Sentry for edge runtime
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
