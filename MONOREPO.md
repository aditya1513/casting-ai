# Casting AI - Monorepo Architecture

## 🏗️ Repository Structure

This is a monorepo containing all services, applications, libraries, and tools for the Casting AI platform.

### 📁 Directory Structure

```
casting-ai/
├── apps/                    # Applications & Services
│   ├── frontend/           # Next.js frontend application
│   ├── backend/            # Express.js/Fastify backend API
│   ├── ai-agents/          # AI service applications
│   └── tests/              # End-to-end and integration tests
│
├── packages/               # Shared npm packages
│   └── shared/             # Shared utilities and types
│
├── libs/                   # Internal libraries
│   ├── ui-components/      # Reusable UI components
│   ├── database/           # Database schemas and utilities
│   ├── auth/               # Authentication utilities
│   └── api-client/         # API client libraries
│
├── tools/                  # Build tools and utilities
│   ├── eslint-config/      # Shared ESLint configuration
│   ├── typescript-config/  # Shared TypeScript configuration
│   └── build-utils/        # Build and deployment utilities
│
├── config/                 # Configuration files
│   ├── docker/             # Docker configurations
│   ├── kubernetes/         # Kubernetes manifests
│   └── environments/       # Environment-specific configs
│
├── shared/                 # Shared resources
│   ├── schemas/            # API schemas and validation
│   ├── constants/          # Application constants
│   └── types/              # Shared TypeScript types
│
├── tests/                  # Repository-wide testing
│   ├── e2e/                # End-to-end tests
│   ├── integration/        # Integration tests
│   └── fixtures/           # Test fixtures and data
│
├── documentation/          # Documentation
│   ├── architecture/       # Architecture documentation
│   ├── api/                # API documentation
│   └── deployment/         # Deployment guides
│
├── design-101/             # Design system and assets
│   ├── docs/               # Design documentation
│   ├── tokens/             # Design tokens
│   └── styles/             # Shared styles and themes
│
├── prd/                    # Product Requirements Documents
│
├── infrastructure/         # Infrastructure as Code
│   ├── terraform/          # Terraform configurations
│   ├── kubernetes/         # Kubernetes manifests
│   ├── docker/             # Docker configurations
│   └── monitoring/         # Monitoring and observability
│
└── scripts/                # Build and deployment scripts
    ├── database/           # Database scripts
    └── utilities/          # Utility scripts
```

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20.0.0
- Bun >= 1.2.0
- Docker & Docker Compose

### Installation
```bash
# Install all dependencies
bun install

# Start development environment
bun run dev

# Start with Docker
docker-compose up -d
```

## 📦 Workspace Management

This monorepo uses Bun workspaces for package management:

### Available Scripts
```bash
# Development
bun run dev              # Start all apps in development
bun run dev:frontend     # Start frontend only
bun run dev:backend      # Start backend only

# Building
bun run build            # Build all apps
bun run build:frontend   # Build frontend only
bun run build:backend    # Build backend only

# Testing
bun run test             # Run all tests
bun run test:frontend    # Run frontend tests
bun run test:backend     # Run backend tests

# Linting
bun run lint             # Lint all code
```

## 🏛️ Architecture Principles

### Separation of Concerns
- **apps/**: Deployable applications
- **libs/**: Internal shared libraries
- **packages/**: Publishable npm packages
- **tools/**: Development and build tools

### Dependency Flow
```
apps/ → libs/ → packages/
  ↓       ↓        ↓
tools/ → config/ → shared/
```

### Code Sharing Strategy
1. **Shared Types**: `shared/types/`
2. **Business Logic**: `libs/`
3. **UI Components**: `libs/ui-components/`
4. **Utilities**: `packages/shared/`

## 🔧 Development Workflow

### Adding New Apps
```bash
mkdir apps/new-app
cd apps/new-app
bun init
```

### Adding New Libraries
```bash
mkdir libs/new-lib
cd libs/new-lib
bun init
```

### Cross-Package Dependencies
```json
{
  "dependencies": {
    "@casting-ai/shared": "workspace:*",
    "@casting-ai/ui-components": "workspace:*"
  }
}
```

## 🌍 Environment Management

### Environment Files
- `.env.example` - Template for environment variables
- `.env.local` - Local development overrides
- `config/environments/` - Environment-specific configurations

### Docker Support
- `docker-compose.yml` - Development environment
- `docker-compose.prod.yml` - Production environment
- `Dockerfile` - Application containerization

## 📚 Documentation

- [Architecture Guide](documentation/architecture/README.md)
- [API Documentation](documentation/api/README.md)
- [Deployment Guide](documentation/deployment/README.md)
- [Design System](design-101/README.md)

## 🤝 Contributing

1. Follow the established folder structure
2. Use shared configurations from `tools/`
3. Document new libraries and tools
4. Write tests for new functionality
5. Update this README when adding new top-level directories

## 📝 License

[Your License Here]
