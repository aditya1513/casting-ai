// Direct database connection bypassing Prisma P1010 issue
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'castmatch_db',
  password: 'castmatch123',
  port: 5432,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

// Database operations for CastMatch platform
export const dbDirect = {
  // Auth operations
  async findUserByEmail(email: string) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },
  
  async findUserById(id: string) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },
  
  async createUser(data: any) {
    const result = await query(
      'INSERT INTO users (id, email, password, role, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
      [data.id, data.email, data.password, data.role]
    );
    return result.rows[0];
  },
  
  async updateUser(id: string, data: any) {
    const fields = Object.keys(data).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(data)];
    const result = await query(
      `UPDATE users SET ${fields}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  },

  // Profile operations
  async getUserProfile(userId: string) {
    const result = await query(`
      SELECT 
        u.id, u.email, u.role, u.is_verified, u.created_at, u.updated_at,
        up.display_name, up.first_name, up.last_name, up.phone_number, up.date_of_birth,
        up.gender, up.location, up.bio, up.profile_image_url, up.is_profile_complete,
        up.preferred_language, up.timezone, up.privacy_settings
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1
    `, [userId]);
    return result.rows[0];
  },

  async updateUserProfile(userId: string, profileData: any) {
    // Check if profile exists
    const existingProfile = await query('SELECT id FROM user_profiles WHERE user_id = $1', [userId]);
    
    if (existingProfile.rows[0]) {
      // Update existing profile
      const fields = Object.keys(profileData).map((key, index) => `${key} = $${index + 2}`).join(', ');
      const values = [userId, ...Object.values(profileData)];
      const result = await query(
        `UPDATE user_profiles SET ${fields}, updated_at = NOW() WHERE user_id = $1 RETURNING *`,
        values
      );
      return result.rows[0];
    } else {
      // Create new profile
      const fields = ['user_id', ...Object.keys(profileData)].join(', ');
      const placeholders = Array.from({length: Object.keys(profileData).length + 1}, (_, i) => `$${i + 1}`).join(', ');
      const values = [userId, ...Object.values(profileData)];
      const result = await query(
        `INSERT INTO user_profiles (${fields}, created_at, updated_at) VALUES (${placeholders}, NOW(), NOW()) RETURNING *`,
        values
      );
      return result.rows[0];
    }
  },

  // Social account operations
  async getSocialAccounts(userId: string) {
    const result = await query(
      'SELECT id, provider, provider_account_id, provider_display_name, is_primary, created_at FROM social_accounts WHERE user_id = $1',
      [userId]
    );
    return result.rows;
  },

  async createSocialAccount(data: any) {
    const result = await query(`
      INSERT INTO social_accounts (id, user_id, provider, provider_account_id, provider_display_name, access_token, refresh_token, expires_at, is_primary, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING *
    `, [data.id, data.user_id, data.provider, data.provider_account_id, data.provider_display_name, data.access_token, data.refresh_token, data.expires_at, data.is_primary]);
    return result.rows[0];
  },

  async findSocialAccount(provider: string, providerAccountId: string) {
    const result = await query(
      'SELECT * FROM social_accounts WHERE provider = $1 AND provider_account_id = $2',
      [provider, providerAccountId]
    );
    return result.rows[0];
  },

  async linkSocialAccount(userId: string, socialData: any) {
    const result = await query(`
      INSERT INTO social_accounts (id, user_id, provider, provider_account_id, provider_display_name, access_token, refresh_token, expires_at, is_primary, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING *
    `, [socialData.id, userId, socialData.provider, socialData.provider_account_id, socialData.provider_display_name, socialData.access_token, socialData.refresh_token, socialData.expires_at, socialData.is_primary || false]);
    return result.rows[0];
  },

  async unlinkSocialAccount(userId: string, provider: string) {
    const result = await query(
      'DELETE FROM social_accounts WHERE user_id = $1 AND provider = $2 RETURNING *',
      [userId, provider]
    );
    return result.rows[0];
  },

  // Password reset operations
  async createPasswordResetToken(userId: string, token: string, expiresAt: Date) {
    await query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1',
      [userId]
    );
    
    const result = await query(
      'INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [uuidv4(), userId, token, expiresAt]
    );
    return result.rows[0];
  },

  async findPasswordResetToken(token: string) {
    const result = await query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL',
      [token]
    );
    return result.rows[0];
  },

  async markPasswordResetTokenUsed(token: string) {
    const result = await query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1 RETURNING *',
      [token]
    );
    return result.rows[0];
  },

  // User session operations
  async createUserSession(data: any) {
    const result = await query(
      'INSERT INTO user_sessions (id, user_id, refresh_token, expires_at, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
      [data.id, data.user_id, data.refresh_token, data.expires_at]
    );
    return result.rows[0];
  },

  async findUserSession(sessionId: string) {
    const result = await query('SELECT * FROM user_sessions WHERE id = $1', [sessionId]);
    return result.rows[0];
  },

  async deleteUserSession(sessionId: string) {
    const result = await query('DELETE FROM user_sessions WHERE id = $1 RETURNING *', [sessionId]);
    return result.rows[0];
  },
  
  async getUserCount() {
    const result = await query('SELECT COUNT(*) FROM users');
    return parseInt(result.rows[0].count);
  }
};

export default pool;