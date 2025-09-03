-- PostgreSQL initialization script
-- Ensure proper database permissions and configuration

-- Connect to the database
\c castmatch_db;

-- Grant all privileges to postgres user
GRANT ALL PRIVILEGES ON DATABASE castmatch_db TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;

-- Ensure postgres user can create schemas
ALTER USER postgres CREATEDB SUPERUSER;

-- Show confirmation
SELECT 'Database initialization completed successfully' AS status;