# CastMatch - Byterover Handbook

*Generated: 2025-01-10*
*Version: 1.0*
*Project: casting-ai*

---

## Layer 1: System Overview

### Purpose
CastMatch is Mumbai's premier AI-powered casting platform designed for the OTT entertainment industry. It connects casting directors, producers, and actors through intelligent talent matching, script analysis, and audition management workflows.

### Architecture Pattern
**Full-Stack Microservices Architecture**
- **Frontend**: Remix (React-based) application on port 3000
- **Backend**: Express.js API server on port 3001
- **Database**: PostgreSQL with Drizzle ORM for relational data
- **Vector Database**: Qdrant for AI-powered search and matching
- **Cache Layer**: Redis/Dragonfly for sessions and performance
- **Authentication**: Clerk integration across both layers

### Tech Stack

#### Backend Core
- **Runtime**: Bun (primary) with Node.js fallback
- **Framework**: Express.js + TypeScript
- **Database ORM**: Drizzle with PostgreSQL
- **Vector Search**: Qdrant (migrated from Pinecone)
- **Cache**: Redis/Dragonfly
- **AI Services**: Anthropic Claude, OpenAI, Google AI Platform
- **File Storage**: AWS S3 with presigned URLs
- **Real-time**: Socket.io for live interactions

#### Frontend Core
- **Framework**: Remix with Vite build system
- **Styling**: Tailwind CSS + HeroUI components
- **Authentication**: Clerk React integration
- **Package Manager**: Bun (primary), PNPM (fallback)

#### Infrastructure
- **Containerization**: Docker Compose orchestration
- **Monitoring**: Prometheus + Grafana, Winston logging
- **Testing**: Jest (unit), Playwright (e2e), Artillery (performance)
- **CI/CD**: GitHub Actions with automated deployments
- **Message Queues**: Bull for background job processing

### Key Technical Decisions
1. **Qdrant Migration**: Moved from Pinecone to Qdrant for cost optimization and performance
2. **Remix Adoption**: Migrated frontend from Next.js to Remix for better SSR performance
3. **Clerk Authentication**: Replaced Auth0 with Clerk for simplified auth workflows
4. **Bun Runtime**: Adopted Bun as primary runtime for faster startup and package management

---

## Layer 2: Module Map

### Core Business Logic Modules

#### Authentication & Security (`src/middleware/`, `src/services/auth.service.ts`)
- **Clerk Integration**: Primary authentication provider
- **JWT Middleware**: Token validation and user context
- **Rate Limiting**: Multi-layer protection with Redis backing
- **CSRF Protection**: Form and API security
- **Role-Based Access**: Actor, Casting Director, Producer, Admin roles

#### AI & Machine Learning (`src/services/ai-ml/`, `src/routes/ai-ml.routes.ts`)
- **Claude Integration**: Anthropic Claude for conversational AI
- **Script Analysis**: NLP processing for character extraction and scene analysis
- **Talent Matching**: Vector similarity search with Qdrant
- **Embedding Generation**: Text and profile vectorization
- **Chat System**: AI-powered casting conversations

#### Talent Management (`src/services/talent.service.ts`, `src/controllers/talent*.controller.ts`)
- **Profile CRUD**: Actor profile management and validation
- **Portfolio Handling**: Headshots, reels, and document management
- **Search & Discovery**: Advanced filtering with AI recommendations
- **Verification System**: Profile authenticity and skill validation

#### Communication & Workflow (`src/services/realtime.service.ts`, `src/integrations/`)
- **Real-time Messaging**: Socket.io for instant communication
- **Email Notifications**: Resend/Mailgun integration with templates
- **SMS Alerts**: Twilio integration for urgent notifications
- **Calendar Integration**: Google Calendar sync for audition scheduling
- **Push Notifications**: Web push for mobile engagement

#### Content & Media (`src/services/storage.service.ts`, `src/services/script-analysis.service.ts`)
- **File Upload**: AWS S3 with presigned URL generation
- **Script Processing**: PDF/DOC parsing and character extraction
- **Media Optimization**: Image and video processing pipelines
- **Content Moderation**: Automated screening for platform safety

### Data Layer Modules

