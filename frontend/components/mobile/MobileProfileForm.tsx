"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileFormData } from "@/lib/validations/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Camera, 
  Check, 
  AlertCircle,
  User,
  Phone,
  MapPin,
  Briefcase,
  Globe,
  Shield
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface MobileProfileFormProps {
  initialData?: Partial<ProfileFormData>;
  userAvatar?: string;
  userName?: string;
  onSubmit: (data: ProfileFormData) => Promise<void>;
  onAvatarUpload?: () => void;
}

const formSteps = [
  {
    id: "basic",
    title: "Basic Info",
    description: "Your essential information",
    icon: User,
    fields: ["firstName", "lastName", "displayName", "bio"]
  },
  {
    id: "contact",
    title: "Contact",
    description: "How people can reach you", 
    icon: Phone,
    fields: ["email", "phone", "alternateEmail"]
  },
  {
    id: "location",
    title: "Location",
    description: "Where you're based",
    icon: MapPin,
    fields: ["city", "state", "country", "pincode"]
  },
  {
    id: "professional",
    title: "Professional",
    description: "Your career details",
    icon: Briefcase,
    fields: ["profession", "experience", "languages", "skills"]
  },
  {
    id: "social",
    title: "Social Links",
    description: "Your online presence",
    icon: Globe,
    fields: ["website", "linkedin", "instagram", "twitter"]
  },
  {
    id: "privacy",
    title: "Privacy",
    description: "Control your visibility",
    icon: Shield,
    fields: ["profileVisibility", "showEmail", "showPhone", "allowMessages"]
  }
];

export const MobileProfileForm: React.FC<MobileProfileFormProps> = ({
  initialData,
  userAvatar,
  userName = "User",
  onSubmit,
  onAvatarUpload,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    watch,
    trigger,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: {
      profileVisibility: "public",
      showEmail: true,
      showPhone: false,
      allowMessages: true,
      ...initialData,
    },
  });

  const watchedValues = watch();
  const currentStepData = formSteps[currentStep];

  const validateCurrentStep = async () => {
    const fieldsToValidate = currentStepData.fields as Array<keyof ProfileFormData>;
    const isStepValid = await trigger(fieldsToValidate);
    return isStepValid;
  };

  const nextStep = async () => {
    const isStepValid = await validateCurrentStep();
    if (isStepValid && currentStep < formSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const calculateProgress = () => {
    const totalFields = Object.keys(profileSchema.shape).length;
    const filledFields = Object.entries(watchedValues).filter(([key, value]) => {
      if (typeof value === 'string') return value.trim() !== '';
      if (typeof value === 'boolean') return true;
      if (typeof value === 'number') return value !== null && value !== undefined;
      if (Array.isArray(value)) return value.length > 0;
      return false;
    }).length;
    
    return Math.round((filledFields / totalFields) * 100);
  };

  const getStepProgress = (stepIndex: number) => {
    const step = formSteps[stepIndex];
    const stepFields = step.fields;
    const filledFields = stepFields.filter(field => {
      const value = watchedValues[field as keyof ProfileFormData];
      if (typeof value === 'string') return value?.trim() !== '';
      if (typeof value === 'boolean') return true;
      if (typeof value === 'number') return value !== null && value !== undefined;
      return false;
    }).length;
    
    return Math.round((filledFields / stepFields.length) * 100);
  };

  const isStepCompleted = (stepIndex: number) => {
    return getStepProgress(stepIndex) === 100;
  };

  const hasStepErrors = (stepIndex: number) => {
    const step = formSteps[stepIndex];
    return step.fields.some(field => errors[field as keyof typeof errors]);
  };

  const handleFormSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="p-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex-1">
            <h1 className="font-semibold text-lg">{currentStepData.title}</h1>
            <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {currentStep + 1} / {formSteps.length}
          </div>
        </div>
        
        <div className="px-4 pb-4">
          <Progress value={((currentStep + 1) / formSteps.length) * 100} className="h-2" />
        </div>
      </div>

      {/* Content */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="p-4 space-y-6 pb-24">
        {/* Avatar Section (shown on first step) */}
        {currentStep === 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={userAvatar} alt={userName} />
                    <AvatarFallback className="text-xl">{getInitials(userName)}</AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                    onClick={onAvatarUpload}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-center">
                  <p className="font-medium">{userName}</p>
                  <p className="text-sm text-muted-foreground">Profile {calculateProgress()}% complete</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step Content */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {currentStep === 0 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      {...register("firstName")}
                      aria-invalid={!!errors.firstName}
                      className="text-base" // Prevent zoom on iOS
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-500">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      {...register("lastName")}
                      aria-invalid={!!errors.lastName}
                      className="text-base"
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-500">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    {...register("displayName")}
                    placeholder="How you want to be known professionally"
                    className="text-base"
                  />
                  {errors.displayName && (
                    <p className="text-sm text-red-500">{errors.displayName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    {...register("bio")}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    className="resize-none text-base"
                  />
                  <p className="text-sm text-muted-foreground text-right">
                    {watch("bio")?.length || 0}/500
                  </p>
                  {errors.bio && (
                    <p className="text-sm text-red-500">{errors.bio.message}</p>
                  )}
                </div>
              </>
            )}

            {currentStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    aria-invalid={!!errors.email}
                    className="text-base"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register("phone")}
                    placeholder="+91 98765 43210"
                    className="text-base"
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alternateEmail">Alternate Email</Label>
                  <Input
                    id="alternateEmail"
                    type="email"
                    {...register("alternateEmail")}
                    className="text-base"
                  />
                  {errors.alternateEmail && (
                    <p className="text-sm text-red-500">{errors.alternateEmail.message}</p>
                  )}
                </div>
              </>
            )}

            {currentStep === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    {...register("city")}
                    placeholder="Mumbai"
                    className="text-base"
                  />
                  {errors.city && (
                    <p className="text-sm text-red-500">{errors.city.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    {...register("state")}
                    placeholder="Maharashtra"
                    className="text-base"
                  />
                  {errors.state && (
                    <p className="text-sm text-red-500">{errors.state.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    {...register("country")}
                    placeholder="India"
                    className="text-base"
                  />
                  {errors.country && (
                    <p className="text-sm text-red-500">{errors.country.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    {...register("pincode")}
                    placeholder="400001"
                    className="text-base"
                  />
                  {errors.pincode && (
                    <p className="text-sm text-red-500">{errors.pincode.message}</p>
                  )}
                </div>
              </>
            )}

            {/* Other steps would be implemented similarly */}
            {currentStep >= 3 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Additional form sections for professional info, social links, and privacy settings would be implemented here.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Step Navigation */}
        <div className="flex items-center justify-between gap-2">
          {/* Step indicators */}
          <div className="flex space-x-1">
            {formSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-6 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-primary"
                    : index < currentStep
                    ? hasStepErrors(index)
                      ? "bg-red-500"
                      : "bg-green-500"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Progress text */}
          <span className="text-sm text-muted-foreground">
            {getStepProgress(currentStep)}% complete
          </span>
        </div>
      </form>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-4 space-y-3">
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              className="flex-1"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          
          {currentStep < formSteps.length - 1 ? (
            <Button
              type="button"
              onClick={nextStep}
              className="flex-1"
            >
              Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="flex-1"
              onClick={handleSubmit(handleFormSubmit)}
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Profile
                </>
              )}
            </Button>
          )}
        </div>

        {/* Overall progress */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${calculateProgress()}%` }}
            />
          </div>
          <span>{calculateProgress()}%</span>
        </div>
      </div>
    </div>
  );
};