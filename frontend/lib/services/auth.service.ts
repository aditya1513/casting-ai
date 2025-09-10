/**
 * Authentication Service
 * Handles user authentication and authorization
 */

import { apiClient } from '@/lib/api-client'

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupData {
  email: string
  password: string
  name: string
  role: 'actor' | 'casting_director' | 'producer'
  phone?: string
}

export interface User {
  id: string
  email: string
  name: string
  role: string
  profileImage?: string
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: User
}

class AuthService {
  /**
   * User login
   */
  async login(credentials: LoginCredentials) {
    const response = await apiClient.post<AuthResponse>('/api/auth/login', credentials)
    
    if (response.ok && response.data) {
      apiClient.setAuthToken(response.data.token)
    }
    
    return response
  }

  /**
   * User signup
   */
  async signup(data: SignupData) {
    const response = await apiClient.post<AuthResponse>('/api/auth/signup', data)
    
    if (response.ok && response.data) {
      apiClient.setAuthToken(response.data.token)
    }
    
    return response
  }

  /**
   * User logout
   */
  async logout() {
    const response = await apiClient.post('/api/auth/logout')
    apiClient.clearAuthToken()
    return response
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    return apiClient.get<User>('/api/auth/me')
  }

  /**
   * Refresh authentication token
   */
  async refreshToken() {
    const response = await apiClient.post<{ token: string }>('/api/auth/refresh')
    
    if (response.ok && response.data) {
      apiClient.setAuthToken(response.data.token)
    }
    
    return response
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    return apiClient.post('/api/auth/forgot-password', { email })
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string) {
    return apiClient.post('/api/auth/reset-password', { token, newPassword })
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string) {
    return apiClient.post('/api/auth/verify-email', { token })
  }
}

export const authService = new AuthService()