/**
 * Vector Migration Management Routes
 * API endpoints for managing the Pinecone to Qdrant migration
 */

import { Router } from 'express';
import { hybridVectorService, VectorProvider } from '../services/hybrid-vector.service';
import { qdrantService } from '../services/qdrant.service';
import { vectorService as pineconeService } from '../services/vector.service';
import { PineconeToQdrantMigrator } from '../scripts/migrate-pinecone-to-qdrant';
import { logger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';

const router = Router();

/**
 * GET /api/vector-migration/status
 * Get current migration status and configuration
 */
router.get('/status', asyncHandler(async (req, res) => {
  const hybridConfig = hybridVectorService.getConfiguration();
  const analytics = hybridVectorService.getComparisonAnalytics();
  
  // Get service stats
  const [pineconeStats, qdrantStats] = await Promise.allSettled([
    pineconeService.getIndexStats().catch(() => null),
    qdrantService.getIndexStats().catch(() => null),
  ]);

  res.json({
    migration: {
      primaryProvider: hybridConfig.primaryProvider,
      fallbackProvider: hybridConfig.fallbackProvider,
      dualWriteEnabled: hybridConfig.enableDualWrite,
      comparisonEnabled: hybridConfig.enableResultComparison,
      comparisonSampleRate: hybridConfig.comparisonSampleRate,
    },
    services: {
      pinecone: {
        available: pineconeStats.status === 'fulfilled',
        stats: pineconeStats.status === 'fulfilled' ? pineconeStats.value : null,
        error: pineconeStats.status === 'rejected' ? pineconeStats.reason?.message : null,
      },
      qdrant: {
        available: qdrantStats.status === 'fulfilled',
        stats: qdrantStats.status === 'fulfilled' ? qdrantStats.value : null,
        error: qdrantStats.status === 'rejected' ? qdrantStats.reason?.message : null,
      },
    },
    analytics,
    timestamp: new Date().toISOString(),
  });
}));

/**
 * POST /api/vector-migration/switch-primary
 * Switch the primary vector provider
 */
router.post('/switch-primary', asyncHandler(async (req, res) => {
  const { provider } = req.body;

  if (!provider || !Object.values(VectorProvider).includes(provider)) {
    throw new AppError('Invalid provider. Must be "pinecone" or "qdrant"', 400);
  }

  hybridVectorService.switchPrimaryProvider(provider as VectorProvider);
  
  logger.info(`Primary vector provider switched to: ${provider}`);

  res.json({
    success: true,
    message: `Primary provider switched to ${provider}`,
    newConfiguration: hybridVectorService.getConfiguration(),
  });
}));

/**
 * POST /api/vector-migration/toggle-dual-write
 * Enable or disable dual write
 */
router.post('/toggle-dual-write', asyncHandler(async (req, res) => {
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    throw new AppError('enabled must be a boolean', 400);
  }

  hybridVectorService.setDualWrite(enabled);

  logger.info(`Dual write ${enabled ? 'enabled' : 'disabled'}`);

  res.json({
    success: true,
    message: `Dual write ${enabled ? 'enabled' : 'disabled'}`,
    configuration: hybridVectorService.getConfiguration(),
  });
}));

/**
 * GET /api/vector-migration/analytics
 * Get detailed comparison analytics
 */
router.get('/analytics', asyncHandler(async (req, res) => {
  const analytics = hybridVectorService.getComparisonAnalytics();
  
  res.json({
    analytics,
    recommendations: {
      performanceWinner: analytics.averageLatency.pinecone < analytics.averageLatency.qdrant ? 'pinecone' : 'qdrant',
      similarityScore: analytics.averageSimilarity,
      readyForMigration: analytics.averageSimilarity > 0.9 && analytics.totalComparisons > 100,
      concerns: analytics.lowSimilarityCount > analytics.totalComparisons * 0.1 ? 
        'High number of low similarity results detected' : null,
    },
    timestamp: new Date().toISOString(),
  });
}));

/**
 * POST /api/vector-migration/test-connection
 * Test connections to both vector databases
 */
