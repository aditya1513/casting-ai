import { z } from "zod";

// Profile validation schemas
export const profileSchema = z.object({
  // Basic Information
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50),
  displayName: z.string().min(3, "Display name must be at least 3 characters").max(30).optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  
  // Contact Information
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{4,10}$/, "Invalid phone number").optional(),
  alternateEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  
  // Location
  city: z.string().min(2, "City must be at least 2 characters").max(50),
  state: z.string().min(2, "State must be at least 2 characters").max(50),
  country: z.string().min(2, "Country must be at least 2 characters").max(50),
  pincode: z.string().regex(/^[0-9]{6}$/, "Invalid pincode").optional(),
  
  // Professional Information
  profession: z.string().optional(),
  experience: z.number().min(0).max(50).optional(),
  languages: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  
  // Social Links
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  linkedin: z.string().url("Invalid LinkedIn URL").optional().or(z.literal("")),
  instagram: z.string().regex(/^@?[a-zA-Z0-9._]{1,30}$/, "Invalid Instagram handle").optional().or(z.literal("")),
  twitter: z.string().regex(/^@?[a-zA-Z0-9_]{1,15}$/, "Invalid Twitter handle").optional().or(z.literal("")),
  
  // Privacy Settings
  profileVisibility: z.enum(["public", "private", "network"]),
  showEmail: z.boolean(),
  showPhone: z.boolean(),
  allowMessages: z.boolean(),
});

// Password change schema
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(8, "Password must be at least 8 characters"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      "Password must contain uppercase, lowercase, number and special character"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Two-factor authentication schema
export const twoFactorSchema = z.object({
  enable: z.boolean(),
  method: z.enum(["app", "sms", "email"]),
  verificationCode: z.string().length(6, "Code must be 6 digits").optional(),
});

// Notification preferences schema
export const notificationPreferencesSchema = z.object({
  emailNotifications: z.object({
    newAudition: z.boolean(),
    auditionUpdate: z.boolean(),
    profileView: z.boolean(),
    teamInvite: z.boolean(),
    weeklyDigest: z.boolean(),
  }),
  pushNotifications: z.object({
    enabled: z.boolean(),
    newAudition: z.boolean(),
    auditionReminder: z.boolean(),
    messages: z.boolean(),
  }),
  smsNotifications: z.object({
    enabled: z.boolean(),
    urgentUpdates: z.boolean(),
    auditionReminder: z.boolean(),
  }),
});

// Actor-specific profile schema
export const actorProfileSchema = profileSchema.extend({
  // Physical Attributes
  height: z.number().min(100).max(250).optional(),
  weight: z.number().min(30).max(200).optional(),
  eyeColor: z.string().optional(),
  hairColor: z.string().optional(),
  bodyType: z.enum(["slim", "athletic", "average", "curvy", "muscular", "plus-size"]).optional(),
  
  // Performance Skills
  actingStyles: z.array(z.string()).optional(),
  danceStyles: z.array(z.string()).optional(),
  martialArts: z.array(z.string()).optional(),
  musicalInstruments: z.array(z.string()).optional(),
  
  // Availability
  availability: z.enum(["immediate", "1week", "2weeks", "1month", "negotiable"]),
  willingToTravel: z.boolean(),
  willingToRelocate: z.boolean(),
});

// Casting Director profile schema
export const castingDirectorProfileSchema = profileSchema.extend({
  company: z.string().min(2).max(100),
  designation: z.string().min(2).max(100),
  projectTypes: z.array(z.enum(["film", "tv", "web-series", "commercial", "theatre", "music-video"])),
  castingExperience: z.number().min(0).max(50),
  notableProjects: z.array(z.object({
    title: z.string(),
    role: z.string(),
    year: z.number(),
  })).optional(),
});

// Producer profile schema
export const producerProfileSchema = profileSchema.extend({
  productionHouse: z.string().min(2).max(100),
  designation: z.string().min(2).max(100),
  budgetRange: z.enum(["micro", "low", "medium", "high", "blockbuster"]).optional(),
  projectTypes: z.array(z.enum(["film", "tv", "web-series", "documentary", "short-film"])),
  producedProjects: z.number().min(0).optional(),
  upcomingProjects: z.number().min(0).optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
export type ActorProfileFormData = z.infer<typeof actorProfileSchema>;
export type CastingDirectorProfileFormData = z.infer<typeof castingDirectorProfileSchema>;
export type ProducerProfileFormData = z.infer<typeof producerProfileSchema>;
export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
export type TwoFactorFormData = z.infer<typeof twoFactorSchema>;
export type NotificationPreferencesFormData = z.infer<typeof notificationPreferencesSchema>;