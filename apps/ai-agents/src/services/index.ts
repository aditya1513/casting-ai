/**
 * Services initialization for AI Agents Server
 * Initializes all AI services and dependencies
 */

import { logger } from '../utils/logger.js';
import { config, validateConfig } from '../config/config.js';
import { OpenAIService } from './ai/openai.service.js';
import { AnthropicService } from './ai/anthropic.service.js';
import { VectorService } from './vector/vector.service.js';

// Global service instances
export let openaiService: OpenAIService;
export let anthropicService: AnthropicService;
export let vectorService: VectorService;

/**
 * Initialize all services
 */
export const initializeServices = async (): Promise<void> => {
  try {
    logger.info('Starting service initialization...');

    // Validate configuration
    validateConfig();

    // Initialize AI services
    logger.info('Initializing AI services...');
    openaiService = new OpenAIService(config.openaiApiKey);
    anthropicService = new AnthropicService(config.anthropicApiKey);

    // Test AI service connections
    await Promise.all([
      openaiService.healthCheck(),
      anthropicService.healthCheck()
    ]);

    // Initialize vector service if enabled
    if (config.features.vectorSearch) {
      logger.info('Initializing vector database...');
      vectorService = new VectorService({
        url: config.qdrantUrl,
        apiKey: config.qdrantApiKey,
      });

      try {
        await vectorService.healthCheck();
        await vectorService.ensureCollection();
      } catch (error) {
        logger.warn('Vector service initialization failed, continuing without vector search', error);
        // Don't fail initialization if vector service is down
      }
    }

    logger.info('✅ All services initialized successfully');

  } catch (error) {
    logger.error('❌ Service initialization failed', error);
    throw new Error(`Failed to initialize services: ${error}`);
  }
};

/**
 * Get service status for health checks
 */
export const getServicesStatus = async () => {
  const status = {
    openai: { healthy: false, error: null },
    anthropic: { healthy: false, error: null },
    vector: { healthy: false, error: null },
  };

  // Check OpenAI
  try {
    await openaiService.healthCheck();
    status.openai.healthy = true;
  } catch (error: any) {
    status.openai.error = error.message;
  }

  // Check Anthropic
  try {
    await anthropicService.healthCheck();
    status.anthropic.healthy = true;
  } catch (error: any) {
    status.anthropic.error = error.message;
  }

  // Check Vector DB
  if (vectorService && config.features.vectorSearch) {
    try {
      await vectorService.healthCheck();
      status.vector.healthy = true;
    } catch (error: any) {
      status.vector.error = error.message;
    }
  } else {
    status.vector = { healthy: true, error: 'Disabled' };
  }

  return status;
};