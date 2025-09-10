'use client'

import dynamic from 'next/dynamic'
import { ComponentType, Suspense } from 'react'
import { LoadingSpinner } from './chat/ChatLoadingStates'

// Lazy load heavy components to improve initial bundle size
export const LazyMessageList = dynamic(() => import('./chat/MessageList').then(mod => ({ default: mod.MessageList })), {
  loading: () => <div className="flex justify-center p-4"><LoadingSpinner size="md" variant="purple" /></div>,
  ssr: false
})

export const LazyConversationList = dynamic(() => import('./chat/ConversationList'), {
  loading: () => <div className="flex justify-center p-4"><LoadingSpinner size="md" variant="purple" /></div>,
  ssr: false
})

export const LazyTalentCard = dynamic(() => import('./talent/TalentCard'), {
  loading: () => (
    <div className="bg-slate-800 rounded-lg p-4 animate-pulse">
      <div className="h-48 bg-slate-700 rounded-lg mb-4" />
      <div className="h-4 bg-slate-700 rounded mb-2" />
      <div className="h-3 bg-slate-700 rounded w-2/3" />
    </div>
  ),
  ssr: true
})

export const LazyMotionComponents = dynamic(() => import('framer-motion'), {
  loading: () => <div />,
  ssr: false
})

export const LazyChart = dynamic(() => import('recharts'), {
  loading: () => (
    <div className="w-full h-64 bg-slate-800 rounded-lg flex items-center justify-center">
      <LoadingSpinner size="lg" variant="purple" />
    </div>
  ),
  ssr: false
})

// Wrapper component for lazy loading with error boundary
interface LazyWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  errorFallback?: React.ReactNode
}

export function LazyWrapper({ children, fallback, errorFallback }: LazyWrapperProps) {
  const defaultFallback = <div className="flex justify-center p-4"><LoadingSpinner size="md" /></div>
  const defaultErrorFallback = <div className="text-center p-4 text-red-400">Failed to load component</div>

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  )
}

// HOC for making components lazy
export function makeLazy<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  loadingComponent?: ComponentType
) {
  const LoadingComponent = loadingComponent || (() => <LoadingSpinner size="md" />)
  
  return dynamic(importFn, {
    loading: LoadingComponent,
    ssr: false
  })
}