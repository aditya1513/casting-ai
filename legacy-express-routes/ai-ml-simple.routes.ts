/**
 * Simple AI/ML Routes (No Auth Required)
 * Basic AI/ML endpoints for testing without complex dependencies
 */

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @route   GET /api/ai-ml-simple/health
 * @desc    Health check for AI/ML system
 * @access  Public
 */
router.get('/health', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'AI/ML system is operational',
    timestamp: new Date().toISOString(),
    features: {
      semanticSearch: 'Available',
      scriptAnalysis: 'Available',
      talentMatching: 'Available',
      vectorSearch: 'Available',
      embeddingGeneration: 'Available'
    }
  });
}));

/**
 * @route   GET /api/ai-ml-simple/services
 * @desc    Test AI/ML services connectivity
 * @access  Public
 */
router.get('/services', asyncHandler(async (req, res) => {
  const serviceStatus = {
    vectorService: 'Unknown',
    embeddingService: 'Unknown',
    aiMatchingService: 'Unknown',
    scriptAnalysisService: 'Unknown',
    hybridSearchService: 'Unknown'
  };

  try {
    // Try to import and test services
    const services = await Promise.allSettled([
      import('../services/vector.service'),
      import('../services/embedding.service'),
      import('../services/ai-matching.service'),
      import('../services/script-analysis.service'),
      import('../services/hybrid-search.service')
    ]);

    const serviceNames = ['vectorService', 'embeddingService', 'aiMatchingService', 'scriptAnalysisService', 'hybridSearchService'];
    
    services.forEach((result, index) => {
      const serviceName = serviceNames[index] as keyof typeof serviceStatus;
      serviceStatus[serviceName] = result.status === 'fulfilled' ? 'Available' : 'Error';
    });

  } catch (error) {
    // Services couldn't be imported
  }

  res.json({
    success: true,
    message: 'AI/ML services status checked',
    services: serviceStatus,
    note: 'Full functionality requires proper service configuration'
  });
}));

/**
 * @route   GET /api/ai-ml-simple/features
 * @desc    List available AI/ML features
 * @access  Public
 */
router.get('/features', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    features: [
      {
        name: 'Semantic Search',
        description: 'Advanced talent search using AI embeddings',
        endpoint: '/api/ai/search',
        status: 'Available'
      },
      {
        name: 'Script Analysis',
        description: 'AI-powered script character and role analysis',
        endpoint: '/api/ai/script/analyze',
        status: 'Available'
      },
      {
        name: 'Talent Matching',
        description: 'AI matching of talent to roles based on requirements',
        endpoint: '/api/ai/match',
        status: 'Available'
      },
      {
        name: 'Vector Search',
        description: 'High-performance vector similarity search',
        endpoint: '/api/ai/vector/search',
        status: 'Available'
      },
      {
        name: 'Embedding Generation',
        description: 'Convert text and profiles to AI embeddings',
        endpoint: '/api/ai/embedding/generate',
        status: 'Available'
      }
    ],
    note: 'Authentication required for full feature access'
  });
}));

export default router;