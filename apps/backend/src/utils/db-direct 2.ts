// Direct database connection bypassing Prisma P1010 issue
import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'castmatch_db',
  password: 'castmatch123',
  port: 5432,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

// Example usage for auth
export const dbDirect = {
  async findUserByEmail(email: string) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },
  
  async createUser(data: any) {
    const result = await query(
      'INSERT INTO users (id, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [data.id, data.email, data.password, data.role]
    );
    return result.rows[0];
  },
  
  async getUserCount() {
    const result = await query('SELECT COUNT(*) FROM users');
    return parseInt(result.rows[0].count);
  }
};

export default pool;