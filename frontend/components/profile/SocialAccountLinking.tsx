"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Link2, 
  Unlink, 
  Github, 
  Mail, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Facebook,
  Twitter,
  Linkedin,
  Instagram
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface SocialAccount {
  provider: string;
  id: string;
  email?: string;
  username?: string;
  connectedAt: Date;
}

interface SocialAccountLinkingProps {
  connectedAccounts: SocialAccount[];
  onLink: (provider: string) => Promise<void>;
  onUnlink: (provider: string) => Promise<void>;
}

const providerConfig = {
  google: {
    name: "Google",
    icon: Mail,
    color: "bg-red-500",
    description: "Sign in with your Google account",
  },
  github: {
    name: "GitHub",
    icon: Github,
    color: "bg-gray-800",
    description: "Sign in with your GitHub account",
  },
  facebook: {
    name: "Facebook",
    icon: Facebook,
    color: "bg-blue-600",
    description: "Sign in with your Facebook account",
  },
  twitter: {
    name: "Twitter",
    icon: Twitter,
    color: "bg-blue-400",
    description: "Sign in with your Twitter account",
  },
  linkedin: {
    name: "LinkedIn",
    icon: Linkedin,
    color: "bg-blue-700",
    description: "Sign in with your LinkedIn account",
  },
  instagram: {
    name: "Instagram",
    icon: Instagram,
    color: "bg-gradient-to-br from-purple-500 to-pink-500",
    description: "Sign in with your Instagram account",
  },
};

export const SocialAccountLinking: React.FC<SocialAccountLinkingProps> = ({
  connectedAccounts,
  onLink,
  onUnlink,
}) => {
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);
  const { toast } = useToast();

  const isConnected = (provider: string) => {
    return connectedAccounts.some((account) => account.provider === provider);
  };

  const getConnectedAccount = (provider: string) => {
    return connectedAccounts.find((account) => account.provider === provider);
  };

  const handleLink = async (provider: string) => {
    setLinkingProvider(provider);
    try {
      await onLink(provider);
      toast({
        title: "Account Linked",
        description: `Your ${providerConfig[provider as keyof typeof providerConfig].name} account has been linked successfully.`,
      });
    } catch (error) {
      toast({
        title: "Linking Failed",
        description: `Failed to link your ${providerConfig[provider as keyof typeof providerConfig].name} account. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setLinkingProvider(null);
    }
  };

  const handleUnlink = async (provider: string) => {
    // Check if this is the last authentication method
    if (connectedAccounts.length === 1) {
      toast({
        title: "Cannot Unlink",
        description: "You must have at least one authentication method. Add another method before removing this one.",
        variant: "destructive",
      });
      return;
    }

    setUnlinkingProvider(provider);
    try {
      await onUnlink(provider);
      toast({
        title: "Account Unlinked",
        description: `Your ${providerConfig[provider as keyof typeof providerConfig].name} account has been unlinked.`,
      });
    } catch (error) {
      toast({
        title: "Unlinking Failed",
        description: `Failed to unlink your ${providerConfig[provider as keyof typeof providerConfig].name} account. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setUnlinkingProvider(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Connected Accounts
          </CardTitle>
          <CardDescription>
            Link your social accounts for easy sign-in and profile import
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectedAccounts.length > 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                You have {connectedAccounts.length} connected {connectedAccounts.length === 1 ? "account" : "accounts"}.
                You can sign in with any of these accounts.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {Object.entries(providerConfig).map(([provider, config]) => {
              const account = getConnectedAccount(provider);
              const connected = isConnected(provider);
              const Icon = config.icon;

              return (
                <div
                  key={provider}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 text-white ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{config.name}</h4>
                        {connected && (
                          <Badge variant="secondary" className="text-xs">
                            Connected
                          </Badge>
                        )}
                      </div>
                      {connected && account ? (
                        <p className="text-sm text-muted-foreground">
                          {account.email || account.username || `Connected on ${formatDate(account.connectedAt)}`}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                      )}
                    </div>
                  </div>

                  {connected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnlink(provider)}
                      disabled={unlinkingProvider === provider || connectedAccounts.length === 1}
                    >
                      {unlinkingProvider === provider ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Unlinking...
                        </>
                      ) : (
                        <>
                          <Unlink className="mr-2 h-4 w-4" />
                          Unlink
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleLink(provider)}
                      disabled={linkingProvider === provider}
                    >
                      {linkingProvider === provider ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Linking...
                        </>
                      ) : (
                        <>
                          <Link2 className="mr-2 h-4 w-4" />
                          Link
                        </>
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {connectedAccounts.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No social accounts connected yet. Link an account to enable social sign-in.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Security</CardTitle>
          <CardDescription>
            Important information about linked accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Linking social accounts allows you to sign in without a password</li>
                <li>Your social account data is never shared without your permission</li>
                <li>You must keep at least one authentication method active</li>
                <li>We recommend enabling two-factor authentication for added security</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};