import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables for tests
process.env.ANTHROPIC_API_KEY = 'test_api_key';
process.env.HUBSPOT_ACCESS_TOKEN = 'test_hubspot_token';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
