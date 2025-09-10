#!/bin/bash

# Prisma schema generation and migration through Docker
# This script works around the P1010 issue by running Prisma commands inside the container

set -e

echo "Installing Node.js and Prisma in container..."
docker exec castmatch-postgres sh -c '
apk add --no-cache nodejs npm
npm install -g prisma @prisma/client
'

echo "Copying schema to container..."
docker cp prisma/schema.prisma castmatch-postgres:/tmp/schema.prisma

echo "Running Prisma commands in container..."
docker exec castmatch-postgres sh -c '
cd /tmp
export DATABASE_URL="postgresql://postgres@localhost:5432/castmatch_db"
prisma generate --schema=schema.prisma
prisma db push --schema=schema.prisma
'

echo "Prisma setup completed!"
