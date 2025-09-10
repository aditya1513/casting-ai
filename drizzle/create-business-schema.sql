-- Business Schema Migration for CastMatch
-- This script creates the new business-only schema removing authentication tables
-- Created: 2025-09-08

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS auditions CASCADE;  
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS memories CASCADE;
DROP TABLE IF EXISTS talents CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS talent_status CASCADE;
DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS application_status CASCADE;

-- Create ENUMS
CREATE TYPE talent_status AS ENUM (
  'active',
  'inactive', 
  'pending_verification',
  'suspended'
);

CREATE TYPE project_status AS ENUM (
  'planning',
  'casting',
  'in_production',
  'post_production',
  'completed',
  'cancelled'
);

CREATE TYPE application_status AS ENUM (
  'submitted',
  'under_review',
  'shortlisted',
  'callback_scheduled',
  'selected',
  'rejected'
);

-- Create talents table
CREATE TABLE talents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- Auth0 user reference (no foreign key since Auth0 manages users)
  auth0_user_id TEXT NOT NULL UNIQUE,
  
  -- Basic Information
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "phoneNumber" TEXT,
  "dateOfBirth" DATE,
  gender TEXT,
  bio TEXT,
  
  -- Professional Information
  experience TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  portfolio JSONB DEFAULT '[]'::jsonb,
  
  -- Physical Attributes
  height INTEGER, -- in cm
  weight INTEGER, -- in kg
  "eyeColor" TEXT,
  "hairColor" TEXT,
  
  -- Location
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  
  -- Status and Metadata
  status talent_status DEFAULT 'active',
  "profilePicture" TEXT,
  
  -- AI/ML Enhancement Fields
  embedding JSONB, -- Vector embedding for AI matching
  tags JSONB DEFAULT '[]'::jsonb, -- AI-generated tags
  "lastProfileUpdate" TIMESTAMP,
  
  -- Timestamps
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create projects table
CREATE TABLE projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- Project Basic Information
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  genre TEXT,
  language TEXT DEFAULT 'Hindi',
  
  -- Production Details
  "productionHouse" TEXT,
  director TEXT,
  producer TEXT,
  
  -- Casting Information
  "castingDirector" TEXT,
  "castingDirectorAuth0Id" TEXT, -- Reference to Auth0 user
  
  -- Timeline
  "startDate" TIMESTAMP,
  "endDate" TIMESTAMP,
  "applicationDeadline" TIMESTAMP,
  
  -- Budget and Compensation
  budget DECIMAL(15,2),
  compensation JSONB, -- {min: number, max: number, currency: string}
  
  -- Requirements
  "ageRange" JSONB, -- {min: number, max: number}
  requirements JSONB DEFAULT '[]'::jsonb,
  
  -- Status and Metadata
  status project_status DEFAULT 'planning',
  "isPublic" BOOLEAN DEFAULT true,
  
  -- AI/ML Enhancement
  embedding JSONB, -- Vector embedding for AI matching
  
  -- Timestamps
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create applications table
CREATE TABLE applications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- References
  "talentId" TEXT NOT NULL REFERENCES talents(id) ON DELETE CASCADE,
  "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Application Details
  status application_status DEFAULT 'submitted',
  "appliedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "coverLetter" TEXT,
  "portfolioLinks" JSONB DEFAULT '[]'::jsonb,
  
  -- Casting Director Notes
  "castingNotes" TEXT,
  "ratingScore" INTEGER CHECK ("ratingScore" >= 1 AND "ratingScore" <= 10),
  
  -- Timeline
  "reviewedAt" TIMESTAMP,
  "callbackDate" TIMESTAMP,
  
  -- AI Enhancement
  "matchScore" DECIMAL(5,2), -- AI-calculated match score
  
  -- Timestamps
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- Constraints
  UNIQUE("talentId", "projectId") -- Prevent duplicate applications
);

