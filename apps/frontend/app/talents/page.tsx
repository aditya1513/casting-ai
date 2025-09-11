'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  SlidersHorizontal,
  Grid,
  List,
  Bookmark,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TalentCard } from '@/components/talent/TalentCard';
import { SearchFilters } from '@/components/talent/SearchFilters';
import { useTalentSearch, useAutocompleteSuggestions, useSaveSearch } from '@/hooks/use-talents';
import { TalentSearchParams, Talent } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

type ViewMode = 'grid' | 'list';
type SortBy = 'relevance' | 'rating' | 'experience' | 'recent';

export default function TalentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // State management
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState<TalentSearchParams>({
    query: searchParams.get('q') || '',
    page: parseInt(searchParams.get('page') || '1'),
    limit: 12,
    sortBy: (searchParams.get('sortBy') as SortBy) || 'relevance',
  });
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showSaveSearchDialog, setShowSaveSearchDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);
  const [showQuickView, setShowQuickView] = useState(false);
  const [showAutoComplete, setShowAutoComplete] = useState(false);

  // API hooks
  const { data, isLoading, error, refetch } = useTalentSearch(filters);
  const { data: suggestions } = useAutocompleteSuggestions(searchQuery, showAutoComplete);
  const saveSearchMutation = useSaveSearch();

  // Update URL with search params
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.query) params.set('q', filters.query);
    if (filters.page && filters.page > 1) params.set('page', filters.page.toString());
    if (filters.sortBy && filters.sortBy !== 'relevance') params.set('sortBy', filters.sortBy);

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.push(`/talents${newUrl}`, { scroll: false });
  }, [filters, router]);

  // Handle search
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setFilters(prev => ({ ...prev, query: searchQuery, page: 1 }));
      setShowAutoComplete(false);
    },
    [searchQuery]
  );

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: TalentSearchParams) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  // Handle sort change
  const handleSortChange = useCallback((sortBy: SortBy) => {
    setFilters(prev => ({ ...prev, sortBy, page: 1 }));
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Save search
  const handleSaveSearch = async () => {
    if (!saveSearchName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name for your saved search',
        variant: 'destructive',
      });
      return;
    }

    try {
      await saveSearchMutation.mutateAsync({
        name: saveSearchName,
        params: filters,
      });
      toast({
        title: 'Success',
        description: 'Your search has been saved',
      });
      setShowSaveSearchDialog(false);
      setSaveSearchName('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save search. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Quick view handler
  const handleQuickView = (talent: Talent) => {
    setSelectedTalent(talent);
    setShowQuickView(true);
  };

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-[400px] w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );

  // Empty state
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Search className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No talents found</h3>
      <p className="text-gray-600 text-center max-w-md">
        Try adjusting your filters or search terms to find what you're looking for.
      </p>
      <Button
        onClick={() => {
          setFilters({ page: 1, limit: 12, sortBy: 'relevance' });
          setSearchQuery('');
        }}
        className="mt-4"
      >
        Clear all filters
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-4">Discover Talented Artists</h1>
          <p className="text-lg opacity-90 mb-8">
            Find the perfect talent for your next OTT production in Mumbai
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name, skills, or keywords..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setShowAutoComplete(true);
                }}
                onFocus={() => setShowAutoComplete(true)}
                className="pl-10 pr-24 py-6 text-lg bg-white text-gray-900"
              />
              <Button type="submit" className="absolute right-2 top-1/2 transform -translate-y-1/2">
                Search
              </Button>
            </div>

            {/* Autocomplete Suggestions */}
            {showAutoComplete && suggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg mt-2 z-10">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-900"
                    onClick={() => {
                      setSearchQuery(suggestion);
                      setShowAutoComplete(false);
                      setFilters(prev => ({ ...prev, query: suggestion, page: 1 }));
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-4 mt-8">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              <TrendingUp className="w-4 h-4 mr-1" />
              5,000+ Verified Talents
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              15+ Languages
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              All Experience Levels
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <SearchFilters filters={filters} onFiltersChange={handleFiltersChange} />
          </aside>

          {/* Results Section */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {/* Mobile Filters */}
                  <div className="lg:hidden">
                    <SearchFilters
                      filters={filters}
                      onFiltersChange={handleFiltersChange}
                      isMobile
                    />
                  </div>

                  {/* Results Count */}
                  {data && (
                    <p className="text-sm text-gray-600">
                      Showing {((filters.page || 1) - 1) * (filters.limit || 12) + 1}-
                      {Math.min((filters.page || 1) * (filters.limit || 12), data.total)} of{' '}
                      {data.total} results
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Save Search */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSaveSearchDialog(true)}
                    className="gap-2"
                  >
                    <Bookmark className="w-4 h-4" />
                    Save Search
                  </Button>

                  {/* Sort Dropdown */}
                  <Select value={filters.sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                      <SelectItem value="experience">Most Experienced</SelectItem>
                      <SelectItem value="recent">Recently Active</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 border rounded-lg p-1">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="p-2"
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="p-2"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Failed to load talents. Please try again later.</AlertDescription>
              </Alert>
            )}

            {/* Results Grid/List */}
            {isLoading ? (
              <LoadingSkeleton />
            ) : data?.talents && data.talents.length > 0 ? (
              <>
                <div
                  className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                      : 'space-y-4'
                  )}
                >
                  {data.talents.map(talent => (
                    <TalentCard key={talent.id} talent={talent} onQuickView={handleQuickView} />
                  ))}
                </div>

                {/* Pagination */}
                {data.totalPages > 1 && (
                  <div className="flex justify-center mt-8">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handlePageChange((filters.page || 1) - 1)}
                        disabled={(filters.page || 1) <= 1}
                      >
                        Previous
                      </Button>

                      {[...Array(Math.min(5, data.totalPages))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === (filters.page || 1) ? 'default' : 'outline'}
                            onClick={() => handlePageChange(pageNum)}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}

                      {data.totalPages > 5 && (
                        <>
                          <span className="px-2">...</span>
                          <Button
                            variant="outline"
                            onClick={() => handlePageChange(data.totalPages)}
                            className="w-10"
                          >
                            {data.totalPages}
                          </Button>
                        </>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => handlePageChange((filters.page || 1) + 1)}
                        disabled={(filters.page || 1) >= data.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </div>

      {/* Save Search Dialog */}
      <Dialog open={showSaveSearchDialog} onOpenChange={setShowSaveSearchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Save your current search filters to quickly access them later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search-name">Search Name</Label>
              <Input
                id="search-name"
                placeholder="e.g., Young actors in Mumbai"
                value={saveSearchName}
                onChange={e => setSaveSearchName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveSearchDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSearch} disabled={saveSearchMutation.isPending}>
              {saveSearchMutation.isPending ? 'Saving...' : 'Save Search'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick View Dialog */}
      {selectedTalent && (
        <Dialog open={showQuickView} onOpenChange={setShowQuickView}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTalent.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Location</Label>
                  <p>{selectedTalent.location}</p>
                </div>
                <div>
                  <Label>Experience</Label>
                  <p className="capitalize">{selectedTalent.experience}</p>
                </div>
                <div>
                  <Label>Languages</Label>
                  <p>{selectedTalent.languages.join(', ')}</p>
                </div>
                <div>
                  <Label>Rating</Label>
                  <p>
                    {selectedTalent.rating} ({selectedTalent.reviewCount} reviews)
                  </p>
                </div>
              </div>
              {selectedTalent.bio && (
                <div>
                  <Label>About</Label>
                  <p className="text-gray-600">{selectedTalent.bio}</p>
                </div>
              )}
              <div>
                <Label>Skills</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedTalent.skills.map(skill => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuickView(false)}>
                Close
              </Button>
              <Button onClick={() => router.push(`/talents/${selectedTalent.id}`)}>
                View Full Profile
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