#### Database Management (`src/db/`, `src/config/database.ts`)
- **Drizzle ORM**: Type-safe database operations
- **Migration System**: Schema versioning and deployment
- **Connection Pooling**: Optimized database connections
- **Query Optimization**: Indexed searches and performance monitoring

#### Vector Storage (`src/services/qdrant.service.ts`)
- **Qdrant Integration**: Vector database for AI search
- **Embedding Storage**: Profile and script embeddings
- **Similarity Search**: Cosine similarity matching
- **Collection Management**: Organized vector collections by entity type

#### Caching Layer (`src/config/redis.ts`)
- **Redis/Dragonfly**: Session storage and performance caching
- **Rate Limit Storage**: Sliding window counters
- **Temporary Data**: OTP codes and verification tokens
- **Job Queues**: Background task management with Bull

### Utility Modules

#### Monitoring & Observability (`src/monitoring/`)
- **Metrics Collection**: Prometheus metrics for system health
- **Logging System**: Winston with structured JSON logging
- **Performance Tracking**: Request timing and resource usage
- **Error Reporting**: Centralized error handling and alerting
- **Health Checks**: Service availability monitoring

#### Integration Management (`src/integrations/`)
- **Third-party APIs**: Google, Twilio, AWS SDK configurations
- **Webhook Handling**: Secure webhook processing and validation
- **OAuth Flows**: Social authentication integrations
- **API Gateway**: Request routing and transformation

---

## Layer 3: Integration Guide

### API Endpoints Structure

#### Authentication Endpoints (`/auth0/`)
```typescript
POST /auth0/login          // Clerk login integration  
POST /auth0/logout         // Session termination
GET  /auth0/profile        // User profile retrieval
POST /auth0/refresh        // Token refresh
```

#### Talent Management APIs (`/talent/`, `/actor/`)
```typescript
GET    /talent             // List talents with filtering
POST   /talent             // Create new talent profile
GET    /talent/:id         // Get specific talent details
PUT    /talent/:id         // Update talent profile
DELETE /talent/:id         // Remove talent profile
POST   /talent/search      // AI-powered talent search
```

#### AI & Chat Integration (`/ai/`, `/chat/`)
```typescript
POST /ai/chat              // Claude conversation endpoint
POST /ai/analyze-script    // Script analysis and character extraction
POST /ai/match-talent      // AI-powered talent matching
GET  /ai/recommendations   // Personalized casting suggestions
POST /chat/conversation    // Real-time chat initiation
```

#### File & Media Management (`/upload/`, `/media/`)
```typescript
POST /upload/presign       // Generate S3 presigned URLs
POST /upload/complete      // Confirm file upload completion
GET  /media/:id           // Retrieve media with CDN links
POST /media/process       // Trigger media processing pipeline
```

#### Integration & Webhooks (`/integrations/`)
```typescript
POST /integrations/calendar/sync    // Google Calendar synchronization
POST /integrations/webhooks/clerk   // Clerk authentication events
POST /integrations/notifications    // Push notification triggers
GET  /integrations/status          // Third-party service health
```

### External Service Configurations

#### Database Connections
- **PostgreSQL**: Primary data store on port 5432
- **Qdrant**: Vector database on port 6333
- **Redis/Dragonfly**: Cache layer on port 6379

#### Third-party Services
- **Clerk**: Authentication and user management
- **AWS S3**: File storage with CDN distribution
- **Anthropic Claude**: Conversational AI capabilities
- **Google Calendar**: Audition scheduling integration
- **Resend/Mailgun**: Transactional email delivery
- **Twilio**: SMS notifications and communication

#### Environment Configuration
```bash
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333

# Authentication
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# AWS Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=castmatch-storage

# Communication
RESEND_API_KEY=re_...
TWILIO_ACCOUNT_SID=AC...
```

### API Documentation Standards
- **OpenAPI 3.0**: Swagger documentation at `/docs`
- **Response Format**: Consistent JSON with error codes
- **Rate Limiting**: 100 req/min for authenticated users
- **CORS Policy**: Configured for frontend domains
- **Authentication**: Bearer token or Clerk session validation

---

## Layer 4: Extension Points

