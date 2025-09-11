-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ACTOR', 'CASTING_DIRECTOR', 'PRODUCER', 'DIRECTOR', 'AGENT', 'ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CASTING', 'IN_PRODUCTION', 'POST_PRODUCTION', 'COMPLETED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('WEB_SERIES', 'FILM', 'SHORT_FILM', 'DOCUMENTARY', 'AD_COMMERCIAL', 'MUSIC_VIDEO', 'THEATRE', 'VOICE_OVER', 'REALITY_SHOW', 'TALK_SHOW');

-- CreateEnum
CREATE TYPE "AuditionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "AuditionType" AS ENUM ('IN_PERSON', 'VIRTUAL', 'SELF_TAPE', 'CALLBACK', 'SCREEN_TEST', 'CHEMISTRY_READ');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'SHORTLISTED', 'AUDITIONED', 'CALLBACK', 'SELECTED', 'BACKUP', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "UnionStatus" AS ENUM ('UNION_MEMBER', 'NON_UNION', 'ELIGIBLE', 'SAG_AFTRA', 'ACTORS_EQUITY', 'OTHER');

-- CreateEnum
CREATE TYPE "CharacterImportance" AS ENUM ('LEAD', 'SUPPORTING', 'FEATURED', 'BACKGROUND', 'CAMEO', 'RECURRING', 'GUEST_STAR');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('FRESHER', 'BEGINNER', 'INTERMEDIATE', 'EXPERIENCED', 'EXPERT', 'VETERAN');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'BUSY', 'PARTIALLY_AVAILABLE', 'NOT_AVAILABLE', 'ON_PROJECT');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('HEADSHOT', 'FULL_BODY', 'PORTFOLIO', 'SHOWREEL', 'MONOLOGUE', 'SCENE', 'VOICE_SAMPLE', 'DANCE_VIDEO', 'ACTION_REEL', 'RESUME', 'CERTIFICATE');

