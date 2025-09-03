"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { notificationPreferencesSchema, type NotificationPreferencesFormData } from "@/lib/validations/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  Calendar, 
  Users, 
  Briefcase,
  TrendingUp,
  Clock,
  Info,
  Save,
  Loader2,
  BellOff,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface NotificationPreferencesProps {
  initialData?: Partial<NotificationPreferencesFormData>;
  onSave: (data: NotificationPreferencesFormData) => Promise<void>;
}

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  initialData,
  onSave,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const {
    watch,
    setValue,
    handleSubmit,
    formState: { isDirty },
  } = useForm<NotificationPreferencesFormData>({
    resolver: zodResolver(notificationPreferencesSchema),
    defaultValues: initialData || {
      emailNotifications: {
        newAudition: true,
        auditionUpdate: true,
        profileView: true,
        teamInvite: true,
        weeklyDigest: true,
      },
      pushNotifications: {
        enabled: true,
        newAudition: true,
        auditionReminder: true,
        messages: true,
      },
      smsNotifications: {
        enabled: false,
        urgentUpdates: false,
        auditionReminder: false,
      },
    },
  });

  const emailNotifications = watch("emailNotifications");
  const pushNotifications = watch("pushNotifications");
  const smsNotifications = watch("smsNotifications");

  const handleSave = async (data: NotificationPreferencesFormData) => {
    setIsSaving(true);
    try {
      await onSave(data);
      toast({
        title: "Preferences Saved",
        description: "Your notification preferences have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to update notification preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const notificationCategories = {
    email: [
      {
        key: "newAudition",
        label: "New Audition Opportunities",
        description: "Get notified about new auditions matching your profile",
        icon: Briefcase,
      },
      {
        key: "auditionUpdate",
        label: "Audition Updates",
        description: "Updates on your audition applications and status changes",
        icon: TrendingUp,
      },
      {
        key: "profileView",
        label: "Profile Views",
        description: "When casting directors view your profile",
        icon: Users,
      },
      {
        key: "teamInvite",
        label: "Team Invitations",
        description: "Invitations to join production teams or projects",
        icon: Users,
      },
      {
        key: "weeklyDigest",
        label: "Weekly Digest",
        description: "Summary of your weekly activity and opportunities",
        icon: Calendar,
      },
    ],
    push: [
      {
        key: "newAudition",
        label: "New Auditions",
        description: "Instant alerts for matching auditions",
        icon: Briefcase,
      },
      {
        key: "auditionReminder",
        label: "Audition Reminders",
        description: "Reminders for upcoming auditions",
        icon: Clock,
      },
      {
        key: "messages",
        label: "Direct Messages",
        description: "New messages from casting directors",
        icon: MessageSquare,
      },
    ],
    sms: [
      {
        key: "urgentUpdates",
        label: "Urgent Updates",
        description: "Critical updates requiring immediate attention",
        icon: Info,
      },
      {
        key: "auditionReminder",
        label: "Audition Reminders",
        description: "SMS reminders for auditions within 24 hours",
        icon: Clock,
      },
    ],
  };

  const getActiveCount = (category: any) => {
    return Object.values(category).filter((value) => value === true).length;
  };

  return (
    <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
            <Badge variant="secondary" className="ml-1">
              {getActiveCount(emailNotifications)}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="push" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Push</span>
            <Badge variant="secondary" className="ml-1">
              {pushNotifications.enabled ? getActiveCount(pushNotifications) - 1 : 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">SMS</span>
            <Badge variant="secondary" className="ml-1">
              {smsNotifications.enabled ? getActiveCount(smsNotifications) - 1 : 0}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Choose which emails you want to receive from CastMatch
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationCategories.email.map((notification) => {
                const Icon = notification.icon;
                return (
                  <div
                    key={notification.key}
                    className="flex items-start justify-between space-x-4 rounded-lg border p-4"
                  >
                    <div className="flex gap-3">
                      <div className="mt-1">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor={`email-${notification.key}`}
                          className="font-medium cursor-pointer"
                        >
                          {notification.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {notification.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id={`email-${notification.key}`}
                      checked={emailNotifications[notification.key as keyof typeof emailNotifications]}
                      onCheckedChange={(checked) =>
                        setValue(`emailNotifications.${notification.key as keyof typeof emailNotifications}`, checked, { shouldDirty: true })
                      }
                    />
                  </div>
                );
              })}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  We'll always send you important account and security emails regardless of your preferences.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="push" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Push Notifications
              </CardTitle>
              <CardDescription>
                Real-time notifications on your device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-accent/50 p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="push-enabled" className="font-medium">
                    Enable Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow CastMatch to send you push notifications
                  </p>
                </div>
                <Switch
                  id="push-enabled"
                  checked={pushNotifications.enabled}
                  onCheckedChange={(checked) =>
                    setValue("pushNotifications.enabled", checked, { shouldDirty: true })
                  }
                />
              </div>

              {pushNotifications.enabled ? (
                <>
                  {notificationCategories.push.map((notification) => {
                    const Icon = notification.icon;
                    return (
                      <div
                        key={notification.key}
                        className="flex items-start justify-between space-x-4 rounded-lg border p-4"
                      >
                        <div className="flex gap-3">
                          <div className="mt-1">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="space-y-1">
                            <Label
                              htmlFor={`push-${notification.key}`}
                              className="font-medium cursor-pointer"
                            >
                              {notification.label}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {notification.description}
                            </p>
                          </div>
                        </div>
                        <Switch
                          id={`push-${notification.key}`}
                          checked={pushNotifications[notification.key as keyof typeof pushNotifications] as boolean}
                          onCheckedChange={(checked) =>
                            setValue(`pushNotifications.${notification.key as keyof typeof pushNotifications}`, checked, { shouldDirty: true })
                          }
                        />
                      </div>
                    );
                  })}
                </>
              ) : (
                <Alert>
                  <BellOff className="h-4 w-4" />
                  <AlertDescription>
                    Push notifications are disabled. Enable them to receive real-time updates.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                SMS Notifications
              </CardTitle>
              <CardDescription>
                Text message notifications for urgent updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-accent/50 p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-enabled" className="font-medium">
                    Enable SMS Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive text messages for critical updates
                  </p>
                </div>
                <Switch
                  id="sms-enabled"
                  checked={smsNotifications.enabled}
                  onCheckedChange={(checked) =>
                    setValue("smsNotifications.enabled", checked, { shouldDirty: true })
                  }
                />
              </div>

              {smsNotifications.enabled ? (
                <>
                  {notificationCategories.sms.map((notification) => {
                    const Icon = notification.icon;
                    return (
                      <div
                        key={notification.key}
                        className="flex items-start justify-between space-x-4 rounded-lg border p-4"
                      >
                        <div className="flex gap-3">
                          <div className="mt-1">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="space-y-1">
                            <Label
                              htmlFor={`sms-${notification.key}`}
                              className="font-medium cursor-pointer"
                            >
                              {notification.label}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {notification.description}
                            </p>
                          </div>
                        </div>
                        <Switch
                          id={`sms-${notification.key}`}
                          checked={smsNotifications[notification.key as keyof typeof smsNotifications] as boolean}
                          onCheckedChange={(checked) =>
                            setValue(`smsNotifications.${notification.key as keyof typeof smsNotifications}`, checked, { shouldDirty: true })
                          }
                        />
                      </div>
                    );
                  })}

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Standard messaging rates may apply. We limit SMS to urgent notifications only.
                    </AlertDescription>
                  </Alert>
                </>
              ) : (
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription>
                    SMS notifications are disabled. Enable them to receive urgent updates via text.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          disabled={!isDirty || isSaving}
          onClick={() => window.location.reload()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving || !isDirty}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </form>
  );
};