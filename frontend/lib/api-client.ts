/**
 * API Client Configuration for CastMatch Frontend
 * Provides a centralized HTTP client for backend communication
 */

interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  params?: Record<string, string | number | boolean>
}

interface ApiResponse<T = any> {
  data?: T
  error?: string
  status: number
  ok: boolean
}

class ApiClient {
  private baseURL: string
  private timeout: number
  private defaultHeaders: Record<string, string>

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    this.timeout = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000')
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  }

  /**
   * Get auth token from localStorage or cookies
   */
  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken')
    }
    return null
  }

  /**
   * Build URL with query parameters
   */
  private buildURL(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(`${this.baseURL}${endpoint}`)
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, String(params[key]))
        }
      })
    }
    
    return url.toString()
  }

  /**
   * Make HTTP request with proper error handling and CORS support
   */
  private async request<T = any>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const { method = 'GET', headers = {}, body, params } = config
    
    const authToken = this.getAuthToken()
    const requestHeaders: Record<string, string> = {
      ...this.defaultHeaders,
      ...headers,
    }
    
    if (authToken) {
      requestHeaders['Authorization'] = `Bearer ${authToken}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(this.buildURL(endpoint, params), {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        credentials: 'include', // Include cookies for CORS requests
      })

      clearTimeout(timeoutId)

      const contentType = response.headers.get('content-type')
      let data: any = null

      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      if (!response.ok) {
        return {
          error: data?.message || data?.error || `Request failed with status ${response.status}`,
          status: response.status,
          ok: false,
          data: undefined,
        }
      }

      return {
        data,
        status: response.status,
        ok: true,
      }
    } catch (error: any) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        return {
          error: 'Request timeout',
          status: 0,
          ok: false,
        }
      }

      return {
        error: error.message || 'Network error occurred',
        status: 0,
        ok: false,
      }
    }
  }

  /**
   * Public API methods
   */
  async get<T = any>(endpoint: string, params?: Record<string, string | number | boolean>) {
    return this.request<T>(endpoint, { method: 'GET', params })
  }

  async post<T = any>(endpoint: string, body?: any, params?: Record<string, string | number | boolean>) {
    return this.request<T>(endpoint, { method: 'POST', body, params })
  }

  async put<T = any>(endpoint: string, body?: any, params?: Record<string, string | number | boolean>) {
    return this.request<T>(endpoint, { method: 'PUT', body, params })
  }

  async patch<T = any>(endpoint: string, body?: any, params?: Record<string, string | number | boolean>) {
    return this.request<T>(endpoint, { method: 'PATCH', body, params })
  }

  async delete<T = any>(endpoint: string, params?: Record<string, string | number | boolean>) {
    return this.request<T>(endpoint, { method: 'DELETE', params })
  }

  /**
   * File upload method
   */
  async uploadFile<T = any>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key])
      })
    }

    const authToken = this.getAuthToken()
    const headers: Record<string, string> = {}
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          error: data?.message || `Upload failed with status ${response.status}`,
          status: response.status,
          ok: false,
          data: undefined,
        }
      }

      return {
        data,
        status: response.status,
        ok: true,
      }
    } catch (error: any) {
      return {
        error: error.message || 'Upload failed',
        status: 0,
        ok: false,
      }
    }
  }

  /**
   * Set auth token
   */
  setAuthToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token)
    }
  }

  /**
   * Clear auth token
   */
  clearAuthToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken')
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export type definitions
export type { ApiResponse, ApiRequestConfig }