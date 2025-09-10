// CastMatch Authentication & Authorization Service
// Enterprise-grade security with JWT, role-based access control, and session management

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Pool } = require('pg');

class AuthenticationService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';
        this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
        
        // In-memory session storage for demo (use Redis in production)
        this.sessions = new Map();
        this.refreshTokens = new Map();
        this.loginAttempts = new Map();
        
        // Database connection
        this.dbPool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        
        this.initializeDatabase();
        
        console.log('🔐 Authentication service initialized');
    }
    
    // Initialize user database tables
    async initializeDatabase() {
        try {
            await this.dbPool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    first_name VARCHAR(100),
                    last_name VARCHAR(100),
                    role VARCHAR(50) DEFAULT 'casting_director',
                    organization VARCHAR(255),
                    phone VARCHAR(20),
                    is_active BOOLEAN DEFAULT true,
                    email_verified BOOLEAN DEFAULT false,
                    last_login TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata JSONB DEFAULT '{}'
                )
            `);
            
            await this.dbPool.query(`
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    session_token VARCHAR(255) NOT NULL,
                    refresh_token VARCHAR(255),
                    ip_address INET,
                    user_agent TEXT,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            await this.dbPool.query(`
                CREATE TABLE IF NOT EXISTS login_attempts (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255),
                    ip_address INET,
                    success BOOLEAN,
                    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    user_agent TEXT
                )
            `);
            
            // Create default admin user if none exists
            await this.createDefaultUsers();
            
            console.log('✅ Authentication database initialized');
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
        }
    }
    
    // Create default users for demo
    async createDefaultUsers() {
        try {
            const existingAdmin = await this.dbPool.query(
                'SELECT id FROM users WHERE email = $1',
                ['admin@castmatch.ai']
            );
            
            if (existingAdmin.rows.length === 0) {
                const defaultUsers = [
                    {
                        email: 'admin@castmatch.ai',
                        password: 'CastMatch2025!',
                        firstName: 'Admin',
                        lastName: 'User',
                        role: 'admin',
                        organization: 'CastMatch'
                    },
                    {
                        email: 'director@castmatch.ai',
                        password: 'Director123!',
                        firstName: 'Casting',
                        lastName: 'Director',
                        role: 'casting_director',
                        organization: 'Mumbai Studios'
                    },
                    {
                        email: 'producer@castmatch.ai',
                        password: 'Producer123!',
                        firstName: 'Film',
                        lastName: 'Producer',
                        role: 'producer',
                        organization: 'OTT Productions'
                    }
                ];
                
                for (const user of defaultUsers) {
                    await this.registerUser(user);
                }
                
                console.log('✅ Default users created');
            }
        } catch (error) {
            console.error('❌ Default user creation failed:', error);
        }
    }
    
    // Register new user
    async registerUser(userData) {
        try {
            const { email, password, firstName, lastName, role = 'casting_director', organization, phone } = userData;
            
            // Check if user already exists
            const existingUser = await this.dbPool.query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );
            
            if (existingUser.rows.length > 0) {
                throw new Error('User already exists with this email');
            }
            
            // Validate password strength
            if (!this.isPasswordStrong(password)) {
                throw new Error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
            }
            
            // Hash password
            const passwordHash = await bcrypt.hash(password, 12);
            
            // Insert user
            const result = await this.dbPool.query(`
                INSERT INTO users (email, password_hash, first_name, last_name, role, organization, phone)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, email, first_name, last_name, role, organization, created_at
            `, [email, passwordHash, firstName, lastName, role, organization, phone]);
            
            const user = result.rows[0];
            
            console.log(`✅ User registered: ${email} (${role})`);
            
            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role,
                    organization: user.organization,
                    createdAt: user.created_at
                }
            };
        } catch (error) {
            console.error('❌ Registration failed:', error);
            throw error;
        }
    }
    
    // Authenticate user login
    async authenticateUser(email, password, ipAddress, userAgent) {
        try {
            // Check rate limiting
            if (this.isRateLimited(email, ipAddress)) {
                throw new Error('Too many failed attempts. Please try again later.');
            }
            
            // Get user from database
            const result = await this.dbPool.query(`
                SELECT id, email, password_hash, first_name, last_name, role, organization, is_active, email_verified
                FROM users WHERE email = $1
            `, [email]);
            
            if (result.rows.length === 0) {
                await this.recordLoginAttempt(email, ipAddress, false, userAgent);
                throw new Error('Invalid email or password');
            }
            
            const user = result.rows[0];
            
            if (!user.is_active) {
                throw new Error('Account is deactivated. Please contact support.');
            }
            
            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            
            if (!isValidPassword) {
                await this.recordLoginAttempt(email, ipAddress, false, userAgent);
                throw new Error('Invalid email or password');
            }
            
            // Generate tokens
            const sessionToken = this.generateSessionToken();
            const refreshToken = this.generateRefreshToken();
            
            const accessToken = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    sessionToken: sessionToken
                },
                this.jwtSecret,
                { expiresIn: this.jwtExpiresIn }
            );
            
            const refreshJWT = jwt.sign(
                {
                    userId: user.id,
                    sessionToken: sessionToken,
                    tokenType: 'refresh'
                },
                this.jwtRefreshSecret,
                { expiresIn: this.refreshExpiresIn }
            );
            
            // Store session in database
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            await this.dbPool.query(`
                INSERT INTO user_sessions (user_id, session_token, refresh_token, ip_address, user_agent, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [user.id, sessionToken, refreshToken, ipAddress, userAgent, expiresAt]);
            
            // Update last login
            await this.dbPool.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
                [user.id]
            );
            
            // Record successful login attempt
            await this.recordLoginAttempt(email, ipAddress, true, userAgent);
            
            // Clear failed attempts
            this.loginAttempts.delete(`${email}-${ipAddress}`);
            
            const userProfile = {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                organization: user.organization,
                emailVerified: user.email_verified
            };
            
            console.log(`✅ User authenticated: ${email} (${user.role})`);
            
            return {
                success: true,
                user: userProfile,
                tokens: {
                    accessToken: accessToken,
                    refreshToken: refreshJWT,
                    expiresIn: this.parseExpiresIn(this.jwtExpiresIn),
                    tokenType: 'Bearer'
                },
                session: {
                    sessionToken: sessionToken,
                    expiresAt: expiresAt
                }
            };
        } catch (error) {
            console.error('❌ Authentication failed:', error);
            throw error;
        }
    }
    
    // Verify JWT token
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            return { valid: true, payload: decoded };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
    
    // Refresh access token
    async refreshAccessToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret);
            
            if (decoded.tokenType !== 'refresh') {
                throw new Error('Invalid refresh token');
            }
            
            // Get user and session info
            const userResult = await this.dbPool.query(`
                SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.organization, u.is_active
                FROM users u
                JOIN user_sessions s ON u.id = s.user_id
                WHERE s.session_token = $1 AND s.expires_at > CURRENT_TIMESTAMP
            `, [decoded.sessionToken]);
            
            if (userResult.rows.length === 0) {
                throw new Error('Session expired or invalid');
            }
            
            const user = userResult.rows[0];
            
            if (!user.is_active) {
                throw new Error('Account is deactivated');
            }
            
            // Generate new access token
            const newAccessToken = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    sessionToken: decoded.sessionToken
                },
                this.jwtSecret,
                { expiresIn: this.jwtExpiresIn }
            );
            
            // Update session activity
            await this.dbPool.query(
                'UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_token = $1',
                [decoded.sessionToken]
            );
            
            return {
                success: true,
                accessToken: newAccessToken,
                expiresIn: this.parseExpiresIn(this.jwtExpiresIn),
                tokenType: 'Bearer'
            };
        } catch (error) {
            console.error('❌ Token refresh failed:', error);
            throw error;
        }
    }
    
    // Logout user
    async logoutUser(sessionToken) {
        try {
            // Remove session from database
            await this.dbPool.query(
                'DELETE FROM user_sessions WHERE session_token = $1',
                [sessionToken]
            );
            
            console.log(`✅ User logged out: ${sessionToken}`);
            
            return { success: true, message: 'Logged out successfully' };
        } catch (error) {
            console.error('❌ Logout failed:', error);
            throw error;
        }
    }
    
    // Get user profile
    async getUserProfile(userId) {
        try {
            const result = await this.dbPool.query(`
                SELECT id, email, first_name, last_name, role, organization, phone, 
                       is_active, email_verified, last_login, created_at, metadata
                FROM users WHERE id = $1
            `, [userId]);
            
            if (result.rows.length === 0) {
                throw new Error('User not found');
            }
            
            const user = result.rows[0];
            
            return {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                organization: user.organization,
                phone: user.phone,
                isActive: user.is_active,
                emailVerified: user.email_verified,
                lastLogin: user.last_login,
                createdAt: user.created_at,
                metadata: user.metadata
            };
        } catch (error) {
            console.error('❌ Profile retrieval failed:', error);
            throw error;
        }
    }
    
    // Authorization middleware
    authorize(requiredRoles = []) {
        return (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return res.status(401).json({ error: 'Access token required' });
                }
                
                const token = authHeader.substring(7);
                const verification = this.verifyToken(token);
                
                if (!verification.valid) {
                    return res.status(401).json({ error: 'Invalid or expired token' });
                }
                
                const { userId, email, role, sessionToken } = verification.payload;
                
                // Check role authorization
                if (requiredRoles.length > 0 && !requiredRoles.includes(role)) {
                    return res.status(403).json({ error: 'Insufficient permissions' });
                }
                
                // Add user info to request
                req.user = {
                    id: userId,
                    email: email,
                    role: role,
                    sessionToken: sessionToken
                };
                
                next();
            } catch (error) {
                console.error('Authorization error:', error);
                res.status(401).json({ error: 'Authorization failed' });
            }
        };
    }
    
    // Helper methods
    generateSessionToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    
    generateRefreshToken() {
        return crypto.randomBytes(64).toString('hex');
    }
    
    isPasswordStrong(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
    }
    
    isRateLimited(email, ipAddress) {
        const key = `${email}-${ipAddress}`;
        const attempts = this.loginAttempts.get(key) || { count: 0, lastAttempt: 0 };
        const now = Date.now();
        const timeWindow = 15 * 60 * 1000; // 15 minutes
        
        if (now - attempts.lastAttempt > timeWindow) {
            this.loginAttempts.delete(key);
            return false;
        }
        
        return attempts.count >= 5;
    }
    
    async recordLoginAttempt(email, ipAddress, success, userAgent) {
        try {
            await this.dbPool.query(`
                INSERT INTO login_attempts (email, ip_address, success, user_agent)
                VALUES ($1, $2, $3, $4)
            `, [email, ipAddress, success, userAgent]);
            
            if (!success) {
                const key = `${email}-${ipAddress}`;
                const attempts = this.loginAttempts.get(key) || { count: 0, lastAttempt: 0 };
                attempts.count += 1;
                attempts.lastAttempt = Date.now();
                this.loginAttempts.set(key, attempts);
            }
        } catch (error) {
            console.error('Failed to record login attempt:', error);
        }
    }
    
    parseExpiresIn(expiresIn) {
        const unit = expiresIn.slice(-1);
        const value = parseInt(expiresIn.slice(0, -1));
        
        switch (unit) {
            case 'm': return value * 60;
            case 'h': return value * 60 * 60;
            case 'd': return value * 24 * 60 * 60;
            default: return value;
        }
    }
    
    // Get service analytics
    getAnalytics() {
        return {
            totalUsers: 0,
            activeUsers: 0,
            loginAttempts: this.loginAttempts.size,
            activeSessions: 0,
            supportedRoles: [
                'admin',
                'casting_director',
                'producer',
                'talent_agent',
                'talent'
            ],
            securityFeatures: [
                'JWT Authentication',
                'Refresh Tokens',
                'Rate Limiting',
                'Password Strength Validation',
                'Role-based Authorization',
                'Session Management'
            ]
        };
    }
}

// Express.js server for Authentication Service
const app = express();
app.use(cors());
app.use(express.json());

const authService = new AuthenticationService();

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'CastMatch Authentication Service',
        version: '1.0.0',
        analytics: authService.getAnalytics(),
        timestamp: new Date().toISOString()
    });
});

// User registration
app.post('/api/auth/register', async (req, res) => {
    try {
        console.log('[Auth] User registration request');
        const result = await authService.registerUser(req.body);
        res.json(result);
    } catch (error) {
        console.error('[Auth] Registration error:', error);
        res.status(400).json({
            error: error.message || 'Registration failed'
        });
    }
});

// User login
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('[Auth] User login request');
        const { email, password } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const result = await authService.authenticateUser(email, password, ipAddress, userAgent);
        res.json(result);
    } catch (error) {
        console.error('[Auth] Login error:', error);
        res.status(401).json({
            error: error.message || 'Authentication failed'
        });
    }
});

// Token refresh
app.post('/api/auth/refresh', async (req, res) => {
    try {
        console.log('[Auth] Token refresh request');
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }
        
        const result = await authService.refreshAccessToken(refreshToken);
        res.json(result);
    } catch (error) {
        console.error('[Auth] Token refresh error:', error);
        res.status(401).json({
            error: error.message || 'Token refresh failed'
        });
    }
});

// User logout
app.post('/api/auth/logout', authService.authorize(), async (req, res) => {
    try {
        console.log('[Auth] User logout request');
        const result = await authService.logoutUser(req.user.sessionToken);
        res.json(result);
    } catch (error) {
        console.error('[Auth] Logout error:', error);
        res.status(500).json({
            error: error.message || 'Logout failed'
        });
    }
});

// Get user profile
app.get('/api/auth/profile', authService.authorize(), async (req, res) => {
    try {
        console.log('[Auth] Profile request for user:', req.user.id);
        const profile = await authService.getUserProfile(req.user.id);
        res.json({
            success: true,
            user: profile
        });
    } catch (error) {
        console.error('[Auth] Profile retrieval error:', error);
        res.status(500).json({
            error: error.message || 'Profile retrieval failed'
        });
    }
});

// Verify token endpoint
app.post('/api/auth/verify', (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }
        
        const verification = authService.verifyToken(token);
        
        if (verification.valid) {
            res.json({
                valid: true,
                user: {
                    id: verification.payload.userId,
                    email: verification.payload.email,
                    role: verification.payload.role
                }
            });
        } else {
            res.status(401).json({
                valid: false,
                error: verification.error
            });
        }
    } catch (error) {
        console.error('[Auth] Token verification error:', error);
        res.status(500).json({
            valid: false,
            error: 'Token verification failed'
        });
    }
});

// Demo endpoint with sample login
app.get('/api/auth/demo', (req, res) => {
    res.json({
        success: true,
        demo: true,
        message: 'CastMatch Authentication Service Demo',
        sampleUsers: [
            {
                email: 'admin@castmatch.ai',
                password: 'CastMatch2025!',
                role: 'admin',
                description: 'System administrator with full access'
            },
            {
                email: 'director@castmatch.ai',
                password: 'Director123!',
                role: 'casting_director',
                description: 'Casting director with project management access'
            },
            {
                email: 'producer@castmatch.ai',
                password: 'Producer123!',
                role: 'producer',
                description: 'Producer with talent search and analytics access'
            }
        ],
        endpoints: [
            'POST /api/auth/login - Authenticate user',
            'POST /api/auth/register - Register new user',
            'POST /api/auth/refresh - Refresh access token',
            'POST /api/auth/logout - Logout user',
            'GET /api/auth/profile - Get user profile',
            'POST /api/auth/verify - Verify token'
        ]
    });
});

const PORT = process.env.AUTH_SERVICE_PORT || 8004;

app.listen(PORT, () => {
    console.log(`🔐 CastMatch Authentication Service running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🎬 Demo: http://localhost:${PORT}/api/auth/demo`);
    console.log('✨ Enterprise authentication and authorization ready!');
});

module.exports = { AuthenticationService, app };