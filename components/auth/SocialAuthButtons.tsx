"use client"

import React, { useState } from "react"
import { signIn, getProviders } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

// Social provider icons (you can replace these with actual icon components)
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
  </svg>
)

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)

interface SocialAuthButtonsProps {
  mode?: "signin" | "signup" | "link"
  onSuccess?: () => void
  onError?: (error: string) => void
  className?: string
  showDivider?: boolean
  currentRole?: "ACTOR" | "CASTING_DIRECTOR" | "PRODUCER" | "ADMIN"
}

interface SocialProvider {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  bgColor: string
  textColor: string
  hoverBg: string
}

const socialProviders: SocialProvider[] = [
  {
    id: "google",
    name: "Google",
    icon: GoogleIcon,
    bgColor: "bg-white",
    textColor: "text-gray-700",
    hoverBg: "hover:bg-gray-50"
  },
  {
    id: "github",
    name: "GitHub",
    icon: GitHubIcon,
    bgColor: "bg-gray-900",
    textColor: "text-white",
    hoverBg: "hover:bg-gray-800"
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: LinkedInIcon,
    bgColor: "bg-blue-600",
    textColor: "text-white",
    hoverBg: "hover:bg-blue-700"
  }
]

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  mode = "signin",
  onSuccess,
  onError,
  className,
  showDivider = true,
  currentRole
}) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const getActionText = () => {
    switch (mode) {
      case "signup": return "Sign up with"
      case "link": return "Link account with"
      default: return "Sign in with"
    }
  }

  const handleSocialAuth = async (providerId: string) => {
    try {
      setLoadingProvider(providerId)
      setError(null)

      const result = await signIn(providerId, {
        redirect: false,
        callbackUrl: currentRole ? `/dashboard?role=${currentRole.toLowerCase()}` : "/dashboard"
      })

      if (result?.error) {
        const errorMessage = result.error === "OAuthAccountNotLinked" 
          ? "This account is already associated with another sign-in method."
          : "Authentication failed. Please try again."
        
        setError(errorMessage)
        if (onError) onError(errorMessage)
        
        toast({
          title: "Authentication Error",
          description: errorMessage,
          variant: "destructive"
        })
      } else if (result?.ok) {
        toast({
          title: "Success!",
          description: `Successfully ${mode === "link" ? "linked" : "signed in"} with ${providerId}.`
        })
        
        if (onSuccess) onSuccess()
      }
    } catch (err) {
      const errorMessage = "An unexpected error occurred. Please try again."
      setError(errorMessage)
      if (onError) onError(errorMessage)
      
      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoadingProvider(null)
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {showDivider && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or {getActionText().toLowerCase()}
            </span>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        {socialProviders.map((provider) => {
          const IconComponent = provider.icon
          const isLoading = loadingProvider === provider.id

          return (
            <Button
              key={provider.id}
              variant="outline"
              className={cn(
                "w-full relative",
                provider.bgColor,
                provider.textColor,
                provider.hoverBg,
                "border border-gray-300 transition-colors"
              )}
              onClick={() => handleSocialAuth(provider.id)}
              disabled={!!loadingProvider}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IconComponent className="mr-2 h-4 w-4" />
              )}
              {getActionText()} {provider.name}
            </Button>
          )
        })}
      </div>

      {mode === "link" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Linking social accounts allows you to sign in using multiple methods while keeping all your data in one place.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

interface SocialAccountLinkingProps {
  linkedAccounts?: Array<{
    provider: string
    email: string
    linkedAt: Date
  }>
  onLink?: (provider: string) => void
  onUnlink?: (provider: string) => void
}

export const SocialAccountLinking: React.FC<SocialAccountLinkingProps> = ({
  linkedAccounts = [],
  onLink,
  onUnlink
}) => {
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null)
  const { toast } = useToast()

  const handleUnlinkAccount = async (provider: string) => {
    try {
      setUnlinkingProvider(provider)
      
      // This would typically make an API call to unlink the account
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (onUnlink) onUnlink(provider)
      
      toast({
        title: "Account Unlinked",
        description: `Successfully unlinked your ${provider} account.`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unlink account. Please try again.",
        variant: "destructive"
      })
    } finally {
      setUnlinkingProvider(null)
    }
  }

  const isAccountLinked = (providerId: string) => {
    return linkedAccounts.some(account => account.provider === providerId)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <CardDescription>
          Manage your social media connections for easy sign-in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {socialProviders.map((provider) => {
          const IconComponent = provider.icon
          const isLinked = isAccountLinked(provider.id)
          const linkedAccount = linkedAccounts.find(acc => acc.provider === provider.id)
          const isUnlinking = unlinkingProvider === provider.id

          return (
            <div
              key={provider.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "p-2 rounded",
                  provider.bgColor,
                  provider.textColor
                )}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{provider.name}</p>
                  {isLinked && linkedAccount ? (
                    <p className="text-xs text-muted-foreground">
                      Connected as {linkedAccount.email}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Not connected
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {isLinked ? (
                  <>
                    <Badge variant="secondary">Connected</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnlinkAccount(provider.id)}
                      disabled={isUnlinking}
                    >
                      {isUnlinking ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Unlink"
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onLink?.(provider.id)}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          )
        })}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            We recommend connecting at least one social account as a backup sign-in method.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

interface RoleSelectionProps {
  onRoleSelect: (role: "ACTOR" | "CASTING_DIRECTOR" | "PRODUCER") => void
  selectedRole?: string
  isLoading?: boolean
}

export const RoleSelection: React.FC<RoleSelectionProps> = ({
  onRoleSelect,
  selectedRole,
  isLoading = false
}) => {
  const roles = [
    {
      id: "ACTOR" as const,
      name: "Actor",
      description: "Create your portfolio and find audition opportunities",
      features: ["Portfolio management", "Audition applications", "Career tracking"]
    },
    {
      id: "CASTING_DIRECTOR" as const,
      name: "Casting Director",
      description: "Discover talent and manage casting projects",
      features: ["Talent search", "Project management", "Audition scheduling"]
    },
    {
      id: "PRODUCER" as const,
      name: "Producer",
      description: "Manage productions and track budgets",
      features: ["Budget tracking", "Team coordination", "Project oversight"]
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose Your Role</CardTitle>
        <CardDescription>
          Select your primary role to customize your experience
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className={cn(
                "p-4 border rounded-lg cursor-pointer transition-colors",
                selectedRole === role.id 
                  ? "border-primary bg-primary/5" 
                  : "border-gray-200 hover:border-gray-300"
              )}
              onClick={() => onRoleSelect(role.id)}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{role.name}</h3>
                  {selectedRole === role.id && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {role.description}
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {role.features.map((feature, index) => (
                    <li key={index}>• {feature}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {selectedRole && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              You can change your role later in account settings if needed.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}