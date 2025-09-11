/**
 * Loading Skeleton Components for Streaming UI
 * Based on Remix documentation: https://v2.remix.run/docs/guides/streaming
 */

export function ProjectCardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-slate-600 rounded w-3/4"></div>
        <div className="h-4 bg-slate-600 rounded w-16"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-600 rounded w-full"></div>
        <div className="h-4 bg-slate-600 rounded w-2/3"></div>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="h-4 bg-slate-600 rounded w-20"></div>
        <div className="h-4 bg-slate-600 rounded w-24"></div>
      </div>
    </div>
  );
}

export function TalentCardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-slate-600 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-slate-600 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-slate-600 rounded w-1/2"></div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-slate-600 rounded w-full"></div>
        <div className="h-3 bg-slate-600 rounded w-2/3"></div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-4 bg-slate-600 rounded w-20 mb-2"></div>
          <div className="h-8 bg-slate-600 rounded w-16"></div>
        </div>
        <div className="w-8 h-8 bg-slate-600 rounded"></div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 bg-slate-600 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-slate-600 rounded w-32 animate-pulse"></div>
          </div>
          <div className="w-10 h-10 bg-slate-600 rounded-full animate-pulse"></div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Projects Skeleton */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <div className="h-6 bg-slate-600 rounded w-40 mb-4 animate-pulse"></div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </div>
          </div>

          {/* Talents Skeleton */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <div className="h-6 bg-slate-600 rounded w-32 mb-4 animate-pulse"></div>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <TalentCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}