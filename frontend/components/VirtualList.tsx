'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  getItemId?: (item: T, index: number) => string | number;
  sticky?: {
    indices: number[];
    renderSticky: (item: T, index: number) => React.ReactNode;
  };
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onScroll,
  getItemId,
  sticky
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const totalHeight = items.length * itemHeight;
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    const result = [];
    
    for (let i = startIndex; i <= endIndex; i++) {
      if (items[i]) {
        result.push({
          index: i,
          item: items[i],
          top: i * itemHeight
        });
      }
    }
    
    return result;
  }, [items, visibleRange, itemHeight]);

  const stickyItems = useMemo(() => {
    if (!sticky) return [];
    
    return sticky.indices
      .filter(index => index < items.length)
      .map(index => ({
        index,
        item: items[index],
        top: index * itemHeight
      }));
  }, [sticky, items, itemHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // Scroll to index method
  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      const targetScrollTop = Math.max(0, Math.min(
        index * itemHeight,
        totalHeight - containerHeight
      ));
      
      containerRef.current.scrollTop = targetScrollTop;
    }
  }, [itemHeight, totalHeight, containerHeight]);

  // Expose scroll method via ref
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as any).scrollToIndex = scrollToIndex;
    }
  }, [scrollToIndex]);

  return (
    <div 
      ref={containerRef}
      className={cn('overflow-auto will-change-scroll', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Virtual container with total height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Render visible items */}
        {visibleItems.map(({ index, item, top }) => (
          <div
            key={getItemId ? getItemId(item, index) : index}
            style={{
              position: 'absolute',
              top,
              width: '100%',
              height: itemHeight,
              willChange: 'transform'
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
        
        {/* Render sticky items */}
        {stickyItems.map(({ index, item, top }) => {
          const isVisible = scrollTop >= top && scrollTop < top + itemHeight;
          const stickyTop = Math.max(scrollTop, top);
          const maxTop = Math.min(
            scrollTop + containerHeight - itemHeight,
            top
          );
          
          return (
            <div
              key={`sticky-${index}`}
              style={{
                position: 'absolute',
                top: Math.min(stickyTop, maxTop),
                width: '100%',
                height: itemHeight,
                zIndex: 10,
                willChange: 'transform'
              }}
              className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
            >
              {sticky?.renderSticky(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Hook for virtual scrolling with search and filtering
export function useVirtualScrolling<T>(
  items: T[],
  searchTerm: string = '',
  filterFn?: (item: T) => boolean,
  searchFn?: (item: T, term: string) => boolean
) {
  const filteredItems = useMemo(() => {
    let result = items;
    
    // Apply filter function
    if (filterFn) {
      result = result.filter(filterFn);
    }
    
    // Apply search
    if (searchTerm && searchFn) {
      result = result.filter(item => searchFn(item, searchTerm));
    }
    
    return result;
  }, [items, searchTerm, filterFn, searchFn]);

  const scrollToItem = useCallback((predicate: (item: T) => boolean) => {
    const index = filteredItems.findIndex(predicate);
    return index;
  }, [filteredItems]);

  return {
    filteredItems,
    scrollToItem,
    totalCount: items.length,
    filteredCount: filteredItems.length
  };
}

export default VirtualList;