// Environment variable validation
// This module validates required environment variables at build/startup time

interface EnvConfig {
  // AI Model configuration
  AI_MODEL: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GOOGLE_API_KEY?: string;

  // Optional with defaults
  NEXT_PUBLIC_APP_URL: string;
  HUBSPOT_ACCESS_TOKEN?: string;
  HUBSPOT_PIPELINE_ID?: string;
  HUBSPOT_STAGE_OPEN: string;
  HUBSPOT_STAGE_IN_PROGRESS: string;
  HUBSPOT_STAGE_RESOLVED: string;
  HUBSPOT_STAGE_CLOSED: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // AI Model configuration
  const aiModel = process.env.AI_MODEL || 'anthropic:claude-haiku-4-5';
  const [provider] = aiModel.split(':');

  // Validate API key based on selected provider
  if (provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
    errors.push('ANTHROPIC_API_KEY is required for Anthropic models - get your key from https://console.anthropic.com/');
  }
  if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
    errors.push('OPENAI_API_KEY is required for OpenAI models - get your key from https://platform.openai.com/');
  }
  if (provider === 'google' && !process.env.GOOGLE_API_KEY) {
    errors.push('GOOGLE_API_KEY is required for Google Gemini models - get your key from https://aistudio.google.com/');
  }

  // Optional but recommended
  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    warnings.push('HUBSPOT_ACCESS_TOKEN is not set - ticket creation will fail');
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    warnings.push('NEXT_PUBLIC_APP_URL is not set - defaulting to http://localhost:3000');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getValidatedEnv(): EnvConfig {
  const result = validateEnv();

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Environment warnings:');
    result.warnings.forEach(w => console.warn(`   - ${w}`));
  }

  // Throw on errors
  if (!result.valid) {
    console.error('\n❌ Environment validation failed:');
    result.errors.forEach(e => console.error(`   - ${e}`));
    console.error('\nSee .env.local.example for required configuration.\n');
    throw new Error(`Missing required environment variables: ${result.errors.join(', ')}`);
  }

  return {
    AI_MODEL: process.env.AI_MODEL || 'anthropic:claude-haiku-4-5',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    HUBSPOT_ACCESS_TOKEN: process.env.HUBSPOT_ACCESS_TOKEN,
    HUBSPOT_PIPELINE_ID: process.env.HUBSPOT_PIPELINE_ID,
    HUBSPOT_STAGE_OPEN: process.env.HUBSPOT_STAGE_OPEN || '1',
    HUBSPOT_STAGE_IN_PROGRESS: process.env.HUBSPOT_STAGE_IN_PROGRESS || '2',
    HUBSPOT_STAGE_RESOLVED: process.env.HUBSPOT_STAGE_RESOLVED || '3',
    HUBSPOT_STAGE_CLOSED: process.env.HUBSPOT_STAGE_CLOSED || '4',
  };
}

// Cached config for repeated access
let cachedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (!cachedEnv) {
    cachedEnv = getValidatedEnv();
  }
  return cachedEnv;
}

