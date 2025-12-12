import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production, or if DSN is explicitly set
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring sample rate (0.0 to 1.0)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Capture 100% of errors
  sampleRate: 1.0,

  // Don't send PII
  sendDefaultPii: false,

  // Environment tag
  environment: process.env.NODE_ENV,

  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    // Network errors that are expected
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    // User aborted requests
    'AbortError',
  ],

  beforeSend(event) {
    // Don't send events in development unless DSN is set
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return null;
    }
    return event;
  },
});
