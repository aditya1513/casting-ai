# CastMatch Backend API

Production-ready backend API for CastMatch - an AI-powered casting platform serving the Mumbai OTT production industry.

## Features

- **Secure Authentication**: JWT-based authentication with refresh tokens
- **Role-Based Access Control**: Support for Actors, Casting Directors, Producers, and Admins
- **High Performance**: Redis caching, optimized database queries, sub-2 second response times
- **Scalable Architecture**: Microservices-ready, horizontally scalable design
- **Comprehensive Data Models**: Complete casting workflow from profiles to auditions
- **Security First**: Rate limiting, input validation, SQL injection prevention, XSS protection
- **Production Ready**: Docker support, health checks, structured logging, error handling

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Authentication**: JWT with bcrypt
- **Validation**: Zod
- **Testing**: Jest with Supertest
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 15+
- Redis 7+
- Docker and Docker Compose (optional)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd casting-ai
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the environment template and configure your variables:

```bash
cp .env.example .env
```

Edit `.env` and set your configuration:

```env
# Required configurations
DATABASE_URL=postgresql://postgres:password@localhost:5432/castmatch_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
```

### 4. Database Setup

#### Option A: Using Docker (Recommended)

Start PostgreSQL and Redis using Docker Compose:

```bash
npm run docker:up
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- PgAdmin on port 5050 (admin@castmatch.com / admin123)
- Redis Commander on port 8081

#### Option B: Manual Setup

If you have PostgreSQL and Redis installed locally, ensure they're running and accessible.

### 5. Database Migration

Generate Prisma client and run migrations:

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### 6. Start the Server

#### Development Mode

```bash
npm run dev
```

The server will start on `http://localhost:5000` with hot-reload enabled.

#### Production Mode

```bash
npm run build
npm start
```

## API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | Login user | Public |
| POST | `/auth/refresh` | Refresh access token | Public |
| POST | `/auth/logout` | Logout user | Private |
| POST | `/auth/forgot-password` | Request password reset | Public |
| POST | `/auth/reset-password` | Reset password | Public |
| POST | `/auth/change-password` | Change password | Private |
| POST | `/auth/verify-email` | Verify email | Public |
| GET | `/auth/me` | Get current user | Private |

### Health Check Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/ready` | Readiness probe |
| GET | `/health/live` | Liveness probe |

### Request/Response Format

#### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

#### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "details": {}
  }
}
```

### Authentication

Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Project Structure

```
casting-ai/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Express middleware
│   ├── models/         # Data models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   ├── validators/     # Request validators
│   └── server.ts       # Application entry point
├── prisma/
│   └── schema.prisma   # Database schema
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── e2e/            # End-to-end tests
├── docker-compose.yml  # Docker configuration
├── Dockerfile          # Container definition
└── package.json        # Dependencies

```

## Database Schema

The application uses a comprehensive database schema including:

- **Users**: Authentication and authorization
- **Actors**: Actor profiles with portfolio management
- **Casting Directors**: Casting professional profiles
- **Producers**: Production house representatives
- **Projects**: OTT projects and films
- **Roles**: Character roles within projects
- **Applications**: Actor applications for roles
- **Auditions**: Scheduled auditions
- **Reviews**: Ratings and feedback system

## Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# With coverage
npm run test:coverage
```

## Development

### Database Management

```bash
# Open Prisma Studio
npm run prisma:studio

# Create new migration
npm run prisma:migrate

# Reset database
npx prisma migrate reset
```

### Code Quality

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix
```

### Docker Commands

```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs
```

## Production Deployment

### Using Docker

1. Build the production image:

```bash
docker build -t castmatch-backend .
```

2. Run the container:

```bash
docker run -p 5000:5000 --env-file .env castmatch-backend
```

### Manual Deployment

1. Build the application:

```bash
npm run build
```

2. Set production environment variables

3. Run migrations:

```bash
npm run prisma:migrate:prod
```

4. Start the server:

```bash
NODE_ENV=production npm start
```

## Environment Variables

See `.env.example` for all available configuration options.

### Required Variables

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret key for JWT signing (min 32 characters)

### Optional Variables

- `SMTP_*`: Email service configuration
- `AWS_*`: S3 storage configuration
- `AI_SERVICE_*`: AI/ML service integration

## Security Features

- **Password Security**: Bcrypt hashing with configurable rounds
- **JWT Authentication**: Short-lived access tokens with refresh token rotation
- **Rate Limiting**: Configurable per-endpoint rate limits
- **Input Validation**: Zod schema validation for all inputs
- **SQL Injection Prevention**: Parameterized queries via Prisma
- **XSS Protection**: Input sanitization and helmet.js
- **CORS**: Configurable cross-origin resource sharing
- **Environment Variables**: Sensitive data kept in environment files

## Performance Optimizations

- **Database Indexing**: Optimized queries with proper indexes
- **Redis Caching**: Frequently accessed data cached
- **Connection Pooling**: Efficient database connection management
- **Response Compression**: Gzip compression for responses
- **Query Optimization**: N+1 query prevention
- **Pagination**: Efficient data loading with cursor-based pagination

## Monitoring

- **Health Checks**: Kubernetes-compatible health endpoints
- **Structured Logging**: Winston with log rotation
- **Request Tracking**: Unique request IDs for debugging
- **Performance Metrics**: Response time tracking
- **Error Tracking**: Comprehensive error logging

## API Rate Limits

- **Global**: 100 requests per 15 minutes per IP/user
- **Authentication**: 10 requests per 15 minutes
- **Search**: 30 requests per minute
- **File Upload**: 20 uploads per hour

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

For issues and questions, please create an issue in the repository.

## License

MIT License - See LICENSE file for details

## Acknowledgments

Built for the Mumbai OTT production industry to streamline the casting process and connect talent with opportunities.