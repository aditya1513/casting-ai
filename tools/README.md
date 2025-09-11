# Build Tools & Configurations

This directory contains shared build tools and configurations for the monorepo.

## Structure

- **`eslint-config/`** - Shared ESLint configuration
- **`typescript-config/`** - Shared TypeScript configuration  
- **`build-utils/`** - Build and deployment utilities

## Usage

Tools are used by referencing them in your project configurations:

### ESLint
```json
{
  "extends": ["@casting-ai/eslint-config"]
}
```

### TypeScript
```json
{
  "extends": "@casting-ai/typescript-config/base"
}
```

## Adding New Tools

1. Create a new directory with descriptive name
2. Add `package.json` with proper exports
3. Update this README with usage instructions
