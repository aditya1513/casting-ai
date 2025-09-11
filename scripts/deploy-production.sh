#!/bin/bash

# CastMatch Production Deployment Script
# This script deploys CastMatch to production using Docker Compose

set -e  # Exit on any error

echo "🚀 Starting CastMatch Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production file not found!${NC}"
    echo -e "${YELLOW}📋 Please copy .env.production.example to .env.production and fill in your values${NC}"
    exit 1
fi

# Load environment variables
export $(cat .env.production | xargs)

echo -e "${BLUE}📋 Pre-deployment Checklist${NC}"
echo "1. ✅ Environment variables loaded"

# Check if required environment variables are set
required_vars=("POSTGRES_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET" "OPENAI_API_KEY" "CLERK_SECRET_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    printf '%s\n' "${missing_vars[@]}"
    exit 1
fi

echo "2. ✅ Required environment variables verified"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo "3. ✅ Docker is running"

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose is not installed${NC}"
    exit 1
fi

echo "4. ✅ Docker Compose available"

echo -e "${YELLOW}🏗️  Building production images...${NC}"

# Build images
docker-compose -f docker-compose.production.yml build --no-cache

echo -e "${YELLOW}🗃️  Stopping existing containers...${NC}"

# Stop existing containers
docker-compose -f docker-compose.production.yml down

echo -e "${YELLOW}🚀 Starting production deployment...${NC}"

# Start services
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"

# Check backend health
for i in {1..30}; do
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend failed to start within 30 seconds${NC}"
        docker-compose -f docker-compose.production.yml logs backend
        exit 1
    fi
    sleep 1
done

# Check frontend health
for i in {1..30}; do
    if curl -f http://localhost:3000/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Frontend failed to start within 30 seconds${NC}"
        docker-compose -f docker-compose.production.yml logs frontend
        exit 1
    fi
    sleep 1
done

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
docker-compose -f docker-compose.production.yml ps

echo ""
echo -e "${BLUE}🌐 Access URLs:${NC}"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:3001/api"
echo "Health Check: http://localhost/health"

echo ""
echo -e "${BLUE}📝 Useful Commands:${NC}"
echo "View logs: docker-compose -f docker-compose.production.yml logs -f"
echo "Stop services: docker-compose -f docker-compose.production.yml down"
echo "Restart: docker-compose -f docker-compose.production.yml restart"

echo ""
echo -e "${GREEN}✅ CastMatch is now running in production mode!${NC}"