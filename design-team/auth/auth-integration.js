// Auth API Integration for CastMatch
const API_BASE_URL = 'http://localhost:5000/api';

// Mock users for demo (when backend is not available)
const MOCK_USERS = [
    {
        id: '1',
        email: 'director@castmatch.com',
        password: 'Director123!',
        firstName: 'Raj',
        lastName: 'Mehta',
        role: 'casting_director',
        company: 'Dharma Productions',
        isEmailVerified: true
    },
    {
        id: '2', 
        email: 'test@castmatch.com',
        password: 'Test@123456',
        firstName: 'Test',
        lastName: 'Director',
        role: 'casting_director',
        company: 'Test Productions',
        isEmailVerified: true
    }
];

// Token Management
const tokenManager = {
    setToken: (token) => {
        localStorage.setItem('authToken', token);
    },
    
    getToken: () => {
        return localStorage.getItem('authToken');
    },
    
    clearToken: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
    },
    
    setUserData: (userData) => {
        localStorage.setItem('userData', JSON.stringify(userData));
    },
    
    getUserData: () => {
        const data = localStorage.getItem('userData');
        return data ? JSON.parse(data) : null;
    }
};

// Generate mock JWT token
function generateMockToken(user) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ 
        id: user.id, 
        email: user.email, 
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    }));
    const signature = btoa('mock-signature');
    return `${header}.${payload}.${signature}`;
}

// Check if backend is available
async function checkBackendAvailable() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

// API Functions
const authAPI = {
    // Check backend status
    backendAvailable: false,
    
    // Initialize backend check
    init: async function() {
        this.backendAvailable = await checkBackendAvailable();
        console.log('Backend available:', this.backendAvailable);
        return this.backendAvailable;
    },

    // Login
    login: async (email, password) => {
        // Try real backend first
        if (authAPI.backendAvailable) {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    tokenManager.setToken(data.data.accessToken);
                    tokenManager.setUserData(data.data.user);
                    return { success: true, data: data.data };
                } else {
                    return { success: false, error: data.message || 'Invalid credentials' };
                }
            } catch (error) {
                console.error('Backend login failed, falling back to mock');
                authAPI.backendAvailable = false;
            }
        }
        
        // Fallback to mock authentication
        const user = MOCK_USERS.find(u => u.email === email && u.password === password);
        
        if (user) {
            const token = generateMockToken(user);
            const userData = { ...user };
            delete userData.password;
            
            tokenManager.setToken(token);
            tokenManager.setUserData(userData);
            
            return {
                success: true,
                data: { user: userData, accessToken: token },
                mode: 'mock'
            };
        } else {
            return {
                success: false,
                error: 'Invalid credentials. Try: test@castmatch.com / Test@123456'
            };
        }
    },

    // Register/Signup
    register: async (userData) => {
        // Try real backend first
        if (authAPI.backendAvailable) {
            try {
                const registerData = {
                    email: userData.email,
                    password: userData.password,
                    firstName: userData.fullName?.split(' ')[0] || userData.firstName,
                    lastName: userData.fullName?.split(' ').slice(1).join(' ') || userData.lastName,
                    role: 'casting_director'
                };

                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(registerData)
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    tokenManager.setToken(data.data.accessToken);
                    tokenManager.setUserData(data.data.user);
                    return { success: true, data: data.data };
                } else {
                    return { success: false, error: data.message || 'Registration failed' };
                }
            } catch (error) {
                console.error('Backend registration failed, falling back to mock');
                authAPI.backendAvailable = false;
            }
        }
        
        // Mock registration
        const existingUser = MOCK_USERS.find(u => u.email === userData.email);
        if (existingUser) {
            return { success: false, error: 'Email already exists' };
        }
        
        const newUser = {
            id: String(MOCK_USERS.length + 1),
            email: userData.email,
            firstName: userData.fullName?.split(' ')[0] || 'User',
            lastName: userData.fullName?.split(' ').slice(1).join(' ') || '',
            role: 'casting_director',
            company: userData.company || 'Production House',
            isEmailVerified: true
        };
        
        MOCK_USERS.push({ ...newUser, password: userData.password });
        
        const token = generateMockToken(newUser);
        tokenManager.setToken(token);
        tokenManager.setUserData(newUser);
        
        return {
            success: true,
            data: { user: newUser, accessToken: token },
            mode: 'mock'
        };
    },

    // Forgot Password
    forgotPassword: async (email) => {
        // Try real backend first
        if (authAPI.backendAvailable) {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    return { success: true, data: data.data };
                } else {
                    return { success: false, error: data.message || 'Failed to send reset email' };
                }
            } catch (error) {
                console.error('Backend forgot password failed');
                authAPI.backendAvailable = false;
            }
        }
        
        // Mock forgot password
        const user = MOCK_USERS.find(u => u.email === email);
        if (user) {
            return {
                success: true,
                data: { message: 'Password reset email sent (mock mode)' },
                mode: 'mock'
            };
        } else {
            return { success: false, error: 'Email not found' };
        }
    },

    // Reset Password
    resetPassword: async (token, newPassword) => {
        // Mock implementation
        return {
            success: true,
            data: { message: 'Password reset successfully (mock mode)' },
            mode: 'mock'
        };
    },

    // Logout
    logout: async () => {
        const token = tokenManager.getToken();
        if (token && authAPI.backendAvailable) {
            try {
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    }
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        tokenManager.clearToken();
        window.location.href = 'login.html';
    },

    // Check if authenticated
    isAuthenticated: () => {
        return !!tokenManager.getToken();
    },

    // Get current user
    getCurrentUser: () => {
        return tokenManager.getUserData();
    }
};

// Initialize on load
authAPI.init();

// Export for use in HTML pages
window.authAPI = authAPI;
window.tokenManager = tokenManager;