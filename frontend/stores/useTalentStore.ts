import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { TalentData } from '@/components/castmatch/TalentCard'

interface TalentFilters {
  role?: string
  location?: string
  languages?: string[]
  skills?: string[]
  availability?: 'immediate' | 'week' | 'month' | 'any'
  minRating?: number
  maxRate?: number
  experience?: string
  verified?: boolean
}

interface TalentState {
  // Talent data
  talents: TalentData[]
  selectedTalents: Set<string>
  shortlistedTalents: Set<string>
  savedTalents: Set<string>
  
  // Search & Filters
  searchQuery: string
  filters: TalentFilters
  sortBy: 'relevance' | 'rating' | 'experience' | 'rate' | 'availability'
  sortOrder: 'asc' | 'desc'
  
  // Pagination
  currentPage: number
  pageSize: number
  totalCount: number
  
  // Loading states
  isLoading: boolean
  isSearching: boolean
  loadingTalentId: string | null
  
  // View preferences
  viewMode: 'grid' | 'list' | 'compact'
  showOnlyShortlisted: boolean
  showOnlySaved: boolean
  
  // Actions - Talent Management
  setTalents: (talents: TalentData[]) => void
  addTalent: (talent: TalentData) => void
  updateTalent: (talentId: string, updates: Partial<TalentData>) => void
  removeTalent: (talentId: string) => void
  
  // Actions - Selection
  selectTalent: (talentId: string) => void
  deselectTalent: (talentId: string) => void
  toggleTalentSelection: (talentId: string) => void
  selectAllTalents: () => void
  clearSelection: () => void
  
  // Actions - Shortlisting
  shortlistTalent: (talentId: string) => void
  removeFromShortlist: (talentId: string) => void
  toggleShortlist: (talentId: string) => void
  clearShortlist: () => void
  
  // Actions - Saving
  saveTalent: (talentId: string) => void
  unsaveTalent: (talentId: string) => void
  toggleSaved: (talentId: string) => void
  
  // Actions - Search & Filter
  setSearchQuery: (query: string) => void
  setFilters: (filters: TalentFilters) => void
  updateFilter: <K extends keyof TalentFilters>(key: K, value: TalentFilters[K]) => void
  clearFilters: () => void
  setSortBy: (sortBy: typeof TalentState.prototype.sortBy) => void
  setSortOrder: (order: 'asc' | 'desc') => void
  
  // Actions - Pagination
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  nextPage: () => void
  previousPage: () => void
  
  // Actions - Loading
  setLoading: (isLoading: boolean) => void
  setSearching: (isSearching: boolean) => void
  setLoadingTalent: (talentId: string | null) => void
  
  // Actions - View
  setViewMode: (mode: 'grid' | 'list' | 'compact') => void
  toggleShowShortlisted: () => void
  toggleShowSaved: () => void
  
  // Computed values
  getFilteredTalents: () => TalentData[]
  getSortedTalents: () => TalentData[]
  getPaginatedTalents: () => TalentData[]
  getTalentById: (talentId: string) => TalentData | undefined
  getSelectedTalents: () => TalentData[]
  getShortlistedTalents: () => TalentData[]
  getSavedTalents: () => TalentData[]
}

/**
 * Talent Store for managing talent data and search
 */
