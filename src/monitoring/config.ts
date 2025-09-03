import { MonitoringConfig } from './types';

export const MONITORING_CONFIG: MonitoringConfig = {
  monitoring: {
    checkInterval: 15 * 60 * 1000, // 15 minutes
    healthCheckTimeout: 5000, // 5 seconds
    maxRetries: 3
  },
  
  reporting: {
    reportInterval: 30 * 60 * 1000, // 30 minutes
    retentionDays: 7
  },

  automation: {
    autoResolutionEnabled: true,
    triggerCooldownMs: 5 * 60 * 1000, // 5 minutes default
    maxConcurrentActions: 3
  },

  agents: {
    backend: {
      apiEndpoint: process.env.BACKEND_URL || 'http://localhost:3000',
      healthCheckPath: '/api/health',
      databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:castmatch123@localhost:5432/castmatch_db',
      redisUrl: process.env.REDIS_URL || 'redis://:castmatch_redis_password@localhost:6379',
      expectedServices: ['database', 'redis', 'auth', 'uploads'],
      criticalEndpoints: [
        '/api/auth/me',
        '/api/profiles',
        '/api/castings',
        '/api/matches',
        '/api/notifications'
      ]
    },

    frontend: {
      appUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
      buildPath: './frontend/.next',
      testCommand: 'npm run test:frontend',
      expectedRoutes: [
        '/',
        '/login',
        '/register',
        '/dashboard',
        '/profile',
        '/castings',
        '/matches',
        '/notifications'
      ],
      componentTests: [
        'npm run test -- --testPathPattern=components',
        'npm run test -- --testPathPattern=pages'
      ]
    },

    ai: {
      modelEndpoints: [
        process.env.OPENAI_API_URL || 'https://api.openai.com/v1',
        process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1'
      ],
      embeddingService: process.env.EMBEDDING_SERVICE_URL || 'https://api.openai.com/v1/embeddings',
      vectorDatabase: process.env.PINECONE_URL || 'https://api.pinecone.io/v1',
      healthCheckEndpoints: [
        'https://api.openai.com/v1/models',
        'https://api.anthropic.com/v1/ping'
      ],
      expectedModels: [
        'gpt-4o-mini',
        'text-embedding-ada-002',
        'claude-3-haiku'
      ]
    },

    integration: {
      oauthProviders: ['google', 'github', 'linkedin'],
      thirdPartyApis: [
        'casting-networks.com',
        'backstage.com',
        'mandy.com',
        'spotlight.com'
      ],
      webhookEndpoints: [
        '/api/webhooks/casting-update',
        '/api/webhooks/profile-sync',
        '/api/webhooks/match-notification'
      ],
      workflowDefinitions: [
        'talent-onboarding',
        'casting-notification',
        'match-processing',
        'profile-verification'
      ]
    },

    devops: {
      dockerServices: [
        'castmatch-postgres',
        'castmatch-redis',
        'castmatch-pgadmin',
        'castmatch-redis-commander'
      ],
      databaseMigrations: './prisma/migrations',
      deploymentTargets: ['development', 'staging', 'production'],
      healthCheckCommands: [
        'docker ps --filter "name=castmatch" --format "{{.Names}},{{.Status}}"',
        'df -h /',
        'free -m',
        'docker system df'
      ]
    },

    testing: {
      testSuites: ['unit', 'integration', 'e2e', 'api', 'security'],
      coverageThreshold: 80,
      ciPipelineUrl: process.env.CI_PIPELINE_URL || '',
      qualityGates: [
        {
          name: 'Code Coverage',
          type: 'COVERAGE',
          threshold: 80,
          required: true
        },
        {
          name: 'API Performance',
          type: 'PERFORMANCE',
          threshold: 500, // ms
          required: true
        },
        {
          name: 'Security Vulnerabilities',
          type: 'SECURITY',
          threshold: 0,
          required: true
        },
        {
          name: 'Lint Errors',
          type: 'LINT',
          threshold: 0,
          required: false
        }
      ]
    }
  }
};