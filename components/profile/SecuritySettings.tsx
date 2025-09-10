"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Shield, Lock, Key, Smartphone, AlertTriangle, CheckCircle2, Eye, EyeOff, Mail, History, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

// Password validation schema
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type PasswordFormData = z.infer<typeof passwordSchema>

interface SecuritySettingsProps {
  userEmail?: string
  has2FA?: boolean
  lastPasswordChange?: Date
  recentSessions?: Array<{
    id: string
    device: string
    location: string
    lastActive: Date
    current?: boolean
  }>
  onPasswordChange?: (data: PasswordFormData) => Promise<void>
  on2FAToggle?: (enabled: boolean, code?: string) => Promise<void>
  onSessionRevoke?: (sessionId: string) => Promise<void>
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  userEmail = "user@example.com",
  has2FA = false,
  lastPasswordChange,
  recentSessions = [],
  onPasswordChange,
  on2FAToggle,
  onSessionRevoke
}) => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [is2FADialogOpen, setIs2FADialogOpen] = useState(false)
  const [twoFACode, setTwoFACode] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema)
  })

  const newPassword = watch("newPassword")

  // Calculate password strength
  React.useEffect(() => {
    if (!newPassword) {
      setPasswordStrength(0)
      return
    }

    let strength = 0
    if (newPassword.length >= 8) strength += 20
    if (newPassword.length >= 12) strength += 20
    if (/[A-Z]/.test(newPassword)) strength += 20
    if (/[a-z]/.test(newPassword)) strength += 20
    if (/[0-9]/.test(newPassword)) strength += 10
    if (/[^A-Za-z0-9]/.test(newPassword)) strength += 10

    setPasswordStrength(strength)
  }, [newPassword])

  const getPasswordStrengthLabel = () => {
    if (passwordStrength < 30) return { label: "Weak", color: "text-red-500" }
    if (passwordStrength < 60) return { label: "Fair", color: "text-yellow-500" }
    if (passwordStrength < 80) return { label: "Good", color: "text-blue-500" }
    return { label: "Strong", color: "text-green-500" }
  }

  const onSubmitPassword = async (data: PasswordFormData) => {
    setIsChangingPassword(true)
    try {
      if (onPasswordChange) {
        await onPasswordChange(data)
        toast({
          title: "Password Updated",
          description: "Your password has been successfully changed.",
        })
        reset()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handle2FAToggle = async (enabled: boolean) => {
    if (enabled) {
      setIs2FADialogOpen(true)
    } else {
      // Disable 2FA
      try {
        if (on2FAToggle) {
          await on2FAToggle(false)
          toast({
            title: "2FA Disabled",
            description: "Two-factor authentication has been disabled.",
          })
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to disable 2FA. Please try again.",
          variant: "destructive"
        })
      }
    }
  }

  const confirm2FASetup = async () => {
    if (!twoFACode || twoFACode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit code.",
        variant: "destructive"
      })
      return
    }

    try {
      if (on2FAToggle) {
        await on2FAToggle(true, twoFACode)
        toast({
          title: "2FA Enabled",
          description: "Two-factor authentication has been enabled successfully.",
        })
        setIs2FADialogOpen(false)
        setTwoFACode("")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enable 2FA. Please check the code and try again.",
        variant: "destructive"
      })
    }
  }

  const handleSessionRevoke = async (sessionId: string) => {
    try {
      if (onSessionRevoke) {
        await onSessionRevoke(sessionId)
        toast({
          title: "Session Revoked",
          description: "The session has been successfully terminated.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke session. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Ensure your account stays secure with a strong password
            {lastPasswordChange && (
              <span className="block mt-1 text-xs">
                Last changed: {lastPasswordChange.toLocaleDateString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  {...register("currentPassword")}
                  aria-invalid={!!errors.currentPassword}
                  aria-describedby={errors.currentPassword ? "current-password-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p id="current-password-error" className="text-sm text-destructive">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  {...register("newPassword")}
                  aria-invalid={!!errors.newPassword}
                  aria-describedby={errors.newPassword ? "new-password-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPassword && (
                <div className="space-y-2">
                  <Progress value={passwordStrength} className="h-2" />
                  <p className={`text-sm ${getPasswordStrengthLabel().color}`}>
                    Password strength: {getPasswordStrengthLabel().label}
                  </p>
                </div>
              )}
              {errors.newPassword && (
                <p id="new-password-error" className="text-sm text-destructive">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirmPassword")}
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="confirm-password-error" className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={isChangingPassword}>
              {isChangingPassword ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Enable 2FA</div>
              <div className="text-sm text-muted-foreground">
                Require authentication code for login
              </div>
            </div>
            <Switch
              checked={has2FA}
              onCheckedChange={handle2FAToggle}
              aria-label="Toggle two-factor authentication"
            />
          </div>

          {has2FA && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>2FA is Active</AlertTitle>
              <AlertDescription>
                Your account is protected with two-factor authentication
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Recovery Options</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Recovery Email</div>
                    <div className="text-xs text-muted-foreground">{userEmail}</div>
                  </div>
                </div>
                <Badge variant="secondary">Verified</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            Manage devices where you're currently logged in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active sessions found</p>
            ) : (
              recentSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{session.device}</span>
                      {session.current && (
                        <Badge variant="default" className="text-xs">Current</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session.location} • Last active: {session.lastActive.toLocaleString()}
                    </div>
                  </div>
                  {!session.current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSessionRevoke(session.id)}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Security Tip</AlertTitle>
            <AlertDescription>
              If you see any unfamiliar sessions, revoke them immediately and change your password
            </AlertDescription>
          </Alert>
        </CardFooter>
      </Card>

      {/* 2FA Setup Dialog */}
      <Dialog open={is2FADialogOpen} onOpenChange={setIs2FADialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app and enter the code below
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* QR Code Placeholder */}
            <div className="flex justify-center p-4 bg-muted rounded-lg">
              <div className="h-32 w-32 bg-black/10 rounded flex items-center justify-center">
                <Key className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="2fa-code">Verification Code</Label>
              <Input
                id="2fa-code"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-lg tracking-wider"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIs2FADialogOpen(false)
              setTwoFACode("")
            }}>
              Cancel
            </Button>
            <Button onClick={confirm2FASetup}>
              Enable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}