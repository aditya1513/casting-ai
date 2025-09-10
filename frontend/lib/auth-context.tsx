'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Cookies from 'js-cookie'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  name: string
  role: 'casting_director' | 'producer' | 'assistant' | 'actor'
  avatar?: string
  createdAt: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  isAuthenticated: boolean
}

interface RegisterData {
  email: string
  password: string
  name: string
  role: 'casting_director' | 'producer' | 'assistant' | 'actor'
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Configure axios defaults
axios.defaults.baseURL = API_URL
axios.interceptors.request.use(
  (config) => {
    const token = Cookies.get('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchUser = useCallback(async () => {
    try {
      const token = Cookies.get('accessToken')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await axios.get('/auth/me')
      setUser(response.data.user)
    } catch (error) {
      console.error('Error fetching user:', error)
      Cookies.remove('accessToken')
      Cookies.remove('refreshToken')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/auth/login', { email, password })
      const { user, accessToken, refreshToken } = response.data

      Cookies.set('accessToken', accessToken, { expires: 1 }) // 1 day
      Cookies.set('refreshToken', refreshToken, { expires: 7 }) // 7 days

      setUser(user)
      toast.success('Welcome back!')
      router.push('/chat')
    } catch (error: any) {
      const message = error.response?.data?.message || 'Invalid credentials'
      toast.error(message)
      throw error
    }
  }

  const register = async (data: RegisterData) => {
    try {
      const response = await axios.post('/auth/register', data)
      const { user, accessToken, refreshToken } = response.data

      Cookies.set('accessToken', accessToken, { expires: 1 })
      Cookies.set('refreshToken', refreshToken, { expires: 7 })

      setUser(user)
      toast.success('Account created successfully!')
      router.push('/chat')
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed'
      toast.error(message)
      throw error
    }
  }

  const logout = async () => {
    try {
      await axios.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      Cookies.remove('accessToken')
      Cookies.remove('refreshToken')
      setUser(null)
      router.push('/login')
      toast.success('Logged out successfully')
    }
  }

  const refreshToken = async () => {
    try {
      const refresh = Cookies.get('refreshToken')
      if (!refresh) throw new Error('No refresh token')

      const response = await axios.post('/auth/refresh', { refreshToken: refresh })
      const { accessToken } = response.data

      Cookies.set('accessToken', accessToken, { expires: 1 })
      await fetchUser()
    } catch (error) {
      console.error('Token refresh failed:', error)
      await logout()
    }
  }

  // Set up token refresh interval
  useEffect(() => {
    const interval = setInterval(() => {
      const token = Cookies.get('accessToken')
      if (token) {
        refreshToken()
      }
    }, 20 * 60 * 1000) // Refresh every 20 minutes

    return () => clearInterval(interval)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshToken,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}