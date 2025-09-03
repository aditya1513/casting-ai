"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Building, 
  Film, 
  Users, 
  Camera, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  Shield,
  Mail
} from "lucide-react";
import { SocialLoginButtons } from "./SocialLoginButtons";

const roleSelectionSchema = z.object({
  role: z.enum(["actor", "casting-director", "producer"], {
    required_error: "Please select your role",
  }),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions",
  }),
  agreeToPrivacy: z.boolean().refine(val => val === true, {
    message: "You must agree to the privacy policy",
  }),
});

const profileSetupSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phone: z.string().regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{4,10}$/, "Invalid phone number").optional(),
  city: z.string().min(2, "City is required"),
  // Role-specific fields will be added dynamically
});

type RoleSelectionData = z.infer<typeof roleSelectionSchema>;
type ProfileSetupData = z.infer<typeof profileSetupSchema>;

interface SocialUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  provider: "google" | "github";
}

interface SocialSignupFlowProps {
  user: SocialUser;
  onComplete: (data: { role: string; profile: ProfileSetupData }) => Promise<void>;
  onCancel: () => void;
}

const roleOptions = [
  {
    value: "actor",
    label: "Actor",
    description: "Showcase your talent and find audition opportunities",
    icon: User,
    color: "bg-blue-500",
  },
  {
    value: "casting-director",
    label: "Casting Director",
    description: "Discover talent and manage casting projects",
    icon: Search,
    color: "bg-green-500",
  },
  {
    value: "producer",
    label: "Producer",
    description: "Manage productions and oversee project development",
    icon: Film,
    color: "bg-purple-500",
  },
];

export const SocialSignupFlow: React.FC<SocialSignupFlowProps> = ({
  user,
  onComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalSteps = 3;

  // Role selection form
  const {
    register: registerRole,
    handleSubmit: handleRoleSubmit,
    formState: { errors: roleErrors },
    setValue: setRoleValue,
    watch: watchRole,
  } = useForm<RoleSelectionData>({
    resolver: zodResolver(roleSelectionSchema),
  });

  // Profile setup form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileSetupData>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      firstName: user.name?.split(" ")[0] || "",
      lastName: user.name?.split(" ")[1] || "",
    },
  });

  const role = watchRole("role");
  const agreeToTerms = watchRole("agreeToTerms");
  const agreeToPrivacy = watchRole("agreeToPrivacy");

  const handleRoleSelection = (data: RoleSelectionData) => {
    setSelectedRole(data.role);
    setCurrentStep(2);
  };

  const handleProfileSetup = async (data: ProfileSetupData) => {
    setIsSubmitting(true);
    try {
      await onComplete({
        role: selectedRole,
        profile: data,
      });
    } catch (error) {
      console.error("Failed to complete signup:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Choose Your Role";
      case 2:
        return "Complete Your Profile";
      case 3:
        return "Welcome to CastMatch";
      default:
        return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1:
        return "Select your role to personalize your CastMatch experience";
      case 2:
        return "Help us set up your profile with some basic information";
      case 3:
        return "You're all set! Start exploring opportunities";
      default:
        return "";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (currentStep === 3) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-green-100 dark:bg-green-900 w-fit">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle>Welcome to CastMatch!</CardTitle>
          <CardDescription>
            Your account has been created successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <Avatar className="h-20 w-20 mx-auto">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-lg">
                {getInitials(user.name || user.email)}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-semibold">{user.name}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <Badge variant="secondary" className="capitalize">
              {selectedRole.replace("-", " ")}
            </Badge>
          </div>
          
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your profile is ready! You can now start exploring opportunities on CastMatch.
            </AlertDescription>
          </Alert>

          <Button 
            className="w-full" 
            onClick={() => window.location.href = "/dashboard"}
          >
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
        </div>
        <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
      </div>

      {/* Social Account Info */}
      <Card className="bg-accent/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{getInitials(user.name || user.email)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{user.name || "User"}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant="outline" className="capitalize">
              {user.provider}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{getStepTitle()}</CardTitle>
          <CardDescription>{getStepDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <form onSubmit={handleRoleSubmit(handleRoleSelection)} className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-medium">What describes you best?</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(value) => setRoleValue("role", value as any)}
                  className="space-y-3"
                >
                  {roleOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <div key={option.value} className="flex items-center space-x-3">
                        <RadioGroupItem 
                          value={option.value} 
                          id={option.value}
                          className="mt-1" 
                        />
                        <Label
                          htmlFor={option.value}
                          className="flex items-start gap-3 cursor-pointer flex-1 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                        >
                          <div className={`p-2 rounded-full ${option.color} text-white`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium">{option.label}</h4>
                            <p className="text-sm text-muted-foreground">
                              {option.description}
                            </p>
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
                {roleErrors.role && (
                  <p className="text-sm text-red-500" role="alert">
                    {roleErrors.role.message}
                  </p>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base font-medium">Agreement</Label>
                
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={agreeToTerms}
                    onCheckedChange={(checked) => setRoleValue("agreeToTerms", checked as boolean)}
                    className="mt-1"
                  />
                  <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                    I agree to the{" "}
                    <a href="/terms" className="text-primary hover:underline">
                      Terms and Conditions
                    </a>{" "}
                    and acknowledge that I have read and understood them.
                  </Label>
                </div>
                {roleErrors.agreeToTerms && (
                  <p className="text-sm text-red-500 ml-6" role="alert">
                    {roleErrors.agreeToTerms.message}
                  </p>
                )}

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="privacy"
                    checked={agreeToPrivacy}
                    onCheckedChange={(checked) => setRoleValue("agreeToPrivacy", checked as boolean)}
                    className="mt-1"
                  />
                  <Label htmlFor="privacy" className="text-sm leading-relaxed cursor-pointer">
                    I agree to the{" "}
                    <a href="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </a>{" "}
                    and consent to the processing of my personal data.
                  </Label>
                </div>
                {roleErrors.agreeToPrivacy && (
                  <p className="text-sm text-red-500 ml-6" role="alert">
                    {roleErrors.agreeToPrivacy.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          {currentStep === 2 && (
            <form onSubmit={handleProfileSubmit(handleProfileSetup)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    {...registerProfile("firstName")}
                    aria-invalid={!!profileErrors.firstName}
                  />
                  {profileErrors.firstName && (
                    <p className="text-sm text-red-500" role="alert">
                      {profileErrors.firstName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    {...registerProfile("lastName")}
                    aria-invalid={!!profileErrors.lastName}
                  />
                  {profileErrors.lastName && (
                    <p className="text-sm text-red-500" role="alert">
                      {profileErrors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  {...registerProfile("phone")}
                  aria-invalid={!!profileErrors.phone}
                />
                {profileErrors.phone && (
                  <p className="text-sm text-red-500" role="alert">
                    {profileErrors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="Mumbai"
                  {...registerProfile("city")}
                  aria-invalid={!!profileErrors.city}
                />
                {profileErrors.city && (
                  <p className="text-sm text-red-500" role="alert">
                    {profileErrors.city.message}
                  </p>
                )}
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Your information is secure and will only be used to personalize your CastMatch experience.
                  You can update these details anytime in your profile settings.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCurrentStep(1)}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <CheckCircle className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};