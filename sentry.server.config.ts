import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production, or if DSN is explicitly set
  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Performance monitoring sample rate
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Capture 100% of errors
  sampleRate: 1.0,

  // Don't send PII
  sendDefaultPii: false,

  // Environment tag
  environment: process.env.NODE_ENV,

  beforeSend(event) {
    // Don't send events in development unless DSN is set
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DSN) {
      return null;
    }
    return event;
  },
});