export const useTalentStore = create<TalentState>()(
  devtools(
    (set, get) => ({
      // Initial state
      talents: [],
      selectedTalents: new Set(),
      shortlistedTalents: new Set(),
      savedTalents: new Set(),
      searchQuery: '',
      filters: {},
      sortBy: 'relevance',
      sortOrder: 'desc',
      currentPage: 1,
      pageSize: 20,
      totalCount: 0,
      isLoading: false,
      isSearching: false,
      loadingTalentId: null,
      viewMode: 'grid',
      showOnlyShortlisted: false,
      showOnlySaved: false,

      // Talent Management
      setTalents: (talents) => set({ talents, totalCount: talents.length }),

      addTalent: (talent) => {
        set((state) => ({
          talents: [...state.talents, talent],
          totalCount: state.totalCount + 1,
        }))
      },

      updateTalent: (talentId, updates) => {
        set((state) => ({
          talents: state.talents.map((t) =>
            t.id === talentId ? { ...t, ...updates } : t
          ),
        }))
      },

      removeTalent: (talentId) => {
        set((state) => ({
          talents: state.talents.filter((t) => t.id !== talentId),
          selectedTalents: new Set(
            Array.from(state.selectedTalents).filter((id) => id !== talentId)
          ),
          shortlistedTalents: new Set(
            Array.from(state.shortlistedTalents).filter((id) => id !== talentId)
          ),
          savedTalents: new Set(
            Array.from(state.savedTalents).filter((id) => id !== talentId)
          ),
          totalCount: state.totalCount - 1,
        }))
      },

      // Selection
      selectTalent: (talentId) => {
        set((state) => ({
          selectedTalents: new Set(state.selectedTalents).add(talentId),
        }))
      },

      deselectTalent: (talentId) => {
        set((state) => {
          const selectedTalents = new Set(state.selectedTalents)
          selectedTalents.delete(talentId)
          return { selectedTalents }
        })
      },

      toggleTalentSelection: (talentId) => {
        const isSelected = get().selectedTalents.has(talentId)
        if (isSelected) {
          get().deselectTalent(talentId)
        } else {
          get().selectTalent(talentId)
        }
      },

      selectAllTalents: () => {
        const allIds = get().talents.map((t) => t.id)
        set({ selectedTalents: new Set(allIds) })
      },

      clearSelection: () => set({ selectedTalents: new Set() }),

      // Shortlisting
      shortlistTalent: (talentId) => {
        set((state) => ({
          shortlistedTalents: new Set(state.shortlistedTalents).add(talentId),
        }))
      },

      removeFromShortlist: (talentId) => {
        set((state) => {
          const shortlistedTalents = new Set(state.shortlistedTalents)
          shortlistedTalents.delete(talentId)
          return { shortlistedTalents }
        })
      },

      toggleShortlist: (talentId) => {
        const isShortlisted = get().shortlistedTalents.has(talentId)
        if (isShortlisted) {
          get().removeFromShortlist(talentId)
        } else {
          get().shortlistTalent(talentId)
        }
      },

      clearShortlist: () => set({ shortlistedTalents: new Set() }),

      // Saving
      saveTalent: (talentId) => {
        set((state) => ({
          savedTalents: new Set(state.savedTalents).add(talentId),
        }))
      },

      unsaveTalent: (talentId) => {
        set((state) => {
          const savedTalents = new Set(state.savedTalents)
          savedTalents.delete(talentId)
          return { savedTalents }
        })
      },

      toggleSaved: (talentId) => {
        const isSaved = get().savedTalents.has(talentId)
        if (isSaved) {
          get().unsaveTalent(talentId)
        } else {
          get().saveTalent(talentId)
        }
      },

      // Search & Filter
      setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),

      setFilters: (filters) => set({ filters, currentPage: 1 }),

      updateFilter: (key, value) => {
        set((state) => ({
          filters: { ...state.filters, [key]: value },
          currentPage: 1,
        }))
      },

      clearFilters: () => set({ filters: {}, currentPage: 1 }),

      setSortBy: (sortBy) => set({ sortBy }),

      setSortOrder: (order) => set({ sortOrder: order }),

      // Pagination
      setCurrentPage: (page) => set({ currentPage: page }),

      setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),

      nextPage: () => {
        const { currentPage, pageSize, totalCount } = get()
        const maxPage = Math.ceil(totalCount / pageSize)
        if (currentPage < maxPage) {
          set({ currentPage: currentPage + 1 })
        }
      },

      previousPage: () => {
        const { currentPage } = get()
        if (currentPage > 1) {
          set({ currentPage: currentPage - 1 })
        }
      },

      // Loading
      setLoading: (isLoading) => set({ isLoading }),
      setSearching: (isSearching) => set({ isSearching }),
      setLoadingTalent: (talentId) => set({ loadingTalentId: talentId }),

      // View
      setViewMode: (mode) => set({ viewMode: mode }),
      toggleShowShortlisted: () => {
        set((state) => ({
          showOnlyShortlisted: !state.showOnlyShortlisted,
          showOnlySaved: false,
          currentPage: 1,
        }))
      },
      toggleShowSaved: () => {
        set((state) => ({
          showOnlySaved: !state.showOnlySaved,
          showOnlyShortlisted: false,
          currentPage: 1,
        }))
      },

      // Computed values
      getFilteredTalents: () => {
        const {
          talents,
          searchQuery,
          filters,
          showOnlyShortlisted,
          showOnlySaved,
          shortlistedTalents,
          savedTalents,
        } = get()

        let filtered = [...talents]

        // Apply shortlist/saved filters
        if (showOnlyShortlisted) {
          filtered = filtered.filter((t) => shortlistedTalents.has(t.id))
        } else if (showOnlySaved) {
          filtered = filtered.filter((t) => savedTalents.has(t.id))
        }

        // Apply search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          filtered = filtered.filter(
            (t) =>
              t.name.toLowerCase().includes(query) ||
              t.role.toLowerCase().includes(query) ||
              t.location.toLowerCase().includes(query) ||
              t.skills.some((s) => s.toLowerCase().includes(query))
          )
        }

        // Apply filters
        if (filters.role) {
          filtered = filtered.filter((t) =>
            t.role.toLowerCase().includes(filters.role!.toLowerCase())
          )
        }
        if (filters.location) {
          filtered = filtered.filter((t) =>
            t.location.toLowerCase().includes(filters.location!.toLowerCase())
          )
        }
        if (filters.languages?.length) {
          filtered = filtered.filter((t) =>
            filters.languages!.some((lang) => t.languages.includes(lang))
          )
        }
        if (filters.skills?.length) {
          filtered = filtered.filter((t) =>
            filters.skills!.some((skill) => t.skills.includes(skill))
          )
        }
        if (filters.availability && filters.availability !== 'any') {
          filtered = filtered.filter((t) => t.availability === filters.availability)
        }
        if (filters.minRating) {
          filtered = filtered.filter((t) => t.rating >= filters.minRating!)
        }
        if (filters.verified !== undefined) {
          filtered = filtered.filter((t) => t.verified === filters.verified)
        }

        return filtered
      },

      getSortedTalents: () => {
        const { sortBy, sortOrder } = get()
        const filtered = get().getFilteredTalents()

        const sorted = [...filtered].sort((a, b) => {
          let comparison = 0

          switch (sortBy) {
            case 'rating':
              comparison = a.rating - b.rating
              break
            case 'experience':
              // Parse experience strings (e.g., "5 years" -> 5)
              const aExp = parseInt(a.experience) || 0
              const bExp = parseInt(b.experience) || 0
              comparison = aExp - bExp
              break
            case 'rate':
              // Parse hourly rate strings (e.g., "$50" -> 50)
              const aRate = parseInt(a.hourlyRate?.replace(/\D/g, '') || '0')
              const bRate = parseInt(b.hourlyRate?.replace(/\D/g, '') || '0')
              comparison = aRate - bRate
              break
            case 'availability':
              const availabilityOrder = { immediate: 0, week: 1, month: 2, unavailable: 3 }
              comparison = availabilityOrder[a.availability] - availabilityOrder[b.availability]
              break
            case 'relevance':
            default:
              // Use match score if available
              comparison = (b.matchScore || 0) - (a.matchScore || 0)
              break
          }

          return sortOrder === 'asc' ? comparison : -comparison
        })

        return sorted
      },

      getPaginatedTalents: () => {
        const { currentPage, pageSize } = get()
        const sorted = get().getSortedTalents()
        
        const start = (currentPage - 1) * pageSize
        const end = start + pageSize
        
        return sorted.slice(start, end)
      },

      getTalentById: (talentId) => {
        return get().talents.find((t) => t.id === talentId)
      },

      getSelectedTalents: () => {
        const { talents, selectedTalents } = get()
        return talents.filter((t) => selectedTalents.has(t.id))
      },

      getShortlistedTalents: () => {
        const { talents, shortlistedTalents } = get()
        return talents.filter((t) => shortlistedTalents.has(t.id))
      },

      getSavedTalents: () => {
        const { talents, savedTalents } = get()
        return talents.filter((t) => savedTalents.has(t.id))
      },
    }),
    {
      name: 'talent-store',
    }
  )
)