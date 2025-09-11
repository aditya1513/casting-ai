# Internal Libraries

This directory contains internal shared libraries used across the monorepo.

## Structure

- **`ui-components/`** - Reusable UI components
- **`database/`** - Database schemas and utilities  
- **`auth/`** - Authentication utilities
- **`api-client/`** - API client libraries

## Usage

Libraries in this directory are internal to the monorepo and should be imported using workspace references:

```json
{
  "dependencies": {
    "@casting-ai/ui-components": "workspace:*",
    "@casting-ai/database": "workspace:*"
  }
}
```

Each library should have its own `package.json` with appropriate name and exports.
