'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { usePerformanceOptimizer } from '@/lib/performance-optimizer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  ChevronUp, 
  ChevronDown,
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Trash2,
  Star,
  Calendar,
  MessageSquare,
  Eye,
  Edit,
  ArrowUpDown,
  CheckSquare,
  Square
} from 'lucide-react'

export interface Column<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  filterable?: boolean
  width?: string | number
  render?: (value: any, item: T) => React.ReactNode
  align?: 'left' | 'center' | 'right'
}

export interface BulkAction<T> {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  action: (items: T[]) => void
  destructive?: boolean
  requiresSelection?: boolean
}

interface AdvancedDataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  bulkActions?: BulkAction<T>[]
  searchable?: boolean
  searchPlaceholder?: string
  onRowClick?: (item: T) => void
  onRowAction?: (item: T, action: string) => void
  pageSize?: number
  className?: string
  idField?: keyof T
}

type SortDirection = 'asc' | 'desc' | null

interface SortConfig {
  key: string
  direction: SortDirection
}

export default function AdvancedDataTable<T extends Record<string, any>>({
  data,
  columns,
  bulkActions = [],
  searchable = true,
  searchPlaceholder = "Search...",
  onRowClick,
  onRowAction,
  pageSize = 50,
  className,
  idField = 'id' as keyof T
}: AdvancedDataTableProps<T>) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null })
  const [currentPage, setCurrentPage] = useState(1)
  const tableRef = useRef<HTMLDivElement>(null)
  
  // Performance optimizations
  const { debounce, throttle } = usePerformanceOptimizer()

  // Filter and search data
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data
    
    return data.filter(item =>
      columns.some(column => {
        const value = item[column.key as keyof T]
        if (value == null) return false
        
        return String(value)
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      })
    )
  }, [data, searchQuery, columns])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1

      // Handle different data types
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc' 
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime()
      }

      const aString = String(aValue).toLowerCase()
      const bString = String(bValue).toLowerCase()
      
      return sortConfig.direction === 'asc' 
        ? aString.localeCompare(bString)
        : bString.localeCompare(aString)
    })
  }, [filteredData, sortConfig])

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedData.slice(startIndex, startIndex + pageSize)
  }, [sortedData, currentPage, pageSize])

  const totalPages = Math.ceil(sortedData.length / pageSize)

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        // Cycle through: asc -> desc -> null
        const direction: SortDirection = 
          prev.direction === 'asc' ? 'desc' :
          prev.direction === 'desc' ? null : 'asc'
        
        return { key: direction ? key : '', direction }
      } else {
        return { key, direction: 'asc' }
      }
    })
  }

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const allIds = paginatedData.map(item => String(item[idField]))
      setSelectedItems(new Set(allIds))
    } else {
      setSelectedItems(new Set())
    }
  }, [paginatedData, idField])

  const handleSelectItem = useCallback((id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedItems(newSelected)
  }, [selectedItems])

  const getSelectedItemsData = () => {
    return data.filter(item => selectedItems.has(String(item[idField])))
  }

  const isAllSelected = paginatedData.length > 0 && 
    paginatedData.every(item => selectedItems.has(String(item[idField])))
  
  const isPartiallySelected = selectedItems.size > 0 && !isAllSelected

  const getSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />
    }
    
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4" />
      : <ChevronDown className="h-4 w-4" />
  }

  const RowActionMenu = ({ item }: { item: T }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onRowAction?.(item, 'view')}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRowAction?.(item, 'edit')}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onRowAction?.(item, 'shortlist')}>
          <Star className="h-4 w-4 mr-2" />
          Add to Shortlist
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRowAction?.(item, 'audition')}>
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Audition
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRowAction?.(item, 'message')}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Send Message
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => onRowAction?.(item, 'delete')}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Search */}
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={debounce?.((e: React.ChangeEvent<HTMLInputElement>) => 
                  setSearchQuery(e.target.value), 300) || 
                  ((e) => setSearchQuery(e.target.value))
                }
                className="pl-10 w-64"
              />
            </div>
          )}

          {/* Bulk Actions */}
          {selectedItems.size > 0 && bulkActions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedItems.size} selected
              </span>
              {bulkActions.map((action) => (
                <Button
                  key={action.id}
                  size="sm"
                  variant={action.destructive ? "destructive" : "outline"}
                  onClick={() => action.action(getSelectedItemsData())}
                  disabled={action.requiresSelection && selectedItems.size === 0}
                >
                  {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Table Actions */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div ref={tableRef} className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  className={isPartiallySelected ? "data-[state=checked]:bg-primary/50" : ""}
                />
              </TableHead>
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className={cn(
                    "font-medium",
                    column.align === 'center' && "text-center",
                    column.align === 'right' && "text-right",
                    column.sortable && "cursor-pointer hover:bg-muted/50 select-none"
                  )}
                  style={{ width: column.width }}
                  onClick={column.sortable ? () => handleSort(String(column.key)) : undefined}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && getSortIcon(String(column.key))}
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((item) => {
              const id = String(item[idField])
              const isSelected = selectedItems.has(id)
              
              return (
                <TableRow
                  key={id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    isSelected && "bg-muted"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => 
                        handleSelectItem(id, checked as boolean)
                      }
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select row ${id}`}
                    />
                  </TableCell>
                  {columns.map((column) => {
                    const value = item[column.key as keyof T]
                    const displayValue = column.render ? column.render(value, item) : value
                    
                    return (
                      <TableCell
                        key={String(column.key)}
                        className={cn(
                          column.align === 'center' && "text-center",
                          column.align === 'right' && "text-right"
                        )}
                      >
                        {displayValue}
                      </TableCell>
                    )
                  })}
                  <TableCell>
                    <div onClick={(e) => e.stopPropagation()}>
                      <RowActionMenu item={item} />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i
                if (page > totalPages) return null
                
                return (
                  <Button
                    key={page}
                    size="sm"
                    variant={page === currentPage ? "default" : "outline"}
                    onClick={() => setCurrentPage(page)}
                    className="w-8"
                  >
                    {page}
                  </Button>
                )
              })}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}