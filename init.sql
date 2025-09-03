-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ACTOR', 'CASTING_DIRECTOR', 'PRODUCER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CASTING', 'IN_PRODUCTION', 'POST_PRODUCTION', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'SHORTLISTED', 'AUDITIONED', 'SELECTED', 'REJECTED', 'WITHDRAWN');

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
    "actorId" TEXT NOT NULL,
    "eyeColor" TEXT,
    "hairColor" TEXT,
    "hairLength" TEXT,
    "bodyType" TEXT,
    "skinTone" TEXT,
    "facialHair" BOOLEAN NOT NULL DEFAULT false,
    "piercings" BOOLEAN NOT NULL DEFAULT false,
    "tattoos" BOOLEAN NOT NULL DEFAULT false,
    "scars" BOOLEAN NOT NULL DEFAULT false,
    "additionalNotes" TEXT,

    CONSTRAINT "physical_attributes_pkey" PRIMARY KEY ("id")
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
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "genre" TEXT[],
    "languages" TEXT[],
    "budget" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "shootingLocations" TEXT[],
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "posterUrl" TEXT,
    "castingDeadline" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "applicationCount" INTEGER NOT NULL DEFAULT 0,
    "castingDirectorId" TEXT,
    "producerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
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
    "actorId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "coverLetter" TEXT,
    "proposedRate" DOUBLE PRECISION,
    "availability" JSONB,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditions" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "castingDirectorId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "location" TEXT,
    "meetingLink" TEXT,
    "instructions" TEXT,
    "status" "AuditionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "feedback" TEXT,
    "rating" INTEGER,
    "recordingUrl" TEXT,
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
CREATE INDEX "projects_castingDirectorId_idx" ON "projects"("castingDirectorId");

-- CreateIndex
CREATE INDEX "projects_producerId_idx" ON "projects"("producerId");

-- CreateIndex
CREATE INDEX "projects_castingDeadline_idx" ON "projects"("castingDeadline");

-- CreateIndex
CREATE INDEX "roles_projectId_idx" ON "roles"("projectId");

-- CreateIndex
CREATE INDEX "roles_status_idx" ON "roles"("status");

-- CreateIndex
CREATE INDEX "applications_actorId_idx" ON "applications"("actorId");

-- CreateIndex
CREATE INDEX "applications_roleId_idx" ON "applications"("roleId");

-- CreateIndex
CREATE INDEX "applications_projectId_idx" ON "applications"("projectId");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "applications_actorId_roleId_key" ON "applications"("actorId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "auditions_applicationId_key" ON "auditions"("applicationId");

-- CreateIndex
CREATE INDEX "auditions_projectId_idx" ON "auditions"("projectId");

-- CreateIndex
CREATE INDEX "auditions_actorId_idx" ON "auditions"("actorId");

-- CreateIndex
CREATE INDEX "auditions_castingDirectorId_idx" ON "auditions"("castingDirectorId");

-- CreateIndex
CREATE INDEX "auditions_scheduledAt_idx" ON "auditions"("scheduledAt");

-- CreateIndex
CREATE INDEX "auditions_status_idx" ON "auditions"("status");

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

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actors" ADD CONSTRAINT "actors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_attributes" ADD CONSTRAINT "physical_attributes_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "roles" ADD CONSTRAINT "roles_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditions" ADD CONSTRAINT "auditions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditions" ADD CONSTRAINT "auditions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditions" ADD CONSTRAINT "auditions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditions" ADD CONSTRAINT "auditions_castingDirectorId_fkey" FOREIGN KEY ("castingDirectorId") REFERENCES "casting_directors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_bookmarks" ADD CONSTRAINT "project_bookmarks_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_bookmarks" ADD CONSTRAINT "project_bookmarks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_castingDirectorId_fkey" FOREIGN KEY ("castingDirectorId") REFERENCES "casting_directors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

