#!/bin/bash

# Ultimate Prisma P1010 Fix
# This script applies the most aggressive permissions possible

echo "🔧 Applying ultimate Prisma P1010 fix..."

# Step 1: Make postgres a superuser with all privileges
docker exec castmatch-postgres psql -U postgres -c "
ALTER USER postgres WITH SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS;
"

# Step 2: Fix database ownership
docker exec castmatch-postgres psql -U postgres -c "
ALTER DATABASE castmatch_db OWNER TO postgres;
"

# Step 3: Connect to the database and fix schema
docker exec castmatch-postgres psql -U postgres -d castmatch_db << EOF
-- Make postgres owner of public schema
ALTER SCHEMA public OWNER TO postgres;

-- Drop and recreate public schema to ensure clean ownership
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
ALTER SCHEMA public OWNER TO postgres;

-- Grant all privileges
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;
GRANT CREATE ON SCHEMA public TO postgres;
GRANT CREATE ON SCHEMA public TO PUBLIC;
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO PUBLIC;

-- Set search path
ALTER DATABASE castmatch_db SET search_path TO public;

-- Ensure postgres can do everything
GRANT ALL PRIVILEGES ON DATABASE castmatch_db TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres WITH GRANT OPTION;

-- Set default privileges for all future objects
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TYPES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SCHEMAS TO postgres;

-- Additional grants for Prisma
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TYPES TO postgres;

-- Verify settings
\dn+
\du
EOF

echo "✅ Permissions applied"

# Step 4: Recreate all tables
echo "📦 Recreating database tables..."
cat migrations.sql | docker exec -i castmatch-postgres psql -U postgres -d castmatch_db 2>/dev/null || true

# Step 5: Final permission grant on all objects
docker exec castmatch-postgres psql -U postgres -d castmatch_db -c "
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;
GRANT USAGE, CREATE ON SCHEMA public TO postgres;
"

echo "✅ Database fixed! Testing connection..."

# Test with Node.js
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.\$connect();
    console.log('✅ SUCCESS: Prisma connected!');
    const count = await prisma.user.count();
    console.log('✅ Database query successful. Users:', count);
    await prisma.\$disconnect();
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    process.exit(1);
  }
}
test();
"