-- Create conversations table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- User reference (Auth0 managed)
  "userId" TEXT NOT NULL, -- Auth0 user ID
  
  -- Conversation metadata
  title TEXT,
  "lastMessageAt" TIMESTAMP,
  "messageCount" INTEGER DEFAULT 0,
  
  -- Timestamps
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create messages table  
CREATE TABLE messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- References
  "conversationId" TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  "userId" TEXT, -- NULL for AI responses
  
  -- Message content
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text', -- 'text', 'image', 'video', 'audio', 'document', 'system'
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Message characteristics
  "isAiResponse" BOOLEAN DEFAULT false,
  "parentMessageId" TEXT REFERENCES messages(id),
  
  -- Lifecycle
  "editedAt" TIMESTAMP,
  "deletedAt" TIMESTAMP,
  
  -- Timestamps
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create memories table
CREATE TABLE memories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- User reference (Auth0 managed)
  "userId" TEXT NOT NULL,
  
  -- Memory content
  content TEXT NOT NULL,
  summary TEXT,
  
  -- Classification
  type TEXT DEFAULT 'conversation', -- 'conversation', 'preference', 'fact', 'goal'
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  
  -- Context
  "sourceType" TEXT, -- 'chat', 'profile', 'application', 'project'
  "sourceId" TEXT,
  
  -- AI Enhancement
  embedding JSONB, -- Vector embedding for semantic search
  tags JSONB DEFAULT '[]'::jsonb,
  
  -- Lifecycle
  "accessCount" INTEGER DEFAULT 0,
  "lastAccessedAt" TIMESTAMP,
  "expiresAt" TIMESTAMP,
  
  -- Timestamps  
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_talents_email ON talents(email);
CREATE UNIQUE INDEX idx_talents_auth0_user ON talents(auth0_user_id);
CREATE INDEX idx_talents_status ON talents(status);
CREATE INDEX idx_talents_location ON talents(city, state);

CREATE INDEX idx_projects_title ON projects(title);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_casting_director ON projects("castingDirectorAuth0Id");
CREATE INDEX idx_projects_deadline ON projects("applicationDeadline");

CREATE INDEX idx_applications_talent ON applications("talentId");
CREATE INDEX idx_applications_project ON applications("projectId");  
CREATE INDEX idx_applications_status ON applications(status);

CREATE INDEX idx_conversations_user ON conversations("userId");
CREATE INDEX idx_conversations_last_message ON conversations("lastMessageAt");

CREATE INDEX idx_messages_conversation ON messages("conversationId");
CREATE INDEX idx_messages_user ON messages("userId");
CREATE INDEX idx_messages_timestamp ON messages("createdAt");

CREATE INDEX idx_memories_user ON memories("userId");
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_source ON memories("sourceType", "sourceId");

-- Create update triggers to automatically update updatedAt timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_talents_updated_at BEFORE UPDATE ON talents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO talents (auth0_user_id, "firstName", "lastName", email, bio, city, state, status) VALUES
('auth0|sample1', 'Priya', 'Sharma', 'priya@example.com', 'Experienced actress with 5 years in Mumbai film industry.', 'Mumbai', 'Maharashtra', 'active'),
('auth0|sample2', 'Arjun', 'Kumar', 'arjun@example.com', 'Theater background actor looking for OTT opportunities.', 'Delhi', 'Delhi', 'active'),
('auth0|sample3', 'Sneha', 'Patel', 'sneha@example.com', 'Fresh graduate from acting school with dance skills.', 'Ahmedabad', 'Gujarat', 'pending_verification');

COMMENT ON TABLE talents IS 'Talent profiles for actors, performers, and crew members';
COMMENT ON TABLE projects IS 'Casting projects including movies, web series, commercials';  
COMMENT ON TABLE applications IS 'Applications submitted by talents to projects';
COMMENT ON TABLE conversations IS 'AI chat conversations with users';
COMMENT ON TABLE messages IS 'Messages within conversations';
COMMENT ON TABLE memories IS 'Long-term memory storage for AI personalization';