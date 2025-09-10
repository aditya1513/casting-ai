/**
 * Pinecone Health Check Routes
 * Routes for testing Pinecone vector database connectivity
 */

import express from 'express';
import { Request, Response } from 'express';
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../config/config';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * Basic Pinecone connection test
 */
router.get('/connection', async (req: Request, res: Response) => {
  try {
    if (!config.ai.pineconeApiKey) {
      return res.status(500).json({
        success: false,
        error: 'Pinecone API key not configured'
      });
    }

    const pinecone = new Pinecone({
      apiKey: config.ai.pineconeApiKey,
    });

    // Test connection by listing indexes
    const indexList = await pinecone.listIndexes();
    
    return res.json({
      success: true,
      message: 'Pinecone connection successful',
      data: {
        indexCount: indexList.indexes?.length || 0,
        indexes: indexList.indexes?.map(idx => ({
          name: idx.name,
          dimension: idx.dimension,
          metric: idx.metric,
          status: idx.status.state
        })) || []
      }
    });

  } catch (error) {
    logger.error('Pinecone connection test failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Pinecone connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test vector operations on an existing index
 */
router.get('/vector-test/:indexName', async (req: Request<{ indexName: string }>, res: Response) => {
  try {
    const { indexName } = req.params;
    
    if (!indexName) {
      return res.status(400).json({
        success: false,
        error: 'Index name is required'
      });
    }
    
    if (!config.ai.pineconeApiKey) {
      return res.status(500).json({
        success: false,
        error: 'Pinecone API key not configured'
      });
    }

    const pinecone = new Pinecone({
      apiKey: config.ai.pineconeApiKey,
    });

    const index = pinecone.index(indexName);
    
    // Get index stats
    const stats = await index.describeIndexStats();
    
    // Test with a simple vector operation
    const testVector = Array(stats.dimension).fill(0).map(() => Math.random() * 2 - 1);
    const testId = `health-check-${Date.now()}`;
    
    // Upsert test vector
    await index.upsert([{
      id: testId,
      values: testVector,
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
        type: 'health-check'
      }
    }]);
    
    // Query test
    const queryResults = await index.query({
      vector: testVector,
      topK: 3,
      includeMetadata: true
    });
    
    // Clean up
    await index.deleteOne(testId);
    
    return res.json({
      success: true,
      message: 'Vector operations test successful',
      data: {
        indexName,
        dimension: stats.dimension,
        totalRecords: stats.totalRecordCount,
        testResults: {
          upsertSuccess: true,
          querySuccess: true,
          resultsFound: queryResults.matches?.length || 0
        }
      }
    });

  } catch (error) {
    logger.error('Pinecone vector test failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Vector operations test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get comprehensive Pinecone status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = {
      configured: !!config.ai.pineconeApiKey,
      environment: config.ai.pineconeEnvironment || 'not-set',
      timestamp: new Date().toISOString()
    };

    if (status.configured && config.ai.pineconeApiKey) {
      try {
        const pinecone = new Pinecone({
          apiKey: config.ai.pineconeApiKey,
        });

        const indexList = await pinecone.listIndexes();
        
        return res.json({
          success: true,
          status: {
            ...status,
            connected: true,
            indexes: indexList.indexes?.map(idx => ({
              name: idx.name,
              dimension: idx.dimension,
              metric: idx.metric,
              status: idx.status.state,
              ready: idx.status.ready
            })) || []
          }
        });
      } catch (error) {
        return res.json({
          success: false,
          status: {
            ...status,
            connected: false,
            error: error instanceof Error ? error.message : 'Connection failed'
          }
        });
      }
    } else {
      return res.json({
        success: false,
        status
      });
    }

  } catch (error) {
    logger.error('Pinecone status check failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Status check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;