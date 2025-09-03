"use client"

import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ProfileEditForm } from "@/components/profile/ProfileEditForm"
import { AvatarUpload } from "@/components/profile/AvatarUpload"
import { SecuritySettings } from "@/components/profile/SecuritySettings"
import { AccountPreferences } from "@/components/profile/AccountPreferences"
import { SocialAccountLinking } from "@/components/auth/SocialAuthButtons"
import { 
  User, Shield, Settings, Link, AlertCircle, CheckCircle2, 
  Save, Eye, Download, Clock, Star
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface ProfileData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  dateOfBirth?: string
  gender?: "male" | "female" | "other" | "prefer_not_to_say"
  bio?: string
  location?: string
  website?: string
  experience?: string
  skills?: string[]
  languages?: string[]
  height?: string
  weight?: string
  eyeColor?: string
  hairColor?: string
  ethnicity?: string
  avatar?: string
  role: "ACTOR" | "CASTING_DIRECTOR" | "PRODUCER" | "ADMIN"
  verificationStatus: "Verified" | "Unverified" | "Under Review"
  profileCompleteness: number
  joinDate: Date
  lastLogin: Date
}

interface SecurityData {
  lastPasswordChange?: Date
  has2FA: boolean
  recentSessions: Array<{
    id: string
    device: string
    location: string
    lastActive: Date
    current?: boolean
  }>
}

interface LinkedAccount {
  provider: string
  email: string
  linkedAt: Date
}

