# Configuration Files

This directory contains all configuration files for deployment and environments.

## Structure

- **`docker/`** - Docker configurations and compose files
- **`kubernetes/`** - Kubernetes manifests and configurations
- **`environments/`** - Environment-specific configurations (.env files, etc.)

## Docker Configurations

All Docker-related files have been moved here from the root:

- `docker-compose.yml` - Main development environment
- `docker-compose.prod.yml` - Production environment  
- `Dockerfile*` - Container definitions
- `.dockerignore` - Docker ignore patterns

## Environment Files

- `.env.example` - Template for environment variables
- `.env.docker` - Docker-specific environment
- `drizzle.config.ts` - Database configuration

## Usage

Reference configurations from the root using relative paths:

```bash
# Docker
docker-compose -f config/docker/docker-compose.yml up -d

# Environment
cp config/environments/.env.example .env.local
```
