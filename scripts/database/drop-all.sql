-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "talents" DROP CONSTRAINT "talents_userId_fkey";

-- DropForeignKey
ALTER TABLE "actors" DROP CONSTRAINT "actors_userId_fkey";

-- DropForeignKey
ALTER TABLE "physical_attributes" DROP CONSTRAINT "physical_attributes_actorId_fkey";

-- DropForeignKey
ALTER TABLE "physical_attributes" DROP CONSTRAINT "physical_attributes_talentId_fkey";

-- DropForeignKey
ALTER TABLE "talent_media" DROP CONSTRAINT "talent_media_talentId_fkey";

-- DropForeignKey
ALTER TABLE "actor_media" DROP CONSTRAINT "actor_media_actorId_fkey";

-- DropForeignKey
ALTER TABLE "casting_directors" DROP CONSTRAINT "casting_directors_userId_fkey";

-- DropForeignKey
ALTER TABLE "producers" DROP CONSTRAINT "producers_userId_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_castingDirectorId_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_producerId_fkey";

-- DropForeignKey
ALTER TABLE "characters" DROP CONSTRAINT "characters_projectId_fkey";

-- DropForeignKey
ALTER TABLE "roles" DROP CONSTRAINT "roles_projectId_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_actorId_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_talentId_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_roleId_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_characterId_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_projectId_fkey";

-- DropForeignKey
ALTER TABLE "auditions" DROP CONSTRAINT "auditions_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "auditions" DROP CONSTRAINT "auditions_projectId_fkey";

-- DropForeignKey
ALTER TABLE "auditions" DROP CONSTRAINT "auditions_characterId_fkey";

-- DropForeignKey
ALTER TABLE "auditions" DROP CONSTRAINT "auditions_actorId_fkey";

-- DropForeignKey
ALTER TABLE "auditions" DROP CONSTRAINT "auditions_talentId_fkey";

-- DropForeignKey
ALTER TABLE "auditions" DROP CONSTRAINT "auditions_castingDirectorId_fkey";

-- DropForeignKey
ALTER TABLE "project_bookmarks" DROP CONSTRAINT "project_bookmarks_actorId_fkey";

-- DropForeignKey
ALTER TABLE "project_bookmarks" DROP CONSTRAINT "project_bookmarks_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_bookmarks" DROP CONSTRAINT "project_bookmarks_talentId_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_actorId_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_castingDirectorId_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_talentId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "work_experiences" DROP CONSTRAINT "work_experiences_talentId_fkey";

-- DropForeignKey
ALTER TABLE "educations" DROP CONSTRAINT "educations_talentId_fkey";

-- DropForeignKey
ALTER TABLE "achievements" DROP CONSTRAINT "achievements_talentId_fkey";

-- DropForeignKey
ALTER TABLE "preferred_characters" DROP CONSTRAINT "preferred_characters_talentId_fkey";

-- DropForeignKey
ALTER TABLE "project_teams" DROP CONSTRAINT "project_teams_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_documents" DROP CONSTRAINT "project_documents_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_updates" DROP CONSTRAINT "project_updates_projectId_fkey";

-- DropForeignKey
ALTER TABLE "audition_scripts" DROP CONSTRAINT "audition_scripts_characterId_fkey";

-- DropForeignKey
ALTER TABLE "character_references" DROP CONSTRAINT "character_references_characterId_fkey";

-- DropForeignKey
ALTER TABLE "audition_evaluations" DROP CONSTRAINT "audition_evaluations_auditionId_fkey";

-- DropForeignKey
ALTER TABLE "application_messages" DROP CONSTRAINT "application_messages_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "talent_notes" DROP CONSTRAINT "talent_notes_talentId_fkey";

-- DropForeignKey
ALTER TABLE "blocked_projects" DROP CONSTRAINT "blocked_projects_talentId_fkey";

-- DropForeignKey
ALTER TABLE "saved_searches" DROP CONSTRAINT "saved_searches_talentId_fkey";

-- DropTable
DROP TABLE "users";

-- DropTable
DROP TABLE "sessions";

-- DropTable
DROP TABLE "talents";

-- DropTable
DROP TABLE "actors";

-- DropTable
DROP TABLE "physical_attributes";

-- DropTable
DROP TABLE "talent_media";

-- DropTable
DROP TABLE "actor_media";

-- DropTable
DROP TABLE "casting_directors";

-- DropTable
DROP TABLE "producers";

-- DropTable
DROP TABLE "projects";

-- DropTable
DROP TABLE "characters";

-- DropTable
DROP TABLE "roles";

-- DropTable
DROP TABLE "applications";

-- DropTable
DROP TABLE "auditions";

-- DropTable
DROP TABLE "project_bookmarks";

-- DropTable
DROP TABLE "reviews";

-- DropTable
DROP TABLE "notifications";

-- DropTable
DROP TABLE "work_experiences";

-- DropTable
DROP TABLE "educations";

-- DropTable
DROP TABLE "achievements";

-- DropTable
DROP TABLE "preferred_characters";

-- DropTable
DROP TABLE "project_teams";

-- DropTable
DROP TABLE "project_documents";

-- DropTable
DROP TABLE "project_updates";

-- DropTable
DROP TABLE "audition_scripts";

-- DropTable
DROP TABLE "character_references";

-- DropTable
DROP TABLE "audition_evaluations";

-- DropTable
DROP TABLE "application_messages";

-- DropTable
DROP TABLE "talent_notes";

-- DropTable
DROP TABLE "blocked_projects";

-- DropTable
DROP TABLE "saved_searches";

-- DropEnum
DROP TYPE "UserRole";

-- DropEnum
DROP TYPE "Gender";

-- DropEnum
DROP TYPE "ProjectStatus";

-- DropEnum
DROP TYPE "ProjectType";

-- DropEnum
DROP TYPE "AuditionStatus";

-- DropEnum
DROP TYPE "AuditionType";

-- DropEnum
DROP TYPE "ApplicationStatus";

-- DropEnum
DROP TYPE "UnionStatus";

-- DropEnum
DROP TYPE "CharacterImportance";

-- DropEnum
DROP TYPE "ExperienceLevel";

-- DropEnum
DROP TYPE "AvailabilityStatus";

-- DropEnum
DROP TYPE "MediaType";

-- DropEnum
DROP TYPE "ProfileCompleteness";

