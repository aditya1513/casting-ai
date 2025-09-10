"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full ring-offset-2 ring-offset-white dark:ring-offset-gray-900",
  {
    variants: {
      size: {
        xs: "h-6 w-6",
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-14 w-14",
        "2xl": "h-16 w-16",
      },
      status: {
        none: "",
        online: "ring-2 ring-green-500",
        offline: "ring-2 ring-gray-400",
        busy: "ring-2 ring-red-500",
        away: "ring-2 ring-yellow-500",
      },
    },
    defaultVariants: {
      size: "md",
      status: "none",
    },
  }
)

interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, status, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ size, status, className }))}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {
    initials?: string
    type?: "user" | "ai"
  }
>(({ className, initials, type = "user", children, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full font-medium",
      type === "ai" 
        ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white" 
        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      className
    )}
    {...props}
  >
    {initials ? (
      <span className="text-xs font-semibold uppercase">{initials}</span>
    ) : (
      children
    )}
  </AvatarPrimitive.Fallback>
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

// Avatar with status indicator component
const AvatarWithStatus: React.FC<{
  src?: string
  alt?: string
  initials?: string
  status?: "online" | "offline" | "busy" | "away"
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
  type?: "user" | "ai"
  className?: string
}> = ({ src, alt, initials, status, size = "md", type = "user", className }) => {
  return (
    <div className="relative inline-block">
      <Avatar size={size} status={status} className={className}>
        <AvatarImage src={src} alt={alt} />
        <AvatarFallback initials={initials} type={type} />
      </Avatar>
      {status && status !== "offline" && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-gray-900",
            {
              "h-2 w-2": size === "xs" || size === "sm",
              "h-2.5 w-2.5": size === "md",
              "h-3 w-3": size === "lg" || size === "xl" || size === "2xl",
            },
            {
              "bg-green-500": status === "online",
              "bg-gray-400": status === "offline",
              "bg-red-500": status === "busy",
              "bg-yellow-500": status === "away",
            }
          )}
        />
      )}
    </div>
  )
}

export { Avatar, AvatarImage, AvatarFallback, AvatarWithStatus }