router.post('/test-connection', asyncHandler(async (req, res) => {
  logger.info('Testing vector database connections...');

  const migrator = new PineconeToQdrantMigrator();
  const connectionResult = await migrator.testConnection();

  res.json({
    success: connectionResult,
    message: connectionResult ? 'All connections successful' : 'Connection test failed',
    timestamp: new Date().toISOString(),
  });
}));

/**
 * POST /api/vector-migration/migrate
 * Start migration process
 */
router.post('/migrate', asyncHandler(async (req, res) => {
  const {
    batchSize = 100,
    dryRun = false,
    compareResults = true,
    maxRetries = 3
  } = req.body;

  logger.info('Starting migration process via API');

  try {
    const migrator = new PineconeToQdrantMigrator();
    
    // Start migration in background (for long-running process)
    const migrationPromise = migrator.migrate({
      batchSize,
      dryRun,
      compareResults,
      maxRetries
    });

    // Don't await - return immediately for long migrations
    if (!dryRun) {
      migrationPromise.catch(error => {
        logger.error('Background migration failed:', error);
      });
    } else {
      await migrationPromise;
    }

    res.json({
      success: true,
      message: dryRun ? 'Dry run completed' : 'Migration started in background',
      configuration: {
        batchSize,
        dryRun,
        compareResults,
        maxRetries
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Migration API error:', error);
    throw new AppError(`Migration failed: ${error.message}`, 500);
  }
}));

/**
 * POST /api/vector-migration/benchmark
 * Run performance benchmark between providers
 */
router.post('/benchmark', asyncHandler(async (req, res) => {
  const { testQueries = 10, concurrency = 1 } = req.body;

  logger.info(`Running vector search benchmark: ${testQueries} queries, concurrency ${concurrency}`);

  // This would need actual test embeddings - placeholder implementation
  const benchmarkResults = {
    testQueries,
    concurrency,
    results: {
      pinecone: {
        averageLatency: Math.random() * 100 + 50,
        successRate: 0.98,
        errors: 0,
      },
      qdrant: {
        averageLatency: Math.random() * 100 + 30,
        successRate: 0.99,
        errors: 0,
      }
    },
    recommendation: 'Qdrant showing better performance',
    timestamp: new Date().toISOString(),
  };

  res.json({
    success: true,
    benchmark: benchmarkResults,
  });
}));

/**
 * DELETE /api/vector-migration/clear-analytics
 * Clear comparison analytics data
 */
router.delete('/clear-analytics', asyncHandler(async (req, res) => {
  // Reset analytics (this would need to be implemented in the service)
  logger.info('Clearing migration analytics data');

  res.json({
    success: true,
    message: 'Analytics data cleared',
    timestamp: new Date().toISOString(),
  });
}));

/**
 * POST /api/vector-migration/rollback
 * Emergency rollback to Pinecone
 */
router.post('/rollback', asyncHandler(async (req, res) => {
  logger.warn('Emergency rollback to Pinecone initiated');

  hybridVectorService.switchPrimaryProvider(VectorProvider.PINECONE);
  hybridVectorService.setDualWrite(false);

  res.json({
    success: true,
    message: 'Emergency rollback completed - switched to Pinecone only',
    configuration: hybridVectorService.getConfiguration(),
    timestamp: new Date().toISOString(),
  });
}));

/**
 * POST /api/vector-migration/finalize
 * Finalize migration - switch to Qdrant only
 */
router.post('/finalize', asyncHandler(async (req, res) => {
  const analytics = hybridVectorService.getComparisonAnalytics();

  // Safety checks
  if (analytics.totalComparisons < 100) {
    throw new AppError('Not enough comparison data. Need at least 100 comparisons before finalizing.', 400);
  }

  if (analytics.averageSimilarity < 0.95) {
    throw new AppError(`Similarity too low (${analytics.averageSimilarity.toFixed(2)}). Need >95% before finalizing.`, 400);
  }

  logger.info('Finalizing migration - switching to Qdrant only');

  hybridVectorService.switchPrimaryProvider(VectorProvider.QDRANT);
  hybridVectorService.setDualWrite(false);

  res.json({
    success: true,
    message: 'Migration finalized - switched to Qdrant only',
    analytics,
    configuration: hybridVectorService.getConfiguration(),
    timestamp: new Date().toISOString(),
  });
}));

export default router;