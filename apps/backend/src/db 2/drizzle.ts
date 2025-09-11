import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../models/schema.business';

// Create the connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://castmatch_user:castmatch_pass123@localhost:5432/castmatch_db',
});

// Create the drizzle instance
export const db = drizzle(pool, { schema });

export default db;