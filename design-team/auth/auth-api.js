// Auth API Integration
const API_BASE_URL = 'http://localhost:3001/api';

// Store JWT token in localStorage
const tokenManager = {
    setToken: (token) => {
        localStorage.setItem('authToken', token);
        localStorage.setItem('tokenExpiry', Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    },
    
    getToken: () => {
        const expiry = localStorage.getItem('tokenExpiry');
        if (expiry && Date.now() > parseInt(expiry)) {
            tokenManager.clearToken();
            return null;
        }
        return localStorage.getItem('authToken');
    },
    
    clearToken: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('tokenExpiry');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userData');
    },
    
    setUserData: (userData) => {
        localStorage.setItem('userData', JSON.stringify(userData));
        localStorage.setItem('userRole', userData.role || 'casting_director');
    },
    
    getUserData: () => {
        const data = localStorage.getItem('userData');
        return data ? JSON.parse(data) : null;
    },
    
    isAuthenticated: () => {
        return !!tokenManager.getToken();
    }
};

// API Functions
const authAPI = {
    // Login function
    login: async (email, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Store token and user data
                tokenManager.setToken(data.token);
                tokenManager.setUserData(data.user);
                return { success: true, data };
            } else {
                return { 
                    success: false, 
                    error: data.message || 'Invalid credentials' 
                };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                error: 'Network error. Please check your connection.' 
            };
        }
    },

    // Signup function for casting directors
    signup: async (userData) => {
        try {
            const signupData = {
                ...userData,
                role: 'casting_director',
                accountType: 'professional'
            };

            const response = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(signupData)
            });

            const data = await response.json();

            if (response.ok) {
                // Auto-login after successful signup
                tokenManager.setToken(data.token);
                tokenManager.setUserData(data.user);
                return { success: true, data };
            } else {
                return { 
                    success: false, 
                    error: data.message || 'Signup failed' 
                };
            }
        } catch (error) {
            console.error('Signup error:', error);
            return { 
                success: false, 
                error: 'Network error. Please check your connection.' 
            };
        }
    },

    // Request password reset
    requestPasswordReset: async (email) => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true, data };
            } else {
                return { 
                    success: false, 
                    error: data.message || 'Failed to send reset email' 
                };
            }
        } catch (error) {
            console.error('Password reset error:', error);
            return { 
                success: false, 
                error: 'Network error. Please check your connection.' 
            };
        }
    },

    // Verify reset code and set new password
    resetPassword: async (email, code, newPassword) => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    email, 
                    code, 
                    newPassword 
                })
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true, data };
            } else {
                return { 
                    success: false, 
                    error: data.message || 'Failed to reset password' 
                };
            }
        } catch (error) {
            console.error('Password reset error:', error);
            return { 
                success: false, 
                error: 'Network error. Please check your connection.' 
            };
        }
    },

    // Logout function
    logout: () => {
        tokenManager.clearToken();
        window.location.href = '/design-team/auth/login.html';
    },

    // Check authentication status
    checkAuth: async () => {
        const token = tokenManager.getToken();
        if (!token) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                tokenManager.setUserData(data.user);
                return true;
            } else {
                tokenManager.clearToken();
                return false;
            }
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    },

    // Get authenticated API headers
    getAuthHeaders: () => {
        const token = tokenManager.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    }
};

// Redirect to dashboard if already logged in (for login/signup pages)
async function redirectIfAuthenticated() {
    const isAuth = await authAPI.checkAuth();
    if (isAuth) {
        window.location.href = '/dashboard';
    }
}

// Protect pages that require authentication
async function requireAuth() {
    const isAuth = await authAPI.checkAuth();
    if (!isAuth) {
        window.location.href = '/design-team/auth/login.html';
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { authAPI, tokenManager };
}