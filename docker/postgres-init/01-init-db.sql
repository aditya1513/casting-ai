-- PostgreSQL initialization script for CastMatch database
-- This script ensures proper permissions for the postgres user

-- Ensure the database exists (Docker will create it, but we can ensure it's configured properly)
\connect castmatch_db;

-- Grant all privileges on the database to the postgres user (redundant but ensures it)
GRANT ALL PRIVILEGES ON DATABASE castmatch_db TO postgres;

-- Grant all privileges on the public schema
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TYPES TO postgres;

-- Ensure postgres is the owner of the public schema
ALTER SCHEMA public OWNER TO postgres;

-- Create any additional schemas if needed
CREATE SCHEMA IF NOT EXISTS castmatch AUTHORIZATION postgres;

-- Grant usage and create privileges on schemas
GRANT CREATE, USAGE ON SCHEMA public TO postgres;
GRANT CREATE, USAGE ON SCHEMA castmatch TO postgres;

-- Set search path to include both schemas
ALTER DATABASE castmatch_db SET search_path TO public, castmatch;

-- Ensure the postgres user can create extensions (needed for UUID, etc.)
GRANT CREATE ON DATABASE castmatch_db TO postgres;

-- Create commonly needed extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'CastMatch database initialized successfully with proper permissions';
END $$;