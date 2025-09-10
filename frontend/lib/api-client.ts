// API client configuration for CastMatch localhost development

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

// API client class for CastMatch
class APIClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      return data as T
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Conversation API methods
  async getConversations(projectId?: string): Promise<Conversation[]> {
    const query = projectId ? `?projectId=${projectId}` : ''
    return this.request(`/api/conversations${query}`)
  }

  async sendMessage(data: SendMessageRequest): Promise<Message> {
    return this.request('/api/conversations/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Talent API methods  
  async searchTalents(query: TalentSearchQuery): Promise<TalentSearchResult> {
    return this.request('/api/talents/search', {
      method: 'POST',
      body: JSON.stringify(query),
    })
  }

  // AI Chat API methods
  async getChatResponse(data: ChatRequest): Promise<ChatResponse> {
    return this.request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

// Type definitions
export interface Conversation {
  id: string
  projectId: string
  title: string
  lastMessage?: Message
  createdAt: string
}

export interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  talentCards?: TalentCard[]
}

export interface TalentCard {
  id: string
  name: string
  matchScore: number
  quote: string
  location: string
  language: string
  experience: string
  availability: string
}

export interface TalentSearchQuery {
  query: string
  projectId?: string
}

export interface TalentSearchResult {
  talents: any[]
  total: number
}

export interface SendMessageRequest {
  projectId: string
  content: string
  attachments?: File[]
}

export interface ChatRequest {
  message: string
  projectId?: string
}

export interface ChatResponse {
  response: string
  talentRecommendations?: TalentCard[]
}

// Create singleton instance
export const apiClient = new APIClient()
export { API_BASE_URL, WS_URL }