import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { talentAPI, TalentSearchParams, Talent, SavedSearch } from '@/lib/api-client'
import { useCallback, useState, useEffect } from 'react'

// Custom debounce hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Search talents with pagination
export function useTalentSearch(params: TalentSearchParams) {
  return useQuery({
    queryKey: ['talents', 'search', params],
    queryFn: async () => {
      const response = await talentAPI.searchTalents(params)
      if (!response.ok) throw new Error(response.error)
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Infinite scroll for talent search
export function useInfiniteTalentSearch(params: Omit<TalentSearchParams, 'page'>) {
  return useInfiniteQuery({
    queryKey: ['talents', 'infinite', params],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await talentAPI.searchTalents({ ...params, page: pageParam })
      if (!response.ok) throw new Error(response.error)
      return response.data
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined
      const nextPage = (lastPage.page || 0) + 1
      return nextPage <= (lastPage.totalPages || 0) ? nextPage : undefined
    },
    initialPageParam: 1,
  })
}

// Get single talent by ID
export function useTalent(id: string) {
  return useQuery({
    queryKey: ['talents', id],
    queryFn: async () => {
      const response = await talentAPI.getTalentById(id)
      if (!response.ok) throw new Error(response.error)
      return response.data
    },
    enabled: !!id,
  })
}

// Get similar talents
export function useSimilarTalents(id: string, limit?: number) {
  return useQuery({
    queryKey: ['talents', id, 'similar', limit],
    queryFn: async () => {
      const response = await talentAPI.getSimilarTalents(id, limit)
      if (!response.ok) throw new Error(response.error)
      return response.data
    },
    enabled: !!id,
  })
}

// Bookmark/unbookmark talent
export function useBookmarkTalent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, bookmark }: { id: string; bookmark: boolean }) => {
      const response = bookmark
        ? await talentAPI.bookmarkTalent(id)
        : await talentAPI.unbookmarkTalent(id)
      
      if (!response.ok) throw new Error(response.error)
      return response.data
    },
    onSuccess: (_, variables) => {
      // Invalidate bookmarked talents list
      queryClient.invalidateQueries({ queryKey: ['talents', 'bookmarked'] })
      
      // Update the talent in cache if it exists
      queryClient.setQueryData(['talents', variables.id], (old: Talent | undefined) => {
        if (!old) return old
        return { ...old, bookmarked: variables.bookmark }
      })
    },
  })
}

// Get bookmarked talents
export function useBookmarkedTalents() {
  return useQuery({
    queryKey: ['talents', 'bookmarked'],
    queryFn: async () => {
      const response = await talentAPI.getBookmarkedTalents()
      if (!response.ok) throw new Error(response.error)
      return response.data
    },
  })
}

// Save search
export function useSaveSearch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, params }: { name: string; params: TalentSearchParams }) => {
      const response = await talentAPI.saveSearch(name, params)
      if (!response.ok) throw new Error(response.error)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talents', 'searches'] })
    },
  })
}

// Get saved searches
export function useSavedSearches() {
  return useQuery({
    queryKey: ['talents', 'searches'],
    queryFn: async () => {
      const response = await talentAPI.getSavedSearches()
      if (!response.ok) throw new Error(response.error)
      return response.data
    },
  })
}

// Delete saved search
export function useDeleteSavedSearch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await talentAPI.deleteSavedSearch(id)
      if (!response.ok) throw new Error(response.error)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talents', 'searches'] })
    },
  })
}

// Autocomplete suggestions
export function useAutocompleteSuggestions(query: string, enabled: boolean = true) {
  const debouncedQuery = useDebounce(query, 300)

  return useQuery({
    queryKey: ['talents', 'autocomplete', debouncedQuery],
    queryFn: async () => {
      const response = await talentAPI.getAutocompleteSuggestions(debouncedQuery)
      if (!response.ok) throw new Error(response.error)
      return response.data
    },
    enabled: enabled && debouncedQuery.length > 2,
  })
}