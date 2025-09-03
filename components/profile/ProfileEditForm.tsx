"use client"

import React, { useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Camera, User, Mail, Phone, Calendar, MapPin, Globe, Briefcase, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"

// Validation schema with real-time validation
const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, "Invalid phone number").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  location: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  // Professional fields
  experience: z.string().optional(),
  skills: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  eyeColor: z.string().optional(),
  hairColor: z.string().optional(),
  ethnicity: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileEditFormProps {
  initialData?: Partial<ProfileFormData>
  userRole: "ACTOR" | "CASTING_DIRECTOR" | "PRODUCER" | "ADMIN"
  onSubmit?: (data: ProfileFormData) => Promise<void>
}

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  initialData = {},
  userRole,
  onSubmit
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [profileCompleteness, setProfileCompleteness] = useState(0)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields },
    watch,
    setValue,
    control
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData,
    mode: "onChange" // Enable real-time validation
  })

  // Watch all fields for profile completeness calculation
  const watchedFields = watch()

  // Calculate profile completeness
  React.useEffect(() => {
    const fields = Object.keys(profileSchema.shape)
    const filledFields = fields.filter(field => {
      const value = watchedFields[field as keyof ProfileFormData]
      return value && value !== "" && (!Array.isArray(value) || value.length > 0)
    })
    const completeness = Math.round((filledFields.length / fields.length) * 100)
    setProfileCompleteness(completeness)
  }, [watchedFields])

  const onSubmitForm = async (data: ProfileFormData) => {
    setIsSubmitting(true)
    try {
      if (onSubmit) {
        await onSubmit(data)
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {/* Profile Completeness Indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Profile Completeness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={profileCompleteness} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {profileCompleteness}% complete - {profileCompleteness < 100 && "Add more details to improve your visibility"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="professional">Professional</TabsTrigger>
          {userRole === "ACTOR" && <TabsTrigger value="physical">Physical Attributes</TabsTrigger>}
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    First Name *
                  </Label>
                  <Input
                    id="firstName"
                    {...register("firstName")}
                    placeholder="Enter your first name"
                    aria-invalid={!!errors.firstName}
                    aria-describedby={errors.firstName ? "firstName-error" : undefined}
                  />
                  {errors.firstName && (
                    <p id="firstName-error" className="text-sm text-destructive">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Last Name *
                  </Label>
                  <Input
                    id="lastName"
                    {...register("lastName")}
                    placeholder="Enter your last name"
                    aria-invalid={!!errors.lastName}
                    aria-describedby={errors.lastName ? "lastName-error" : undefined}
                  />
                  {errors.lastName && (
                    <p id="lastName-error" className="text-sm text-destructive">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="your@email.com"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                  {errors.email && (
                    <p id="email-error" className="text-sm text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register("phone")}
                    placeholder="+91 98765 43210"
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                  />
                  {errors.phone && (
                    <p id="phone-error" className="text-sm text-destructive">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Additional Personal Info */}
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date of Birth
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    {...register("dateOfBirth")}
                    aria-label="Date of birth"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender" className="flex items-center gap-2">
                    Gender
                  </Label>
                  <Select onValueChange={(value) => setValue("gender", value as any)}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </Label>
                  <Input
                    id="location"
                    {...register("location")}
                    placeholder="Mumbai, Maharashtra"
                    aria-label="Location"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    {...register("website")}
                    placeholder="https://yourwebsite.com"
                    aria-invalid={!!errors.website}
                    aria-describedby={errors.website ? "website-error" : undefined}
                  />
                  {errors.website && (
                    <p id="website-error" className="text-sm text-destructive">
                      {errors.website.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  {...register("bio")}
                  placeholder="Tell us about yourself..."
                  className="min-h-[100px]"
                  aria-invalid={!!errors.bio}
                  aria-describedby={errors.bio ? "bio-error" : undefined}
                />
                <div className="flex justify-between">
                  <p className="text-sm text-muted-foreground">
                    {watchedFields.bio?.length || 0}/500 characters
                  </p>
                  {errors.bio && (
                    <p id="bio-error" className="text-sm text-destructive">
                      {errors.bio.message}
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
              <CardTitle>Professional Details</CardTitle>
              <CardDescription>
                Highlight your experience and skills
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="experience" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Experience Level
                </Label>
                <Select onValueChange={(value) => setValue("experience", value)}>
                  <SelectTrigger id="experience">
                    <SelectValue placeholder="Select experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
                    <SelectItem value="intermediate">Intermediate (2-5 years)</SelectItem>
                    <SelectItem value="experienced">Experienced (5-10 years)</SelectItem>
                    <SelectItem value="expert">Expert (10+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Skills
                </Label>
                <div className="text-sm text-muted-foreground mb-2">
                  Add skills relevant to your role
                </div>
                {userRole === "ACTOR" && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {["Acting", "Dancing", "Singing", "Voice Acting", "Stunts", "Comedy", "Drama", "Action", "Romance"].map((skill) => (
                      <label key={skill} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          value={skill}
                          className="rounded border-gray-300"
                          onChange={(e) => {
                            const currentSkills = watchedFields.skills || []
                            if (e.target.checked) {
                              setValue("skills", [...currentSkills, skill])
                            } else {
                              setValue("skills", currentSkills.filter(s => s !== skill))
                            }
                          }}
                        />
                        <span className="text-sm">{skill}</span>
                      </label>
                    ))}
                  </div>
                )}
                {(userRole === "CASTING_DIRECTOR" || userRole === "PRODUCER") && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {["Project Management", "Budget Management", "Script Analysis", "Talent Scouting", "Negotiation", "Scheduling", "Team Leadership", "Marketing", "Distribution"].map((skill) => (
                      <label key={skill} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          value={skill}
                          className="rounded border-gray-300"
                          onChange={(e) => {
                            const currentSkills = watchedFields.skills || []
                            if (e.target.checked) {
                              setValue("skills", [...currentSkills, skill])
                            } else {
                              setValue("skills", currentSkills.filter(s => s !== skill))
                            }
                          }}
                        />
                        <span className="text-sm">{skill}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Languages</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {["Hindi", "English", "Marathi", "Tamil", "Telugu", "Bengali", "Gujarati", "Punjabi", "Malayalam"].map((language) => (
                    <label key={language} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        value={language}
                        className="rounded border-gray-300"
                        onChange={(e) => {
                          const currentLanguages = watchedFields.languages || []
                          if (e.target.checked) {
                            setValue("languages", [...currentLanguages, language])
                          } else {
                            setValue("languages", currentLanguages.filter(l => l !== language))
                          }
                        }}
                      />
                      <span className="text-sm">{language}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {userRole === "ACTOR" && (
          <TabsContent value="physical" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Physical Attributes</CardTitle>
                <CardDescription>
                  These details help casting directors find the right fit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      {...register("height")}
                      placeholder="175"
                      aria-label="Height in centimeters"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      {...register("weight")}
                      placeholder="70"
                      aria-label="Weight in kilograms"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eyeColor">Eye Color</Label>
                    <Select onValueChange={(value) => setValue("eyeColor", value)}>
                      <SelectTrigger id="eyeColor">
                        <SelectValue placeholder="Select eye color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brown">Brown</SelectItem>
                        <SelectItem value="black">Black</SelectItem>
                        <SelectItem value="blue">Blue</SelectItem>
                        <SelectItem value="green">Green</SelectItem>
                        <SelectItem value="hazel">Hazel</SelectItem>
                        <SelectItem value="gray">Gray</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hairColor">Hair Color</Label>
                    <Select onValueChange={(value) => setValue("hairColor", value)}>
                      <SelectTrigger id="hairColor">
                        <SelectValue placeholder="Select hair color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="black">Black</SelectItem>
                        <SelectItem value="brown">Brown</SelectItem>
                        <SelectItem value="blonde">Blonde</SelectItem>
                        <SelectItem value="red">Red</SelectItem>
                        <SelectItem value="gray">Gray</SelectItem>
                        <SelectItem value="white">White</SelectItem>
                        <SelectItem value="bald">Bald</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ethnicity">Ethnicity</Label>
                  <Select onValueChange={(value) => setValue("ethnicity", value)}>
                    <SelectTrigger id="ethnicity">
                      <SelectValue placeholder="Select ethnicity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="south_asian">South Asian</SelectItem>
                      <SelectItem value="east_asian">East Asian</SelectItem>
                      <SelectItem value="middle_eastern">Middle Eastern</SelectItem>
                      <SelectItem value="african">African</SelectItem>
                      <SelectItem value="caucasian">Caucasian</SelectItem>
                      <SelectItem value="hispanic">Hispanic/Latino</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Form Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {isDirty && Object.keys(dirtyFields).length > 0 && (
            <span className="text-yellow-600">You have unsaved changes</span>
          )}
        </div>
        <div className="space-x-2">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </form>
  )
}