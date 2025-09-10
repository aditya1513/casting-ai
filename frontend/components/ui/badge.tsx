import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center font-semibold transition-all duration-200 select-none",
  {
    variants: {
      variant: {
        // Project status badges as per wireframe
        active: "bg-gray-900 text-white dark:bg-white dark:text-gray-900",
        pending: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
        completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
        paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200",
        cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
        // Generic variants
        default: "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100",
        secondary: "bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400",
        outline: "border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300",
        success: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
        warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200",
        error: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
        info: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
      },
      size: {
        xs: "h-5 px-1.5 text-[10px] rounded",
        sm: "h-6 px-2 text-xs rounded-md",
        md: "h-7 px-2.5 text-xs rounded-lg",
        lg: "h-8 px-3 text-sm rounded-lg",
      },
      rounded: {
        default: "",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
      rounded: "full",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Optional icon to display in the badge */
  icon?: React.ReactNode
  /** Show a dot indicator before the text */
  dot?: boolean
  /** Dot color (defaults to currentColor) */
  dotColor?: string
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, rounded, icon, dot, dotColor, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size, rounded }), className)}
        {...props}
      >
        {dot && (
          <span
            className="mr-1.5 h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: dotColor || "currentColor" }}
            aria-hidden="true"
          />
        )}
        {icon && <span className="mr-1">{icon}</span>}
        {children}
      </div>
    )
  }
)

Badge.displayName = "Badge"

// Status Badge specifically for project statuses
const StatusBadge: React.FC<{
  status: "active" | "pending" | "completed" | "paused" | "cancelled"
  count?: number
  className?: string
}> = ({ status, count, className }) => {
  return (
    <Badge variant={status} className={cn("min-w-[60px] justify-center", className)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
      {count !== undefined && (
        <span className="ml-1 opacity-75">({count})</span>
      )}
    </Badge>
  )
}

export { Badge, badgeVariants, StatusBadge }