"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Github, Mail, AlertCircle, CheckCircle, Chrome } from "lucide-react";

interface SocialLoginButtonsProps {
  onGoogleLogin: () => Promise<void>;
  onGithubLogin: () => Promise<void>;
  showDivider?: boolean;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
  orientation?: "horizontal" | "vertical";
  disabled?: boolean;
  className?: string;
}

export const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  onGoogleLogin,
  onGithubLogin,
  showDivider = true,
  size = "default",
  variant = "outline",
  orientation = "vertical",
  disabled = false,
  className = "",
}) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSocialLogin = async (provider: string, loginFn: () => Promise<void>) => {
    setLoadingProvider(provider);
    setError(null);
    
    try {
      await loginFn();
    } catch (err) {
      setError(`Failed to sign in with ${provider}. Please try again.`);
    } finally {
      setLoadingProvider(null);
    }
  };

  const isLoading = (provider: string) => loadingProvider === provider;
  const isAnyLoading = loadingProvider !== null;

  const buttonClasses = orientation === "horizontal" ? "flex-1" : "w-full";

  return (
    <div className={`space-y-4 ${className}`}>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className={`${orientation === "horizontal" ? "flex gap-4" : "space-y-3"}`}>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={buttonClasses}
          onClick={() => handleSocialLogin("Google", onGoogleLogin)}
          disabled={disabled || isAnyLoading}
          aria-label="Sign in with Google"
        >
          {isLoading("Google") ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Mail className="mr-2 h-4 w-4 text-red-500" />
          )}
          {isLoading("Google") ? "Signing in..." : "Continue with Google"}
        </Button>

        <Button
          type="button"
          variant={variant}
          size={size}
          className={buttonClasses}
          onClick={() => handleSocialLogin("GitHub", onGithubLogin)}
          disabled={disabled || isAnyLoading}
          aria-label="Sign in with GitHub"
        >
          {isLoading("GitHub") ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Github className="mr-2 h-4 w-4" />
          )}
          {isLoading("GitHub") ? "Signing in..." : "Continue with GitHub"}
        </Button>
      </div>

      {showDivider && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>
      )}
    </div>
  );
};