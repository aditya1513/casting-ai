"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Eye, 
  Lock, 
  Cookie, 
  Mail, 
  Bell, 
  Users, 
  BarChart3, 
  CheckCircle, 
  Info,
  ArrowRight 
} from "lucide-react";

interface ConsentOption {
  id: string;
  title: string;
  description: string;
  required: boolean;
  icon: React.ComponentType<{ className?: string }>;
  details?: string[];
}

interface PrivacyConsentProps {
  onAccept: (consents: Record<string, boolean>) => void;
  onDecline: () => void;
  userEmail?: string;
}

const consentOptions: ConsentOption[] = [
  {
    id: "essential",
    title: "Essential Cookies & Data Processing",
    description: "Required for the platform to function properly and securely",
    required: true,
    icon: Lock,
    details: [
      "User authentication and session management",
      "Security features and fraud prevention", 
      "Basic functionality and core services",
      "Legal compliance and data protection"
    ]
  },
  {
    id: "functional",
    title: "Functional Cookies",
    description: "Enhance your experience with personalized features",
    required: false,
    icon: Eye,
    details: [
      "Remember your preferences and settings",
      "Customize dashboard layout and content",
      "Save search filters and favorite profiles",
      "Maintain language and region preferences"
    ]
  },
  {
    id: "analytics",
    title: "Analytics & Performance",
    description: "Help us improve the platform with usage insights",
    required: false,
    icon: BarChart3,
    details: [
      "Understand how users interact with features",
      "Identify popular content and services",
      "Monitor performance and detect issues",
      "Generate anonymized usage statistics"
    ]
  },
  {
    id: "marketing",
    title: "Marketing Communications",
    description: "Receive updates about new features and opportunities",
    required: false,
    icon: Mail,
    details: [
      "Email newsletters about industry trends",
      "Notifications about new casting opportunities",
      "Product updates and feature announcements",
      "Personalized recommendations and tips"
    ]
  },
  {
    id: "social",
    title: "Social Features",
    description: "Enable social interactions and profile sharing",
    required: false,
    icon: Users,
    details: [
      "Allow other users to find your profile",
      "Enable messaging between users",
      "Share profiles on social media",
      "Show activity status to connections"
    ]
  }
];

export const PrivacyConsent: React.FC<PrivacyConsentProps> = ({
  onAccept,
  onDecline,
  userEmail
}) => {
  const [consents, setConsents] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    consentOptions.forEach(option => {
      initial[option.id] = option.required;
    });
    return initial;
  });

  const [expandedOption, setExpandedOption] = useState<string | null>(null);

  const handleConsentChange = (optionId: string, checked: boolean) => {
    if (consentOptions.find(opt => opt.id === optionId)?.required) {
      return; // Don't allow changing required consents
    }
    
    setConsents(prev => ({
      ...prev,
      [optionId]: checked
    }));
  };

  const handleAcceptAll = () => {
    const allConsents: Record<string, boolean> = {};
    consentOptions.forEach(option => {
      allConsents[option.id] = true;
    });
    setConsents(allConsents);
    onAccept(allConsents);
  };

  const handleAcceptSelected = () => {
    onAccept(consents);
  };

  const getSelectedCount = () => {
    return Object.values(consents).filter(Boolean).length;
  };

  const toggleDetails = (optionId: string) => {
    setExpandedOption(expandedOption === optionId ? null : optionId);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Privacy & Data Consent</CardTitle>
              <CardDescription>
                Choose how your data is used on CastMatch
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {userEmail && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                These preferences will be applied to your account: <strong>{userEmail}</strong>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1">
            <p className="text-sm font-medium">
              We value your privacy and want to be transparent about how we handle your data.
            </p>
            <p className="text-sm text-muted-foreground">
              You can change these preferences anytime in your account settings.
            </p>
          </div>

          <Separator />

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {consentOptions.map((option) => {
                const Icon = option.icon;
                const isExpanded = expandedOption === option.id;
                
                return (
                  <Card key={option.id} className="border-l-4 border-l-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={option.id}
                          checked={consents[option.id]}
                          onCheckedChange={(checked) => 
                            handleConsentChange(option.id, checked as boolean)
                          }
                          disabled={option.required}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <Label 
                              htmlFor={option.id}
                              className="font-medium cursor-pointer"
                            >
                              {option.title}
                            </Label>
                            {option.required && (
                              <Badge variant="secondary" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {option.description}
                          </p>
                          
                          {option.details && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleDetails(option.id)}
                              className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                            >
                              {isExpanded ? "Hide details" : "Show details"}
                            </Button>
                          )}
                          
                          {isExpanded && option.details && (
                            <div className="mt-2 p-3 rounded-md bg-accent/50">
                              <ul className="text-xs text-muted-foreground space-y-1">
                                {option.details.map((detail, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <CheckCircle className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                                    {detail}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Selected preferences:</span>
              <Badge variant="outline">
                {getSelectedCount()} of {consentOptions.length}
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={onDecline}
                className="flex-1"
              >
                Decline Optional
              </Button>
              <Button
                variant="outline"
                onClick={handleAcceptSelected}
                className="flex-1"
              >
                Accept Selected
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                onClick={handleAcceptAll}
                className="flex-1"
              >
                Accept All
                <CheckCircle className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Your data is protected:</strong> We use industry-standard encryption and never sell your personal information. 
              Read our full{" "}
              <a href="/privacy-policy" className="text-primary hover:underline">
                Privacy Policy
              </a>{" "}
              for more details.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};