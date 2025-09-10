#!/bin/bash

# CastMatch AI Service Startup Script
# Production-ready startup with health checks

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           CastMatch AI Service - Production Startup           ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# Check for required environment variables
check_env() {
    if [ -z "${!1}" ]; then
        echo "❌ ERROR: $1 is not set in environment"
        return 1
    else
        echo "✅ $1 is configured"
        return 0
    fi
}

# Load environment variables
if [ -f .env ]; then
    echo "📁 Loading environment from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  No .env file found, using system environment variables"
fi

echo ""
echo "🔍 Checking required configuration..."
echo "════════════════════════════════════════"

# Check critical environment variables
MISSING_CONFIG=0

if ! check_env "DATABASE_URL"; then
    MISSING_CONFIG=1
fi

if ! check_env "OPENAI_API_KEY"; then
    echo "   ⚠️  OpenAI integration will be disabled"
fi

if ! check_env "JWT_SECRET"; then
    MISSING_CONFIG=1
fi

if [ $MISSING_CONFIG -eq 1 ]; then
    echo ""
    echo "❌ Critical configuration missing! Please set required environment variables."
    echo "   Copy .env.example to .env and fill in your values."
    exit 1
fi

echo ""
echo "🚀 Starting CastMatch AI Backend Service..."
echo "════════════════════════════════════════"

# Start the server
bun run src/server-hono.ts