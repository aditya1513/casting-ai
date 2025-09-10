# CastMatch - Mumbai's Premier Casting Platform

A modern casting platform with **Express.js backend** and **Remix frontend**, featuring **Clerk** authentication, designed for Mumbai's OTT entertainment industry.

## Architecture

- **Backend**: Express.js API server (port 3001)
- **Frontend**: Remix application (port 3000)  
- **Authentication**: Clerk (integrated across both layers)
- **Database**: PostgreSQL + Drizzle ORM
- **Vector Search**: Qdrant
- **Cache/Sessions**: Redis/Dragonfly

## Tech Stack

### Backend
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Vector Database**: Qdrant (migrated from Pinecone)
- **Cache**: Redis/Dragonfly
- **Authentication**: Clerk integration
- **AI Services**: Anthropic Claude, OpenAI

### Frontend  
- **Framework**: Remix (React-based)
- **Authentication**: Clerk
- **Styling**: Tailwind CSS + HeroUI
- **Build Tool**: Vite
- **Package Manager**: Bun

## Quick Start

1. **Install dependencies** (both backend and frontend):
   ```bash
   bun install
   cd frontend && bun install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Add your Clerk keys, database URL, and API keys
   ```

3. **Start services**:
   ```bash
   # Start backend (port 3001)
   bun run dev
   
   # Start frontend (port 3000) - in separate terminal
   cd frontend && bun run dev
   
   # Or start both with Docker Compose
   docker-compose up -d
   ```

## Project Structure

```
├── src/                     # Backend Express.js application
│   ├── config/             # Database, Redis, app configuration
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic and AI services
│   ├── middleware/         # Auth, validation, error handling
│   └── server.ts          # Express server entry point
├── frontend/               # Remix frontend application
│   ├── app/               # Remix app directory
│   │   ├── components/    # React components
│   │   ├── routes/        # Frontend routes
│   │   └── root.tsx      # Root layout with Clerk
│   └── package.json      # Frontend dependencies
├── docker-compose.yml     # Services orchestration
└── package.json          # Backend dependencies
```

## Services

- **Backend API**: `http://localhost:3001`
- **Frontend**: `http://localhost:3000` 
- **Database**: PostgreSQL on port 5432
- **Redis**: Dragonfly on port 6379
- **Qdrant**: Vector database on port 6333

## Recent Migrations

- **Next.js → Remix**: Frontend migrated for better SSR and performance
- **Auth0 → Clerk**: Authentication system modernized
- **Pinecone → Qdrant**: Vector database migration for better performance and cost