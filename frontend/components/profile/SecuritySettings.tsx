"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { passwordChangeSchema, twoFactorSchema, type PasswordChangeFormData, type TwoFactorFormData } from "@/lib/validations/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, Key, Smartphone, Mail, Lock, AlertCircle, CheckCircle, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface SecuritySettingsProps {
  has2FA?: boolean;
  onPasswordChange: (data: PasswordChangeFormData) => Promise<void>;
  onEnable2FA: (method: string) => Promise<string>;
  onVerify2FA: (code: string) => Promise<void>;
  onDisable2FA: () => Promise<void>;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  has2FA = false,
  onPasswordChange,
  onEnable2FA,
  onVerify2FA,
  onDisable2FA,
}) => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(has2FA);
  const [is2FADialogOpen, setIs2FADialogOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [selected2FAMethod, setSelected2FAMethod] = useState<"app" | "sms" | "email">("app");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  // Password change form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
  });

  // Two-factor authentication form
  const {
    register: register2FA,
    handleSubmit: handle2FASubmit,
    formState: { errors: twoFactorErrors },
  } = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: {
      enable: is2FAEnabled,
      method: "app",
    },
  });

  const handlePasswordChange = async (data: PasswordChangeFormData) => {
    setIsChangingPassword(true);
    try {
      await onPasswordChange(data);
      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed.",
      });
      resetPasswordForm();
    } catch (error) {
      toast({
        title: "Password Change Failed",
        description: "Failed to update password. Please check your current password and try again.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handle2FAToggle = async (enabled: boolean) => {
    if (enabled) {
      setIs2FADialogOpen(true);
      try {
        const qrCodeUrl = await onEnable2FA(selected2FAMethod);
        setQrCode(qrCodeUrl);
      } catch (error) {
        toast({
          title: "Failed to Enable 2FA",
          description: "An error occurred while setting up two-factor authentication.",
          variant: "destructive",
        });
        setIs2FADialogOpen(false);
      }
    } else {
      try {
        await onDisable2FA();
        setIs2FAEnabled(false);
        toast({
          title: "2FA Disabled",
          description: "Two-factor authentication has been disabled.",
        });
      } catch (error) {
        toast({
          title: "Failed to Disable 2FA",
          description: "An error occurred while disabling two-factor authentication.",
          variant: "destructive",
        });
      }
    }
  };

  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      await onVerify2FA(verificationCode);
      setIs2FAEnabled(true);
      setIs2FADialogOpen(false);
      setVerificationCode("");
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been successfully enabled.",
      });
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const passwordStrength = (password: string): { strength: number; label: string; color: string } => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;

    const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
    const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];

    return {
      strength: (strength / 5) * 100,
      label: labels[strength - 1] || labels[0],
      color: colors[strength - 1] || colors[0],
    };
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="password" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="2fa">Two-Factor Auth</TabsTrigger>
        </TabsList>

        <TabsContent value="password" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password regularly to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit(handlePasswordChange)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      {...registerPassword("currentPassword")}
                      aria-invalid={!!passwordErrors.currentPassword}
                      aria-describedby={passwordErrors.currentPassword ? "current-password-error" : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <p id="current-password-error" className="text-sm text-red-500" role="alert">
                      {passwordErrors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      {...registerPassword("newPassword")}
                      aria-invalid={!!passwordErrors.newPassword}
                      aria-describedby={passwordErrors.newPassword ? "new-password-error" : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <p id="new-password-error" className="text-sm text-red-500" role="alert">
                      {passwordErrors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      {...registerPassword("confirmPassword")}
                      aria-invalid={!!passwordErrors.confirmPassword}
                      aria-describedby={passwordErrors.confirmPassword ? "confirm-password-error" : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p id="confirm-password-error" className="text-sm text-red-500" role="alert">
                      {passwordErrors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Password Requirements</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>At least 8 characters long</li>
                      <li>Contains uppercase and lowercase letters</li>
                      <li>Contains at least one number</li>
                      <li>Contains at least one special character</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <Button type="submit" disabled={isChangingPassword} className="w-full">
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Update Password
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="2fa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="2fa-toggle">Enable Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    {is2FAEnabled
                      ? "Your account is protected with 2FA"
                      : "Secure your account with an additional verification step"}
                  </p>
                </div>
                <Switch
                  id="2fa-toggle"
                  checked={is2FAEnabled}
                  onCheckedChange={handle2FAToggle}
                />
              </div>

              {is2FAEnabled && (
                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertTitle className="text-green-800 dark:text-green-200">2FA is Active</AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    Your account is protected with two-factor authentication.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-medium">Available Methods</h4>
                <RadioGroup value={selected2FAMethod} onValueChange={(value: any) => setSelected2FAMethod(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="app" id="2fa-app" />
                    <Label htmlFor="2fa-app" className="flex items-center gap-2 cursor-pointer">
                      <Smartphone className="h-4 w-4" />
                      Authenticator App (Recommended)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sms" id="2fa-sms" />
                    <Label htmlFor="2fa-sms" className="flex items-center gap-2 cursor-pointer">
                      <Smartphone className="h-4 w-4" />
                      SMS Text Message
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="2fa-email" />
                    <Label htmlFor="2fa-email" className="flex items-center gap-2 cursor-pointer">
                      <Mail className="h-4 w-4" />
                      Email Verification
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Security Tip</AlertTitle>
                <AlertDescription>
                  Using an authenticator app is the most secure method for two-factor authentication.
                  We recommend Google Authenticator or Authy.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Recovery Options
              </CardTitle>
              <CardDescription>
                Set up recovery methods in case you lose access to your 2FA device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">
                Generate Recovery Codes
              </Button>
              <Button variant="outline" className="w-full">
                Add Backup Phone Number
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 2FA Setup Dialog */}
      <Dialog open={is2FADialogOpen} onOpenChange={setIs2FADialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              {selected2FAMethod === "app"
                ? "Scan this QR code with your authenticator app"
                : selected2FAMethod === "sms"
                ? "We'll send a verification code to your phone"
                : "We'll send a verification code to your email"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selected2FAMethod === "app" && qrCode && (
              <div className="flex justify-center">
                <div className="rounded-lg border-2 border-muted p-4 bg-white">
                  <img src={qrCode} alt="2FA QR Code" className="h-48 w-48" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                pattern="[0-9]{6}"
                className="text-center text-2xl tracking-widest"
              />
            </div>

            {selected2FAMethod !== "app" && (
              <Button variant="outline" className="w-full">
                Send Code
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIs2FADialogOpen(false)} disabled={isVerifying}>
              Cancel
            </Button>
            <Button onClick={handleVerify2FA} disabled={isVerifying || verificationCode.length !== 6}>
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Enable"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};