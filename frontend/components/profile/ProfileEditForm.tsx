"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileFormData } from "@/lib/validations/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, X, Plus, Globe, Lock, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ProfileEditFormProps {
  initialData?: Partial<ProfileFormData>;
  onSubmit: (data: ProfileFormData) => Promise<void>;
  userRole?: "actor" | "casting-director" | "producer";
}

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  initialData,
  onSubmit,
  userRole = "actor",
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [languages, setLanguages] = useState<string[]>(initialData?.languages || []);
  const [skills, setSkills] = useState<string[]>(initialData?.skills || []);
  const [newLanguage, setNewLanguage] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      profileVisibility: "public",
      showEmail: true,
      showPhone: false,
      allowMessages: true,
      ...initialData,
    },
  });

  const profileVisibility = watch("profileVisibility");

  const handleFormSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        languages,
        skills,
      });
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

  const addLanguage = () => {
    if (newLanguage && !languages.includes(newLanguage)) {
      setLanguages([...languages, newLanguage]);
      setNewLanguage("");
    }
  };

  const removeLanguage = (language: string) => {
    setLanguages(languages.filter((l) => l !== language));
  };

  const addSkill = () => {
    if (newSkill && !skills.includes(newSkill)) {
      setSkills([...skills, newSkill]);
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const getVisibilityIcon = () => {
    switch (profileVisibility) {
      case "public":
        return <Globe className="h-4 w-4" />;
      case "private":
        return <Lock className="h-4 w-4" />;
      case "network":
        return <Users className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="professional">Professional</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                This information will be displayed on your public profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    {...register("firstName")}
                    aria-invalid={!!errors.firstName}
                    aria-describedby={errors.firstName ? "firstName-error" : undefined}
                  />
                  {errors.firstName && (
                    <p id="firstName-error" className="text-sm text-red-500" role="alert">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    {...register("lastName")}
                    aria-invalid={!!errors.lastName}
                    aria-describedby={errors.lastName ? "lastName-error" : undefined}
                  />
                  {errors.lastName && (
                    <p id="lastName-error" className="text-sm text-red-500" role="alert">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  {...register("displayName")}
                  placeholder="How you want to be known professionally"
                  aria-invalid={!!errors.displayName}
                  aria-describedby={errors.displayName ? "displayName-error" : undefined}
                />
                {errors.displayName && (
                  <p id="displayName-error" className="text-sm text-red-500" role="alert">
                    {errors.displayName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  {...register("bio")}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="resize-none"
                  aria-invalid={!!errors.bio}
                  aria-describedby={errors.bio ? "bio-error" : undefined}
                />
                <p className="text-sm text-muted-foreground">
                  {watch("bio")?.length || 0}/500 characters
                </p>
                {errors.bio && (
                  <p id="bio-error" className="text-sm text-red-500" role="alert">
                    {errors.bio.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                How casting directors and producers can reach you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                  {errors.email && (
                    <p id="email-error" className="text-sm text-red-500" role="alert">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register("phone")}
                    placeholder="+91 98765 43210"
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                  />
                  {errors.phone && (
                    <p id="phone-error" className="text-sm text-red-500" role="alert">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alternateEmail">Alternate Email</Label>
                <Input
                  id="alternateEmail"
                  type="email"
                  {...register("alternateEmail")}
                  aria-invalid={!!errors.alternateEmail}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    {...register("city")}
                    placeholder="Mumbai"
                    aria-invalid={!!errors.city}
                  />
                  {errors.city && (
                    <p className="text-sm text-red-500" role="alert">
                      {errors.city.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    {...register("state")}
                    placeholder="Maharashtra"
                    aria-invalid={!!errors.state}
                  />
                  {errors.state && (
                    <p className="text-sm text-red-500" role="alert">
                      {errors.state.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    {...register("country")}
                    placeholder="India"
                    aria-invalid={!!errors.country}
                  />
                  {errors.country && (
                    <p className="text-sm text-red-500" role="alert">
                      {errors.country.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    {...register("pincode")}
                    placeholder="400001"
                    aria-invalid={!!errors.pincode}
                  />
                  {errors.pincode && (
                    <p className="text-sm text-red-500" role="alert">
                      {errors.pincode.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professional" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
              <CardDescription>
                Your skills, experience, and professional links
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profession">Profession</Label>
                  <Input
                    id="profession"
                    {...register("profession")}
                    placeholder="Actor / Director / Producer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input
                    id="experience"
                    type="number"
                    {...register("experience", { valueAsNumber: true })}
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Languages</Label>
                <div className="flex gap-2">
                  <Input
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    placeholder="Add a language"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addLanguage())}
                  />
                  <Button type="button" onClick={addLanguage} size="icon" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {languages.map((language) => (
                    <Badge key={language} variant="secondary" className="gap-1">
                      {language}
                      <button
                        type="button"
                        onClick={() => removeLanguage(language)}
                        className="ml-1 hover:text-destructive"
                        aria-label={`Remove ${language}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Skills</Label>
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  />
                  <Button type="button" onClick={addSkill} size="icon" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-1 hover:text-destructive"
                        aria-label={`Remove ${skill}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    {...register("website")}
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    type="url"
                    {...register("linkedin")}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    {...register("instagram")}
                    placeholder="@yourhandle"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input
                    id="twitter"
                    {...register("twitter")}
                    placeholder="@yourhandle"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control who can see your profile and contact you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="profileVisibility">Profile Visibility</Label>
                <Select
                  value={profileVisibility}
                  onValueChange={(value) => setValue("profileVisibility", value as any)}
                >
                  <SelectTrigger id="profileVisibility" className="w-full">
                    <div className="flex items-center gap-2">
                      {getVisibilityIcon()}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span>Public - Anyone can view</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="network">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Network - Only connections</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        <span>Private - Only you</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showEmail">Show Email Address</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow others to see your email address
                    </p>
                  </div>
                  <Switch
                    id="showEmail"
                    checked={watch("showEmail")}
                    onCheckedChange={(checked) => setValue("showEmail", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showPhone">Show Phone Number</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow others to see your phone number
                    </p>
                  </div>
                  <Switch
                    id="showPhone"
                    checked={watch("showPhone")}
                    onCheckedChange={(checked) => setValue("showPhone", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowMessages">Allow Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow other users to send you direct messages
                    </p>
                  </div>
                  <Switch
                    id="allowMessages"
                    checked={watch("allowMessages")}
                    onCheckedChange={(checked) => setValue("allowMessages", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          disabled={!isDirty || isSubmitting}
          onClick={() => window.location.reload()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
};