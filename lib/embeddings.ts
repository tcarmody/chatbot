// Embedding generation using Google's Gemini Embedding API
// Model: gemini-embedding-001 (3072 dimensions, top-ranked on MTEB benchmark)

import { GoogleGenerativeAI } from '@google/generative-ai';

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = 3072;

let googleClient: GoogleGenerativeAI | null = null;

function getGoogleClient(): GoogleGenerativeAI {
  if (!googleClient) {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error(
        'GOOGLE_API_KEY is required for embeddings - get your key from https://aistudio.google.com/'
      );
    }
    googleClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }
  return googleClient;
}

// Generate embedding for a single text
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getGoogleClient();
  const model = client.getGenerativeModel({ model: EMBEDDING_MODEL });

  const result = await model.embedContent(text);
  return result.embedding.values;
}

// Generate embeddings for multiple texts (batch)
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const client = getGoogleClient();
  const model = client.getGenerativeModel({ model: EMBEDDING_MODEL });

  const embeddings: number[][] = [];

  // Process in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (text) => {
        const result = await model.embedContent(text);
        return result.embedding.values;
      })
    );
    embeddings.push(...batchResults);
  }

  return embeddings;
}

// Export constants for use in database schema
export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
