-- Fix Prisma P1010 error permanently
-- This script runs automatically when PostgreSQL container starts

-- Ensure postgres user has all privileges
ALTER USER postgres WITH SUPERUSER;

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE castmatch_db TO postgres;

-- Connect to the castmatch_db database
\c castmatch_db;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT CREATE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO postgres;

-- Grant all privileges on all tables (including future ones)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TYPES TO postgres;

-- Make postgres the owner of the public schema
ALTER SCHEMA public OWNER TO postgres;

-- Grant permissions for existing objects
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Ensure postgres can create extensions (needed for vector types)
GRANT CREATE ON DATABASE castmatch_db TO postgres;

-- Create pgvector extension if needed (for AI features)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log successful initialization
DO $$
BEGIN
  RAISE NOTICE 'Database permissions configured successfully for Prisma';
END $$;