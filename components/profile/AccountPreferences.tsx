"use client"

import React, { useState } from "react"
import { 
  Bell, Mail, MessageSquare, Shield, Globe, Palette, Volume2, 
  Eye, Download, Trash2, Settings, Moon, Sun, Monitor,
  Smartphone, Clock, AlertCircle, CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface NotificationSetting {
  id: string
  label: string
  description: string
  enabled: boolean
  channels: {
    email: boolean
    push: boolean
    inApp: boolean
  }
}

interface PrivacySetting {
  id: string
  label: string
  description: string
  value: "public" | "private" | "connections"
}

interface AccountPreferencesProps {
  userRole?: "ACTOR" | "CASTING_DIRECTOR" | "PRODUCER" | "ADMIN"
  currentTheme?: "light" | "dark" | "system"
  currentLanguage?: string
  currentTimezone?: string
  notifications?: NotificationSetting[]
  privacySettings?: PrivacySetting[]
  onSave?: (preferences: any) => Promise<void>
}

export const AccountPreferences: React.FC<AccountPreferencesProps> = ({
  userRole = "ACTOR",
  currentTheme = "system",
  currentLanguage = "en",
  currentTimezone = "America/New_York",
  notifications = [],
  privacySettings = [],
  onSave
}) => {
  const [theme, setTheme] = useState(currentTheme)
  const [language, setLanguage] = useState(currentLanguage)
  const [timezone, setTimezone] = useState(currentTimezone)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>(notifications)
  const [privacy, setPrivacy] = useState<PrivacySetting[]>(privacySettings)
  const [isDataExporting, setIsDataExporting] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [volumeLevel, setVolumeLevel] = useState([70])
  const [autoSave, setAutoSave] = useState(true)
  const [showSensitiveContent, setShowSensitiveContent] = useState(false)

  const { toast } = useToast()

  // Default notification settings if none provided
  const defaultNotifications: NotificationSetting[] = [
    {
      id: "new_messages",
      label: "New Messages",
      description: "When you receive a new direct message",
      enabled: true,
      channels: { email: true, push: true, inApp: true }
    },
    {
      id: "audition_updates",
      label: "Audition Updates",
      description: "Changes to audition schedules and results",
      enabled: true,
      channels: { email: true, push: true, inApp: true }
    },
    {
      id: "application_status",
      label: "Application Status",
      description: "Updates on your role applications",
      enabled: true,
      channels: { email: true, push: false, inApp: true }
    },
    {
      id: "project_invitations",
      label: "Project Invitations",
      description: "When you're invited to join a project",
      enabled: true,
      channels: { email: true, push: true, inApp: true }
    },
    {
      id: "system_updates",
      label: "System Updates",
      description: "Platform updates and maintenance notifications",
      enabled: false,
      channels: { email: true, push: false, inApp: true }
    },
    {
      id: "marketing",
      label: "Marketing Communications",
      description: "News, tips, and promotional content",
      enabled: false,
      channels: { email: true, push: false, inApp: false }
    }
  ]

  // Default privacy settings if none provided
  const defaultPrivacy: PrivacySetting[] = [
    {
      id: "profile_visibility",
      label: "Profile Visibility",
      description: "Who can view your complete profile",
      value: "public"
    },
    {
      id: "contact_info",
      label: "Contact Information",
      description: "Who can see your email and phone number",
      value: "connections"
    },
    {
      id: "portfolio_access",
      label: "Portfolio Access",
      description: "Who can view your portfolio and media",
      value: "public"
    },
    {
      id: "activity_status",
      label: "Activity Status",
      description: "Show when you're online or last active",
      value: "connections"
    }
  ]

  const currentNotifications = notificationSettings.length > 0 ? notificationSettings : defaultNotifications
  const currentPrivacy = privacy.length > 0 ? privacy : defaultPrivacy

  const updateNotificationSetting = (id: string, field: string, value: boolean) => {
    setNotificationSettings(prev => 
      prev.map(setting => 
        setting.id === id 
          ? { 
              ...setting, 
              ...(field === "enabled" 
                ? { enabled: value }
                : { channels: { ...setting.channels, [field]: value } }
              )
            }
          : setting
      )
    )
  }

  const updatePrivacySetting = (id: string, value: "public" | "private" | "connections") => {
    setPrivacy(prev => 
      prev.map(setting => 
        setting.id === id ? { ...setting, value } : setting
      )
    )
  }

  const handleSavePreferences = async () => {
    try {
      const preferences = {
        theme,
        language,
        timezone,
        notifications: currentNotifications,
        privacy: currentPrivacy,
        volumeLevel: volumeLevel[0],
        autoSave,
        showSensitiveContent
      }

      if (onSave) {
        await onSave(preferences)
      }

      toast({
        title: "Preferences Updated",
        description: "Your account preferences have been saved successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleExportData = async () => {
    setIsDataExporting(true)
    try {
      // Simulate data export
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast({
        title: "Data Export Started",
        description: "You'll receive an email with your data export within 24 hours.",
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export your data. Please try again later.",
        variant: "destructive"
      })
    } finally {
      setIsDataExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true)
    try {
      // This would typically open a confirmation dialog first
      toast({
        title: "Account Deletion",
        description: "Please contact support to complete account deletion.",
        variant: "destructive"
      })
    } finally {
      setIsDeletingAccount(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Preferences</h1>
          <p className="text-muted-foreground mt-1">
            Customize your experience and manage your account settings
          </p>
        </div>
        <Button onClick={handleSavePreferences}>
          <Settings className="h-4 w-4 mr-2" />
          Save Preferences
        </Button>
      </div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          <TabsTrigger value="data">Data & Security</TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how and when you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentNotifications.map((notification) => (
                <div key={notification.id} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">{notification.label}</Label>
                        <Switch
                          checked={notification.enabled}
                          onCheckedChange={(checked) => 
                            updateNotificationSetting(notification.id, "enabled", checked)
                          }
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.description}
                      </p>
                    </div>
                  </div>
                  
                  {notification.enabled && (
                    <div className="ml-4 pl-4 border-l-2 border-muted">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Delivery methods:</p>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={notification.channels.email}
                              onChange={(e) => 
                                updateNotificationSetting(notification.id, "email", e.target.checked)
                              }
                              className="rounded"
                            />
                            <Mail className="h-3 w-3" />
                            Email
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={notification.channels.push}
                              onChange={(e) => 
                                updateNotificationSetting(notification.id, "push", e.target.checked)
                              }
                              className="rounded"
                            />
                            <Smartphone className="h-3 w-3" />
                            Push
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={notification.channels.inApp}
                              onChange={(e) => 
                                updateNotificationSetting(notification.id, "inApp", e.target.checked)
                              }
                              className="rounded"
                            />
                            <Bell className="h-3 w-3" />
                            In-app
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                  <Separator />
                </div>
              ))}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Notification Delivery</AlertTitle>
                <AlertDescription>
                  Email notifications may take a few minutes to arrive. Push notifications require browser permission.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy Settings
              </CardTitle>
              <CardDescription>
                Control who can see your information and activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentPrivacy.map((setting) => (
                <div key={setting.id} className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">{setting.label}</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {setting.description}
                    </p>
                  </div>
                  
                  <RadioGroup
                    value={setting.value}
                    onValueChange={(value) => 
                      updatePrivacySetting(setting.id, value as "public" | "private" | "connections")
                    }
                    className="ml-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="public" id={`${setting.id}-public`} />
                      <Label htmlFor={`${setting.id}-public`} className="text-sm">
                        Public - Everyone can see this
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="connections" id={`${setting.id}-connections`} />
                      <Label htmlFor={`${setting.id}-connections`} className="text-sm">
                        Connections only - Only people you're connected with
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="private" id={`${setting.id}-private`} />
                      <Label htmlFor={`${setting.id}-private`} className="text-sm">
                        Private - Only you can see this
                      </Label>
                    </div>
                  </RadioGroup>
                  <Separator />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Theme Preferences
                </CardTitle>
                <CardDescription>
                  Customize the look and feel of the interface
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Color Theme</Label>
                  <RadioGroup value={theme} onValueChange={setTheme}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="light" id="theme-light" />
                      <Label htmlFor="theme-light" className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Light
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dark" id="theme-dark" />
                      <Label htmlFor="theme-dark" className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Dark
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="system" id="theme-system" />
                      <Label htmlFor="theme-system" className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        System
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
                      <SelectItem value="mr">Marathi (मराठी)</SelectItem>
                      <SelectItem value="ta">Tamil (தமிழ்)</SelectItem>
                      <SelectItem value="te">Telugu (తెలుగు)</SelectItem>
                      <SelectItem value="bn">Bengali (বাংলা)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">India Standard Time (IST)</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time (EST/EDT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PST/PDT)</SelectItem>
                      <SelectItem value="Europe/London">Greenwich Mean Time (GMT)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Japan Standard Time (JST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interface Preferences</CardTitle>
                <CardDescription>
                  Additional customization options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Auto-save changes</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically save form changes
                    </p>
                  </div>
                  <Switch checked={autoSave} onCheckedChange={setAutoSave} />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Sound Volume</Label>
                  <div className="flex items-center space-x-3">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <Slider
                      value={volumeLevel}
                      onValueChange={setVolumeLevel}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-8">{volumeLevel[0]}%</span>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Show sensitive content</Label>
                    <p className="text-sm text-muted-foreground">
                      Display content warnings and filters
                    </p>
                  </div>
                  <Switch 
                    checked={showSensitiveContent} 
                    onCheckedChange={setShowSensitiveContent} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Accessibility Tab */}
        <TabsContent value="accessibility" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Accessibility Options
              </CardTitle>
              <CardDescription>
                Settings to improve accessibility and usability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Accessibility Features</AlertTitle>
                <AlertDescription>
                  These features are designed to make the platform more accessible. Browser settings may override some preferences.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">High contrast mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Increase contrast for better visibility
                    </p>
                  </div>
                  <Switch />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Reduce motion</Label>
                    <p className="text-sm text-muted-foreground">
                      Minimize animations and transitions
                    </p>
                  </div>
                  <Switch />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Screen reader support</Label>
                    <p className="text-sm text-muted-foreground">
                      Enhanced support for screen reading software
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Keyboard navigation</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable enhanced keyboard shortcuts
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data & Security Tab */}
        <TabsContent value="data" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Data Export
                </CardTitle>
                <CardDescription>
                  Download a copy of your data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Get a copy of all your data including profile information, messages, 
                  applications, and activity history.
                </p>
                
                <Button 
                  onClick={handleExportData} 
                  disabled={isDataExporting}
                  variant="outline"
                  className="w-full"
                >
                  {isDataExporting ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Preparing Export...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Request Data Export
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground">
                  Data exports are typically ready within 24 hours and will be sent to your email address.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Account Deletion
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Warning: This action is irreversible</AlertTitle>
                  <AlertDescription>
                    Deleting your account will permanently remove all your data, 
                    including profile, messages, applications, and media files.
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  variant="destructive"
                  className="w-full"
                >
                  {isDeletingAccount ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Data & Privacy Information</CardTitle>
              <CardDescription>
                Learn about how we handle your information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <p>
                  <strong>Data Collection:</strong> We collect information you provide directly, 
                  usage data, and data from third-party integrations to provide our services.
                </p>
                <p>
                  <strong>Data Usage:</strong> Your data is used to provide platform features, 
                  improve our services, and communicate with you about your account.
                </p>
                <p>
                  <strong>Data Sharing:</strong> We don't sell your personal data. We may share 
                  data with service providers who help us operate the platform.
                </p>
                <p>
                  <strong>Your Rights:</strong> You can access, update, download, or delete your 
                  data at any time through these settings or by contacting support.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}