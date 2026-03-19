import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  // Gracefully handle missing db url for now by creating a mock or logging a warning, 
  // but let's throw since we need it for this feature.
  console.warn("DATABASE_URL is not set. Database features will not work.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