const ProfileManagementPage: React.FC = () => {
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState("profile")
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [securityData, setSecurityData] = useState<SecurityData | null>(null)
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    redirect("/auth/login")
  }

  // Mock data loading - replace with actual API calls
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        setIsLoading(true)
        
        // Simulate API calls
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Mock profile data
        const mockProfileData: ProfileData = {
          id: "user-123",
          firstName: "John",
          lastName: "Doe",
          email: session?.user?.email || "user@example.com",
          phone: "+91 98765 43210",
          dateOfBirth: "1990-05-15",
          gender: "male",
          bio: "Passionate actor with 5 years of experience in theater and film.",
          location: "Mumbai, Maharashtra",
          website: "https://johndoe-actor.com",
          experience: "intermediate",
          skills: ["Acting", "Dancing", "Singing"],
          languages: ["Hindi", "English", "Marathi"],
          height: "175",
          weight: "70",
          eyeColor: "brown",
          hairColor: "black",
          ethnicity: "south_asian",
          avatar: session?.user?.image || undefined,
          role: "ACTOR",
          verificationStatus: "Under Review",
          profileCompleteness: 75,
          joinDate: new Date("2023-01-15"),
          lastLogin: new Date()
        }

        const mockSecurityData: SecurityData = {
          lastPasswordChange: new Date("2023-10-15"),
          has2FA: false,
          recentSessions: [
            {
              id: "session-1",
              device: "Chrome on Windows",
              location: "Mumbai, India",
              lastActive: new Date(),
              current: true
            },
            {
              id: "session-2",
              device: "Safari on iPhone",
              location: "Mumbai, India",
              lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000)
            }
          ]
        }

        const mockLinkedAccounts: LinkedAccount[] = [
          {
            provider: "google",
            email: session?.user?.email || "user@gmail.com",
            linkedAt: new Date("2023-01-15")
          }
        ]

        setProfileData(mockProfileData)
        setSecurityData(mockSecurityData)
        setLinkedAccounts(mockLinkedAccounts)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load profile data. Please refresh the page.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (status === "authenticated") {
      loadProfileData()
    }
  }, [status, session, toast])

  const handleProfileUpdate = async (data: any) => {
    setIsSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update local state
      if (profileData) {
        setProfileData({ ...profileData, ...data })
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      })
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (file: File, croppedImage: string) => {
    try {
      // Simulate upload
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      if (profileData) {
        setProfileData({ ...profileData, avatar: croppedImage })
      }

      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to update avatar. Please try again.",
        variant: "destructive"
      })
      throw error
    }
  }

  const handlePasswordChange = async (data: any) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (securityData) {
        setSecurityData({
          ...securityData,
          lastPasswordChange: new Date()
        })
      }

      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive"
      })
      throw error
    }
  }

  const handle2FAToggle = async (enabled: boolean, code?: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (securityData) {
        setSecurityData({ ...securityData, has2FA: enabled })
      }

      toast({
        title: enabled ? "2FA Enabled" : "2FA Disabled",
        description: `Two-factor authentication has been ${enabled ? "enabled" : "disabled"}.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update 2FA settings. Please try again.",
        variant: "destructive"
      })
      throw error
    }
  }

  const handleSessionRevoke = async (sessionId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      if (securityData) {
        setSecurityData({
          ...securityData,
          recentSessions: securityData.recentSessions.filter(s => s.id !== sessionId)
        })
      }

      toast({
        title: "Session Revoked",
        description: "The session has been successfully terminated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke session. Please try again.",
        variant: "destructive"
      })
      throw error
    }
  }

  const handlePreferencesSave = async (preferences: any) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: "Preferences Saved",
        description: "Your account preferences have been updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive"
      })
      throw error
    }
  }

  const handleLinkAccount = async (provider: string) => {
    try {
      // This would redirect to OAuth flow
      toast({
        title: "Redirecting",
        description: `Redirecting to ${provider} to link your account...`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate account linking. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleUnlinkAccount = async (provider: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setLinkedAccounts(prev => prev.filter(acc => acc.provider !== provider))
      
      toast({
        title: "Account Unlinked",
        description: `Your ${provider} account has been unlinked.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unlink account. Please try again.",
        variant: "destructive"
      })
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Profile</AlertTitle>
          <AlertDescription>
            Unable to load your profile data. Please refresh the page or contact support.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Profile Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage your profile, security settings, and account preferences
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                profileData.verificationStatus === "Verified" ? "default" :
                profileData.verificationStatus === "Under Review" ? "secondary" :
                "outline"
              }
              className="flex items-center gap-1"
            >
              {profileData.verificationStatus === "Verified" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : profileData.verificationStatus === "Under Review" ? (
                <Clock className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              {profileData.verificationStatus}
            </Badge>
            <Badge variant="outline">
              {profileData.role.replace("_", " ")}
            </Badge>
          </div>
        </div>

        {/* Profile Completion Alert */}
        {profileData.profileCompleteness < 100 && (
          <Alert>
            <Star className="h-4 w-4" />
            <AlertTitle>Complete Your Profile</AlertTitle>
            <AlertDescription>
              Your profile is {profileData.profileCompleteness}% complete. Complete your profile to improve your visibility.
            </AlertDescription>
            <Progress value={profileData.profileCompleteness} className="mt-2 h-2" />
          </Alert>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("profile")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Profile Info</p>
                <p className="text-xs text-muted-foreground">Update details</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("security")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Security</p>
                <p className="text-xs text-muted-foreground">{securityData?.has2FA ? "2FA Active" : "Enable 2FA"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("preferences")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Settings className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Preferences</p>
                <p className="text-xs text-muted-foreground">Customize experience</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("accounts")}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Link className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Linked Accounts</p>
                <p className="text-xs text-muted-foreground">{linkedAccounts.length} connected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Accounts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <AvatarUpload
                currentAvatar={profileData.avatar}
                userName={`${profileData.firstName} ${profileData.lastName}`}
                onUpload={handleAvatarUpload}
              />
            </div>
            <div className="md:col-span-2">
              <ProfileEditForm
                initialData={profileData}
                userRole={profileData.role}
                onSubmit={handleProfileUpdate}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <SecuritySettings
            userEmail={profileData.email}
            has2FA={securityData?.has2FA}
            lastPasswordChange={securityData?.lastPasswordChange}
            recentSessions={securityData?.recentSessions}
            onPasswordChange={handlePasswordChange}
            on2FAToggle={handle2FAToggle}
            onSessionRevoke={handleSessionRevoke}
          />
        </TabsContent>

        <TabsContent value="preferences">
          <AccountPreferences
            userRole={profileData.role}
            onSave={handlePreferencesSave}
          />
        </TabsContent>

        <TabsContent value="accounts">
          <SocialAccountLinking
            linkedAccounts={linkedAccounts}
            onLink={handleLinkAccount}
            onUnlink={handleUnlinkAccount}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ProfileManagementPage