-- CreateEnum
CREATE TYPE "ProfileCompleteness" AS ENUM ('BASIC', 'INTERMEDIATE', 'ADVANCED', 'COMPLETE', 'VERIFIED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "refreshToken" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "displayName" TEXT,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "nationality" TEXT NOT NULL DEFAULT 'Indian',
    "aadharNumber" TEXT,
    "panNumber" TEXT,
    "passportNumber" TEXT,
    "primaryPhone" TEXT NOT NULL,
    "secondaryPhone" TEXT,
    "whatsappNumber" TEXT,
    "email" TEXT NOT NULL,
    "alternateEmail" TEXT,
    "currentCity" TEXT NOT NULL,
    "currentState" TEXT NOT NULL,
    "currentPincode" TEXT,
    "hometown" TEXT,
    "preferredLocations" TEXT[],
    "willingToRelocate" BOOLEAN NOT NULL DEFAULT false,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "chest" DOUBLE PRECISION,
    "waist" DOUBLE PRECISION,
    "hips" DOUBLE PRECISION,
    "shoeSize" TEXT,
    "dressSize" TEXT,
    "bio" TEXT,
    "experience" JSONB,
    "yearsOfExperience" INTEGER NOT NULL DEFAULT 0,
    "unionStatus" "UnionStatus" NOT NULL DEFAULT 'NON_UNION',
    "unionId" TEXT,
    "agentId" TEXT,
    "agencyName" TEXT,
    "managerName" TEXT,
    "managerContact" TEXT,
    "actingSkills" TEXT[],
    "danceSkills" TEXT[],
    "martialArts" TEXT[],
    "musicalInstruments" TEXT[],
    "singingSkills" TEXT[],
    "languages" TEXT[],
    "dialects" TEXT[],
    "accents" TEXT[],
    "specialSkills" TEXT[],
    "marathiProficiency" "ExperienceLevel",
    "hindiProficiency" "ExperienceLevel",
    "englishProficiency" "ExperienceLevel",
    "gujaratiProficiency" "ExperienceLevel",
    "regionalExperience" TEXT[],
    "availabilityStatus" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "availableFrom" TIMESTAMP(3),
    "availableTo" TIMESTAMP(3),
    "minimumRate" DOUBLE PRECISION,
    "maximumRate" DOUBLE PRECISION,
    "preferredRate" DOUBLE PRECISION,
    "rateNegotiable" BOOLEAN NOT NULL DEFAULT true,
    "profileImageUrl" TEXT,
    "portfolioUrls" TEXT[],
    "instagramHandle" TEXT,
    "facebookProfile" TEXT,
    "linkedinProfile" TEXT,
    "youtubeChannel" TEXT,
    "websiteUrl" TEXT,
    "profileCompleteness" "ProfileCompleteness" NOT NULL DEFAULT 'BASIC',
    "profileScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "embedding" vector(1536),
    "searchTags" TEXT[],
    "aiGeneratedSummary" TEXT,
    "lastAiAnalysis" TIMESTAMP(3),
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "totalAuditions" INTEGER NOT NULL DEFAULT 0,
    "totalCallbacks" INTEGER NOT NULL DEFAULT 0,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "responseRate" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "responseTime" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "premiumExpiresAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "talents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actors" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "languages" TEXT[],
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "bio" TEXT,
    "experience" JSONB,
    "skills" TEXT[],
    "profileImageUrl" TEXT,
    "portfolioUrls" TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physical_attributes" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "talentId" TEXT,
    "eyeColor" TEXT,
    "eyeShape" TEXT,
    "hairColor" TEXT,
    "hairLength" TEXT,
    "hairTexture" TEXT,
    "hairStyle" TEXT,
    "bodyType" TEXT,
    "skinTone" TEXT,
    "ethnicity" TEXT,
    "facialHair" BOOLEAN NOT NULL DEFAULT false,
    "facialHairStyle" TEXT,
    "piercings" BOOLEAN NOT NULL DEFAULT false,
    "piercingDetails" TEXT,
    "tattoos" BOOLEAN NOT NULL DEFAULT false,
    "tattooDetails" TEXT,
    "scars" BOOLEAN NOT NULL DEFAULT false,
    "scarDetails" TEXT,
    "birthmarks" BOOLEAN NOT NULL DEFAULT false,
    "birthmarkDetails" TEXT,
    "glasses" BOOLEAN NOT NULL DEFAULT false,
    "contactLenses" BOOLEAN NOT NULL DEFAULT false,
    "dentalWork" TEXT,
    "fitnessLevel" TEXT,
    "flexibility" TEXT,
    "additionalNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physical_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talent_media" (
    "id" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "category" TEXT,
    "url" TEXT NOT NULL,
    "cloudinaryId" TEXT,
    "thumbnailUrl" TEXT,
    "title" TEXT,
    "description" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "dimensions" TEXT,
    "duration" INTEGER,
    "shotDate" TIMESTAMP(3),
    "photographer" TEXT,
    "makeupArtist" TEXT,
    "location" TEXT,
    "tags" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isWatermarked" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "talent_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actor_media" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "title" TEXT,
    "description" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "duration" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actor_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "casting_directors" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "companyName" TEXT,
    "designation" TEXT,
    "bio" TEXT,
    "profileImageUrl" TEXT,
    "yearsOfExperience" INTEGER NOT NULL DEFAULT 0,
    "specializations" TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "casting_directors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "productionHouse" TEXT,
    "designation" TEXT,
    "bio" TEXT,
    "profileImageUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "producers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "workingTitle" TEXT,
    "description" TEXT NOT NULL,
    "synopsis" TEXT,
    "logline" TEXT,
    "type" "ProjectType" NOT NULL,
    "genre" TEXT[],
    "subGenre" TEXT[],
    "targetAudience" TEXT,
    "contentRating" TEXT,
    "productionHouse" TEXT,
    "coproducers" TEXT[],
    "platform" TEXT,
    "languages" TEXT[],
    "dubLanguages" TEXT[],
    "subtitleLanguages" TEXT[],
    "totalBudget" DOUBLE PRECISION,
    "castingBudget" DOUBLE PRECISION,
    "budgetCurrency" TEXT NOT NULL DEFAULT 'INR',
    "paymentTerms" TEXT,
    "preProductionStart" TIMESTAMP(3),
    "castingStartDate" TIMESTAMP(3),
    "castingEndDate" TIMESTAMP(3),
    "auditionStartDate" TIMESTAMP(3),
    "auditionEndDate" TIMESTAMP(3),
    "callbackDeadline" TIMESTAMP(3),
    "shootingStartDate" TIMESTAMP(3),
    "shootingEndDate" TIMESTAMP(3),
    "wrapDate" TIMESTAMP(3),
    "releaseDate" TIMESTAMP(3),
    "shootingLocations" TEXT[],
    "auditionLocations" TEXT[],
    "studioName" TEXT,
    "directorName" TEXT,
    "directorId" TEXT,
    "writerName" TEXT,
    "musicDirector" TEXT,
    "cinematographer" TEXT,
    "castingDirectorId" TEXT,
    "assistantCDId" TEXT,
    "producerId" TEXT,
    "lineProducerId" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" TEXT,
    "confidentiality" TEXT,
    "ndaRequired" BOOLEAN NOT NULL DEFAULT false,
    "ndaDocument" TEXT,
    "posterUrl" TEXT,
    "bannerUrl" TEXT,
    "scriptUrl" TEXT,
    "referenceLinks" TEXT[],
    "totalRoles" INTEGER NOT NULL DEFAULT 0,
    "filledRoles" INTEGER NOT NULL DEFAULT 0,
    "unionProject" BOOLEAN NOT NULL DEFAULT false,
    "openToNewcomers" BOOLEAN NOT NULL DEFAULT true,
    "embedding" vector(1536),
    "searchKeywords" TEXT[],
    "aiSuggestedTalents" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "applicationCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alternateNames" TEXT[],
    "description" TEXT NOT NULL,
    "backstory" TEXT,
    "personality" TEXT,
    "characterArc" TEXT,
    "importance" "CharacterImportance" NOT NULL,
    "screenTime" TEXT,
    "numberOfScenes" INTEGER,
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "playingAge" TEXT,
    "gender" "Gender",
    "heightMin" DOUBLE PRECISION,
    "heightMax" DOUBLE PRECISION,
    "weightMin" DOUBLE PRECISION,
    "weightMax" DOUBLE PRECISION,
    "bodyType" TEXT,
    "ethnicity" TEXT,
    "specificLook" TEXT,
    "requiredSkills" TEXT[],
    "preferredSkills" TEXT[],
    "actingStyle" TEXT,
    "danceRequirements" TEXT[],
    "fightRequirements" TEXT[],
    "languageRequirements" TEXT[],
    "accentRequired" TEXT,
    "experienceLevel" "ExperienceLevel" NOT NULL,
    "culturalBackground" TEXT,
    "regionalOrigin" TEXT,
    "communityBackground" TEXT,
    "numberOfDays" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "locations" TEXT[],
    "nightShoots" BOOLEAN NOT NULL DEFAULT false,
    "intimateScenes" BOOLEAN NOT NULL DEFAULT false,
    "nudityRequired" BOOLEAN NOT NULL DEFAULT false,
    "stuntWork" BOOLEAN NOT NULL DEFAULT false,
    "compensation" DOUBLE PRECISION,
    "compensationType" TEXT,
    "compensationNotes" TEXT,
    "perks" TEXT[],
    "auditionType" "AuditionType"[],
    "auditionMaterial" TEXT,
    "callbackRequired" BOOLEAN NOT NULL DEFAULT false,
    "chemistryReadWith" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "applicationDeadline" TIMESTAMP(3),
    "targetCastingDate" TIMESTAMP(3),
    "selectedTalentId" TEXT,
    "backupTalentIds" TEXT[],
    "embedding" vector(1536),
    "idealProfileTraits" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "characterAge" TEXT,
    "gender" "Gender",
    "requiredSkills" TEXT[],
    "languages" TEXT[],
    "compensation" DOUBLE PRECISION,
    "compensationType" TEXT,
    "numberOfDays" INTEGER,
    "isLead" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "talentId" TEXT,
    "roleId" TEXT,
    "characterId" TEXT,
    "projectId" TEXT NOT NULL,
    "coverLetter" TEXT,
    "whyInterested" TEXT,
    "interpretation" TEXT,
    "proposedRate" DOUBLE PRECISION,
    "rateType" TEXT,
    "isNegotiable" BOOLEAN NOT NULL DEFAULT true,
    "availability" JSONB,
    "availableDates" TIMESTAMP(3)[],
    "blackoutDates" TIMESTAMP(3)[],
    "submittedMedia" TEXT[],
    "selftapeUrl" TEXT,
    "additionalLinks" TEXT[],
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "priority" TEXT,
    "source" TEXT,
    "referredBy" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewRating" INTEGER,
    "reviewNotes" TEXT,
    "matchScore" DOUBLE PRECISION,
    "matchFactors" JSONB,
    "aiRecommendation" TEXT,
    "lastContactDate" TIMESTAMP(3),
    "contactAttempts" INTEGER NOT NULL DEFAULT 0,
    "responseReceived" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditions" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "characterId" TEXT,
    "actorId" TEXT,
    "talentId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER NOT NULL,
    "timeSlot" TEXT,
    "auditionType" "AuditionType" NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT,
    "venueAddress" TEXT,
    "roomNumber" TEXT,
    "meetingLink" TEXT,
    "meetingPassword" TEXT,
    "dialInNumber" TEXT,
    "castingDirectorId" TEXT NOT NULL,
    "assistantCDId" TEXT,
    "directorPresent" BOOLEAN NOT NULL DEFAULT false,
    "producerPresent" BOOLEAN NOT NULL DEFAULT false,
    "observers" TEXT[],
    "panelMembers" JSONB,
    "scriptProvided" TEXT,
    "sceneNumbers" TEXT[],
    "preparationNotes" TEXT,
    "specialInstructions" TEXT,
    "dresscode" TEXT,
    "propsRequired" TEXT[],
    "cameraSetup" TEXT,
    "lightingNotes" TEXT,
    "audioRequirements" TEXT,
    "backgroundRequired" TEXT,
    "status" "AuditionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "checkedIn" BOOLEAN NOT NULL DEFAULT false,
    "checkedInAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "noShowReason" TEXT,
    "cancellationReason" TEXT,
    "rescheduledFrom" TEXT,
    "rescheduledCount" INTEGER NOT NULL DEFAULT 0,
    "performances" JSONB,
    "technicalSkills" JSONB,
    "overallRating" DOUBLE PRECISION,
    "lookRating" INTEGER,
    "actingRating" INTEGER,
    "voiceRating" INTEGER,
    "energyRating" INTEGER,
    "chemistryRating" INTEGER,
    "strengths" TEXT[],
    "improvements" TEXT[],
    "castingNotes" TEXT,
    "directorNotes" TEXT,
    "producerNotes" TEXT,
    "internalComments" TEXT,
    "talentFeedback" TEXT,
    "recordingUrl" TEXT,
    "recordingDuration" INTEGER,
    "thumbnailUrl" TEXT,
    "additionalMedia" TEXT[],
    "selftapeUrl" TEXT,
    "recommendation" TEXT,
    "callbackRecommended" BOOLEAN NOT NULL DEFAULT false,
    "finalDecision" TEXT,
    "decisionDate" TIMESTAMP(3),
    "decisionBy" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNotes" TEXT,
    "followUpDate" TIMESTAMP(3),
    "contractSent" BOOLEAN NOT NULL DEFAULT false,
    "contractSentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_bookmarks" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "talentId" TEXT,

    CONSTRAINT "project_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "castingDirectorId" TEXT,
    "reviewerId" TEXT NOT NULL,
    "reviewerRole" "UserRole" NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "projectName" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "talentId" TEXT,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_experiences" (
    "id" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "productionHouse" TEXT,
    "director" TEXT,
    "platform" TEXT,
    "year" INTEGER NOT NULL,
    "description" TEXT,
    "videoLink" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educations" (
    "id" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT,
    "field" TEXT,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "isCompleted" BOOLEAN NOT NULL DEFAULT true,
    "achievements" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "certificateUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferred_characters" (
    "id" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "characterType" TEXT NOT NULL,
    "description" TEXT,
    "examples" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preferred_characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_teams" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT,
    "permissions" JSONB,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "project_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_documents" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "version" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "isConfidential" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_updates" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audition_scripts" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pageNumbers" TEXT,
    "duration" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audition_scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_references" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audition_evaluations" (
    "id" TEXT NOT NULL,
    "auditionId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "evaluatorRole" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "notes" TEXT,
    "recommendation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audition_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_messages" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" "UserRole" NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talent_notes" (
    "id" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "projectId" TEXT,
    "note" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "talent_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_projects" (
    "id" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reason" TEXT,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "searchCriteria" JSONB NOT NULL,
    "frequency" TEXT,
    "lastRun" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "talents_userId_key" ON "talents"("userId");

-- CreateIndex
CREATE INDEX "talents_userId_idx" ON "talents"("userId");

-- CreateIndex
CREATE INDEX "talents_currentCity_currentState_idx" ON "talents"("currentCity", "currentState");

-- CreateIndex
CREATE INDEX "talents_isVerified_idx" ON "talents"("isVerified");

-- CreateIndex
CREATE INDEX "talents_availabilityStatus_idx" ON "talents"("availabilityStatus");

-- CreateIndex
CREATE INDEX "talents_profileCompleteness_idx" ON "talents"("profileCompleteness");

-- CreateIndex
CREATE INDEX "talents_rating_idx" ON "talents"("rating");

-- CreateIndex
CREATE INDEX "talents_yearsOfExperience_idx" ON "talents"("yearsOfExperience");

-- CreateIndex
CREATE INDEX "talents_languages_idx" ON "talents"("languages");

-- CreateIndex
CREATE INDEX "talents_actingSkills_idx" ON "talents"("actingSkills");

-- CreateIndex
CREATE INDEX "talents_searchTags_idx" ON "talents"("searchTags");

-- CreateIndex
CREATE UNIQUE INDEX "actors_userId_key" ON "actors"("userId");

-- CreateIndex
CREATE INDEX "actors_userId_idx" ON "actors"("userId");

-- CreateIndex
CREATE INDEX "actors_city_state_idx" ON "actors"("city", "state");

-- CreateIndex
CREATE INDEX "actors_isVerified_idx" ON "actors"("isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "physical_attributes_actorId_key" ON "physical_attributes"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "physical_attributes_talentId_key" ON "physical_attributes"("talentId");

-- CreateIndex
CREATE INDEX "talent_media_talentId_idx" ON "talent_media"("talentId");

-- CreateIndex
CREATE INDEX "talent_media_type_idx" ON "talent_media"("type");

-- CreateIndex
CREATE INDEX "talent_media_isPrimary_idx" ON "talent_media"("isPrimary");

-- CreateIndex
CREATE INDEX "actor_media_actorId_idx" ON "actor_media"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "casting_directors_userId_key" ON "casting_directors"("userId");

-- CreateIndex
CREATE INDEX "casting_directors_userId_idx" ON "casting_directors"("userId");

-- CreateIndex
CREATE INDEX "casting_directors_isVerified_idx" ON "casting_directors"("isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "producers_userId_key" ON "producers"("userId");

-- CreateIndex
CREATE INDEX "producers_userId_idx" ON "producers"("userId");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_type_idx" ON "projects"("type");

-- CreateIndex
CREATE INDEX "projects_castingDirectorId_idx" ON "projects"("castingDirectorId");

-- CreateIndex
CREATE INDEX "projects_producerId_idx" ON "projects"("producerId");

-- CreateIndex
CREATE INDEX "projects_castingEndDate_idx" ON "projects"("castingEndDate");

-- CreateIndex
CREATE INDEX "projects_shootingStartDate_idx" ON "projects"("shootingStartDate");

-- CreateIndex
CREATE INDEX "projects_languages_idx" ON "projects"("languages");

-- CreateIndex
CREATE INDEX "projects_shootingLocations_idx" ON "projects"("shootingLocations");

-- CreateIndex
CREATE INDEX "projects_isPublic_status_idx" ON "projects"("isPublic", "status");

-- CreateIndex
CREATE INDEX "projects_searchKeywords_idx" ON "projects"("searchKeywords");

-- CreateIndex
CREATE INDEX "characters_projectId_idx" ON "characters"("projectId");

-- CreateIndex
CREATE INDEX "characters_status_idx" ON "characters"("status");

-- CreateIndex
CREATE INDEX "characters_importance_idx" ON "characters"("importance");

-- CreateIndex
CREATE INDEX "characters_gender_idx" ON "characters"("gender");

-- CreateIndex
CREATE INDEX "characters_experienceLevel_idx" ON "characters"("experienceLevel");

-- CreateIndex
CREATE INDEX "roles_projectId_idx" ON "roles"("projectId");

-- CreateIndex
CREATE INDEX "roles_status_idx" ON "roles"("status");

-- CreateIndex
CREATE INDEX "applications_actorId_idx" ON "applications"("actorId");

-- CreateIndex
CREATE INDEX "applications_talentId_idx" ON "applications"("talentId");

-- CreateIndex
CREATE INDEX "applications_roleId_idx" ON "applications"("roleId");

-- CreateIndex
CREATE INDEX "applications_characterId_idx" ON "applications"("characterId");

-- CreateIndex
CREATE INDEX "applications_projectId_idx" ON "applications"("projectId");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE INDEX "applications_matchScore_idx" ON "applications"("matchScore");

-- CreateIndex
CREATE UNIQUE INDEX "applications_actorId_roleId_key" ON "applications"("actorId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "applications_talentId_characterId_key" ON "applications"("talentId", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "auditions_applicationId_key" ON "auditions"("applicationId");

-- CreateIndex
CREATE INDEX "auditions_projectId_idx" ON "auditions"("projectId");

-- CreateIndex
CREATE INDEX "auditions_actorId_idx" ON "auditions"("actorId");

-- CreateIndex
CREATE INDEX "auditions_talentId_idx" ON "auditions"("talentId");

-- CreateIndex
CREATE INDEX "auditions_castingDirectorId_idx" ON "auditions"("castingDirectorId");

-- CreateIndex
CREATE INDEX "auditions_scheduledAt_idx" ON "auditions"("scheduledAt");

-- CreateIndex
CREATE INDEX "auditions_status_idx" ON "auditions"("status");

-- CreateIndex
CREATE INDEX "auditions_auditionType_idx" ON "auditions"("auditionType");

-- CreateIndex
CREATE INDEX "auditions_round_idx" ON "auditions"("round");

-- CreateIndex
CREATE INDEX "auditions_overallRating_idx" ON "auditions"("overallRating");

-- CreateIndex
CREATE UNIQUE INDEX "project_bookmarks_actorId_projectId_key" ON "project_bookmarks"("actorId", "projectId");

-- CreateIndex
CREATE INDEX "reviews_actorId_idx" ON "reviews"("actorId");

-- CreateIndex
CREATE INDEX "reviews_castingDirectorId_idx" ON "reviews"("castingDirectorId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "work_experiences_talentId_idx" ON "work_experiences"("talentId");

-- CreateIndex
CREATE INDEX "educations_talentId_idx" ON "educations"("talentId");

-- CreateIndex
CREATE INDEX "achievements_talentId_idx" ON "achievements"("talentId");

-- CreateIndex
CREATE INDEX "preferred_characters_talentId_idx" ON "preferred_characters"("talentId");

-- CreateIndex
CREATE INDEX "project_teams_projectId_idx" ON "project_teams"("projectId");

-- CreateIndex
CREATE INDEX "project_teams_userId_idx" ON "project_teams"("userId");

-- CreateIndex
CREATE INDEX "project_documents_projectId_idx" ON "project_documents"("projectId");

-- CreateIndex
CREATE INDEX "project_updates_projectId_idx" ON "project_updates"("projectId");

-- CreateIndex
CREATE INDEX "audition_scripts_characterId_idx" ON "audition_scripts"("characterId");

-- CreateIndex
CREATE INDEX "character_references_characterId_idx" ON "character_references"("characterId");

-- CreateIndex
CREATE INDEX "audition_evaluations_auditionId_idx" ON "audition_evaluations"("auditionId");

-- CreateIndex
CREATE UNIQUE INDEX "audition_evaluations_auditionId_evaluatorId_key" ON "audition_evaluations"("auditionId", "evaluatorId");

-- CreateIndex
CREATE INDEX "application_messages_applicationId_idx" ON "application_messages"("applicationId");

-- CreateIndex
CREATE INDEX "talent_notes_talentId_idx" ON "talent_notes"("talentId");

-- CreateIndex
CREATE INDEX "talent_notes_authorId_idx" ON "talent_notes"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_projects_talentId_projectId_key" ON "blocked_projects"("talentId", "projectId");

-- CreateIndex
CREATE INDEX "saved_searches_talentId_idx" ON "saved_searches"("talentId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talents" ADD CONSTRAINT "talents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actors" ADD CONSTRAINT "actors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_attributes" ADD CONSTRAINT "physical_attributes_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_attributes" ADD CONSTRAINT "physical_attributes_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "talents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_media" ADD CONSTRAINT "talent_media_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "talents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actor_media" ADD CONSTRAINT "actor_media_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casting_directors" ADD CONSTRAINT "casting_directors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producers" ADD CONSTRAINT "producers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_castingDirectorId_fkey" FOREIGN KEY ("castingDirectorId") REFERENCES "casting_directors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "producers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "talents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditions" ADD CONSTRAINT "auditions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditions" ADD CONSTRAINT "auditions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditions" ADD CONSTRAINT "auditions_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditions" ADD CONSTRAINT "auditions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditions" ADD CONSTRAINT "auditions_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "talents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditions" ADD CONSTRAINT "auditions_castingDirectorId_fkey" FOREIGN KEY ("castingDirectorId") REFERENCES "casting_directors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_bookmarks" ADD CONSTRAINT "project_bookmarks_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_bookmarks" ADD CONSTRAINT "project_bookmarks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_bookmarks" ADD CONSTRAINT "project_bookmarks_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "talents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_castingDirectorId_fkey" FOREIGN KEY ("castingDirectorId") REFERENCES "casting_directors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "talents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_experiences" ADD CONSTRAINT "work_experiences_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "talents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educations" ADD CONSTRAINT "educations_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "talents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "talents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferred_characters" ADD CONSTRAINT "preferred_characters_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "talents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_teams" ADD CONSTRAINT "project_teams_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audition_scripts" ADD CONSTRAINT "audition_scripts_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_references" ADD CONSTRAINT "character_references_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audition_evaluations" ADD CONSTRAINT "audition_evaluations_auditionId_fkey" FOREIGN KEY ("auditionId") REFERENCES "auditions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_messages" ADD CONSTRAINT "application_messages_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_notes" ADD CONSTRAINT "talent_notes_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "talents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_projects" ADD CONSTRAINT "blocked_projects_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "talents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "talents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

