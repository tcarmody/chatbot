// Next.js instrumentation file - runs once when the server starts
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamically import to ensure server-only execution
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
}
