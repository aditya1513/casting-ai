# Casting AI Platform

> AI-powered casting platform built with a modern monorepo architecture

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Start development environment
bun run dev

# Start with Docker
bun run docker:up
```

## 📁 Project Structure

This is a **monorepo** containing all services, applications, and shared libraries. For detailed architecture documentation, see [MONOREPO.md](./MONOREPO.md).

### Core Directories

- **`apps/`** - Applications & Services (frontend, backend, ai-agents)
- **`libs/`** - Internal shared libraries
- **`packages/`** - Publishable npm packages
- **`tools/`** - Build tools and shared configurations
- **`config/`** - Environment and deployment configurations
- **`shared/`** - Shared types, constants, and schemas

### Supporting Directories

- **`documentation/`** - Documentation and guides
- **`design-101/`** - Design system and UI assets
- **`infrastructure/`** - Infrastructure as Code
- **`scripts/`** - Build and deployment scripts
- **`tests/`** - Repository-wide testing

## 📖 Documentation

- [📋 Monorepo Architecture](./MONOREPO.md) - Detailed structure and patterns
- [🏗️ Architecture Guide](./documentation/architecture/) - System architecture
- [🚀 Deployment Guide](./documentation/deployment/) - Deployment instructions
- [🎨 Design System](./design-101/) - UI components and design tokens

## 🛠️ Development

```bash
# Development
bun run dev:frontend    # Frontend only
bun run dev:backend     # Backend only

# Building
bun run build           # Build all apps
bun run build:frontend  # Build frontend only

# Testing
bun run test            # Run all tests
bun run lint            # Lint all code

# Database
bun run db:push         # Push schema changes
bun run db:studio       # Open database studio
```

## 🐳 Docker

```bash
bun run docker:up      # Start all services
bun run docker:down    # Stop all services
```

All Docker configurations are in [`config/docker/`](./config/docker/).

## 🤝 Contributing

1. Follow the [monorepo structure](./MONOREPO.md#-development-workflow)
2. Use shared configurations from `tools/`
3. Add new apps to `apps/`, libraries to `libs/`
4. Document changes and update relevant README files

## 📄 License

[Your License Here]
