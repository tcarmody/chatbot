// Neon Postgres database connection and schema initialization
import { neon } from '@neondatabase/serverless';
import { EMBEDDING_DIMENSIONS } from './embeddings';

// Create SQL query function from connection string
function getSQL() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(databaseUrl);
}

// Schema initialization - run once on first connection
let schemaInitialized = false;

export async function initializeSchema() {
  if (schemaInitialized) return;

  const sql = getSQL();

  try {
    // Analytics events table
    await sql`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        user_message TEXT NOT NULL,
        detected_categories TEXT NOT NULL,
        faq_count INTEGER NOT NULL,
        response_time INTEGER,
        input_tokens INTEGER,
        output_tokens INTEGER,
        cache_creation_tokens INTEGER DEFAULT 0,
        cache_read_tokens INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Add cache token columns if they don't exist (for existing databases)
    await sql`
      ALTER TABLE analytics_events
      ADD COLUMN IF NOT EXISTS cache_creation_tokens INTEGER DEFAULT 0
    `;
    await sql`
      ALTER TABLE analytics_events
      ADD COLUMN IF NOT EXISTS cache_read_tokens INTEGER DEFAULT 0
    `;

    // Create indexes for analytics
    await sql`CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at)`;

    // Admin users table
    await sql`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'support',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMPTZ
      )
    `;

    // Create indexes for admin users
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_email ON admin_users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_active ON admin_users(is_active)`;

    // Admin sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES admin_users(id),
        session_token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for sessions
    await sql`CREATE INDEX IF NOT EXISTS idx_session_token ON admin_sessions(session_token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_session_expires ON admin_sessions(expires_at)`;

    // Password reset tokens table
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES admin_users(id),
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Audit logs table
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_email TEXT NOT NULL,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for audit logs
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)`;

    // Ticket attachments table (metadata only - files stored in blob storage)
    await sql`
      CREATE TABLE IF NOT EXISTS ticket_attachments (
        id SERIAL PRIMARY KEY,
        ticket_number TEXT NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        storage_url TEXT,
        uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create index for attachments
    await sql`CREATE INDEX IF NOT EXISTS idx_attachments_ticket ON ticket_attachments(ticket_number)`;

    // Ticket comments table
    await sql`
      CREATE TABLE IF NOT EXISTS ticket_comments (
        id SERIAL PRIMARY KEY,
        ticket_number TEXT NOT NULL,
        author_name TEXT,
        author_email TEXT,
        comment_text TEXT NOT NULL,
        is_internal BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for comments
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_ticket ON ticket_comments(ticket_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_created ON ticket_comments(created_at)`;

    // Response feedback table
    await sql`
      CREATE TABLE IF NOT EXISTS response_feedback (
        id SERIAL PRIMARY KEY,
        message_id TEXT UNIQUE NOT NULL,
        user_message TEXT NOT NULL,
        assistant_response TEXT NOT NULL,
        feedback TEXT NOT NULL CHECK (feedback IN ('positive', 'negative')),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create index for feedback
    await sql`CREATE INDEX IF NOT EXISTS idx_feedback_created ON response_feedback(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_feedback_type ON response_feedback(feedback)`;

    // FAQ gaps table - tracks queries outside knowledge base
    // Gap types:
    //   - no_match: Relevant question but FAQ doesn't have the answer (actionable)
    //   - partial_match: FAQ has some info but incomplete (actionable)
    //   - off_topic: Completely unrelated questions like math, trivia (not actionable)
    //   - out_of_scope: Related to learning but not our platform, e.g. competitor questions (not actionable)
    await sql`
      CREATE TABLE IF NOT EXISTS faq_gaps (
        id SERIAL PRIMARY KEY,
        user_message TEXT NOT NULL,
        detected_categories TEXT NOT NULL,
        gap_type TEXT NOT NULL CHECK (gap_type IN ('no_match', 'partial_match', 'off_topic', 'out_of_scope')),
        suggested_topic TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for FAQ gaps
    await sql`CREATE INDEX IF NOT EXISTS idx_faq_gaps_created ON faq_gaps(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_faq_gaps_type ON faq_gaps(gap_type)`;

    // Enable pgvector extension for semantic search
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;

    // FAQ embeddings table for semantic search
    await sql`
      CREATE TABLE IF NOT EXISTS faq_embeddings (
        id SERIAL PRIMARY KEY,
        faq_id INTEGER UNIQUE NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category TEXT NOT NULL,
        embedding vector(${EMBEDDING_DIMENSIONS}),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create HNSW index for fast similarity search (better than IVFFlat for query performance)
    await sql`
      CREATE INDEX IF NOT EXISTS idx_faq_embeddings_hnsw
      ON faq_embeddings
      USING hnsw (embedding vector_cosine_ops)
    `;

    // Migration: Update constraint to include 'off_topic' type
    // Drop old constraint and add new one (PostgreSQL doesn't have ALTER CONSTRAINT)
    await sql`
      DO $$
      BEGIN
        -- Drop old constraint if it exists
        ALTER TABLE faq_gaps DROP CONSTRAINT IF EXISTS faq_gaps_gap_type_check;
        -- Add new constraint with off_topic
        ALTER TABLE faq_gaps ADD CONSTRAINT faq_gaps_gap_type_check
          CHECK (gap_type IN ('no_match', 'partial_match', 'off_topic', 'out_of_scope'));
      EXCEPTION
        WHEN others THEN NULL;
      END $$;
    `;

    schemaInitialized = true;
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  }
}

// Health check for database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const sql = getSQL();
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// Export a function to get SQL for use in other modules
export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  return getSQL()(strings, ...values);
}