### Design Patterns & Architecture

#### Service Layer Pattern
```typescript
// Example: Talent Service with dependency injection
class TalentService {
  constructor(
    private db: DrizzleDB,
    private vectorStore: QdrantService,
    private ai: ClaudeService
  ) {}
  
  async matchTalent(requirements: CastingRequirements) {
    // Business logic implementation
  }
}
```

#### Repository Pattern
```typescript
// Database abstraction for testability
interface TalentRepository {
  create(data: TalentProfile): Promise<Talent>
  findBySkills(skills: string[]): Promise<Talent[]>
  updateProfile(id: string, data: Partial<TalentProfile>): Promise<Talent>
}
```

#### Middleware Pipeline Pattern
```typescript
// Express.js middleware chain
app.use(clerkAuth)
   .use(rateLimiter)
   .use(validation)
   .use(businessLogic)
   .use(errorHandler)
```

### Customization Areas

#### AI Model Swapping
- **Interface**: `AIService` abstraction for provider switching
- **Configuration**: Environment-based model selection
- **Extensions**: Plugin system for new AI providers
- **Location**: `src/services/ai/` directory

#### Authentication Providers
- **Current**: Clerk integration
- **Extension Point**: `AuthProvider` interface
- **Location**: `src/middleware/auth.middleware.ts`
- **Customization**: OAuth provider addition support

#### Vector Database Backends
- **Current**: Qdrant implementation
- **Interface**: `VectorStore` abstraction
- **Alternatives**: Pinecone, Weaviate, ChromaDB support
- **Location**: `src/services/vector/` directory

#### Notification Channels
- **Current**: Email (Resend), SMS (Twilio), Push (Web)
- **Extension**: `NotificationChannel` interface
- **Location**: `src/services/notification.service.ts`
- **Customization**: Slack, Discord, WhatsApp integration points

### Plugin Architecture

#### Event System
```typescript
// Event-driven architecture for extensibility
eventBus.on('talent.created', (talent) => {
  // Trigger background processes
  embeddingService.generateEmbeddings(talent)
  notificationService.welcomeEmail(talent.email)
})
```

#### Hook System
```typescript
// Before/after hooks for business logic extension
hooks.register('before:talent.search', (query) => {
  // Query modification or logging
  return enhancedQuery
})
```

#### Configuration-Driven Features
- **Feature Flags**: Environment-based feature toggles
- **A/B Testing**: Built-in experiment framework
- **White-label**: Multi-tenant configuration support
- **Location**: `src/config/features.ts`

### Development & Testing Extensions

#### Testing Framework Integration
- **Unit Tests**: Jest with coverage reporting
- **Integration Tests**: Database and API testing
- **E2E Tests**: Playwright browser automation
- **Performance Tests**: Artillery load testing
- **Location**: `tests/` directory with organized structure

#### Development Tools
- **Code Generation**: Drizzle schema generation
- **API Documentation**: Swagger auto-generation
- **Environment Management**: Docker Compose for local development
- **Monitoring**: Prometheus metrics and Grafana dashboards

### Deployment & DevOps Extensions

#### Container Orchestration
- **Current**: Docker Compose for local development
- **Extension Points**: Kubernetes manifests in `k8s/`
- **Scaling**: Horizontal pod autoscaling configuration
- **Monitoring**: Integrated health checks and metrics

#### CI/CD Pipeline Customization
- **GitHub Actions**: Automated testing and deployment
- **Environment Promotion**: Staging to production workflows
- **Security Scanning**: Automated vulnerability assessment
- **Location**: `.github/workflows/` directory

---

## Validation Checklist

- [✓] All 4 required sections present and comprehensive
- [✓] Architecture pattern identified: Full-Stack Microservices
- [✓] 8+ core modules documented with responsibilities
- [✓] Tech stack matches project reality (Remix, Express, Clerk, Qdrant)
- [✓] Extension points and patterns clearly identified
- [✓] Integration guide covers all major APIs
- [✓] Development and deployment workflows documented

**Success Criteria Met**: ✅ Architecture documented, ✅ Modules mapped, ✅ APIs identified, ✅ Patterns noted, ✅ Extension points found