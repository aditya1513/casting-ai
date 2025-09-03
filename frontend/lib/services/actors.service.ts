/**
 * Actors Service
 * Handles actor profiles and portfolio management
 */

import { apiClient } from '@/lib/api-client'

export interface Actor {
  id: string
  name: string
  email: string
  phone?: string
  profileImage?: string
  bio?: string
  age?: number
  height?: string
  weight?: string
  languages?: string[]
  skills?: string[]
  experience?: string
  location?: string
  availability?: boolean
  portfolio?: Portfolio[]
  createdAt: string
  updatedAt: string
}

export interface Portfolio {
  id: string
  type: 'image' | 'video' | 'document'
  url: string
  title?: string
  description?: string
  uploadedAt: string
}

export interface ActorFilters {
  age?: { min?: number; max?: number }
  languages?: string[]
  skills?: string[]
  location?: string
  availability?: boolean
  search?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

class ActorsService {
  /**
   * Get all actors with filters
   */
  async getActors(filters?: ActorFilters, pagination?: PaginationParams) {
    const params: Record<string, string | number | boolean> = {}
    
    // Add pagination params
    if (pagination) {
      if (pagination.page !== undefined) params.page = pagination.page
      if (pagination.limit !== undefined) params.limit = pagination.limit
      if (pagination.sortBy) params.sortBy = pagination.sortBy
      if (pagination.sortOrder) params.sortOrder = pagination.sortOrder
    }
    
    // Add filter params
    if (filters) {
      if (filters.age?.min !== undefined) params.ageMin = filters.age.min
      if (filters.age?.max !== undefined) params.ageMax = filters.age.max
      if (filters.languages?.length) params.languages = filters.languages.join(',')
      if (filters.skills?.length) params.skills = filters.skills.join(',')
      if (filters.location) params.location = filters.location
      if (filters.availability !== undefined) params.availability = filters.availability
      if (filters.search) params.search = filters.search
    }
    
    return apiClient.get<{ actors: Actor[]; total: number }>('/api/actors', params)
  }

  /**
   * Get single actor by ID
   */
  async getActorById(id: string) {
    return apiClient.get<Actor>(`/api/actors/${id}`)
  }

  /**
   * Update actor profile
   */
  async updateProfile(id: string, data: Partial<Actor>) {
    return apiClient.put<Actor>(`/api/actors/${id}`, data)
  }

  /**
   * Upload profile image
   */
  async uploadProfileImage(id: string, file: File) {
    return apiClient.uploadFile<{ imageUrl: string }>(
      `/api/actors/${id}/profile-image`,
      file
    )
  }

  /**
   * Add portfolio item
   */
  async addPortfolioItem(actorId: string, file: File, metadata?: Partial<Portfolio>) {
    return apiClient.uploadFile<Portfolio>(
      `/api/actors/${actorId}/portfolio`,
      file,
      metadata
    )
  }

  /**
   * Remove portfolio item
   */
  async removePortfolioItem(actorId: string, portfolioId: string) {
    return apiClient.delete(`/api/actors/${actorId}/portfolio/${portfolioId}`)
  }

  /**
   * Get actor's audition history
   */
  async getAuditionHistory(actorId: string) {
    return apiClient.get(`/api/actors/${actorId}/auditions`)
  }

  /**
   * Search actors by keyword
   */
  async searchActors(query: string, limit: number = 10) {
    return apiClient.get<Actor[]>('/api/actors/search', { q: query, limit })
  }

  /**
   * Get recommended actors for a project
   */
  async getRecommendedActors(projectId: string) {
    return apiClient.get<Actor[]>(`/api/projects/${projectId}/recommended-actors`)
  }

  /**
   * Export actor profile as PDF
   */
  async exportProfile(actorId: string) {
    return apiClient.get(`/api/actors/${actorId}/export`, { format: 'pdf' })
  }
}

export const actorsService = new ActorsService()