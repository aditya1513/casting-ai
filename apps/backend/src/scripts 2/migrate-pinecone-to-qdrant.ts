/**
 * Migration Script: Pinecone to Qdrant
 * This script migrates all talent embeddings from Pinecone to Qdrant
 */

import { vectorService as pineconeService } from '../services/vector.service';
import { qdrantService } from '../services/qdrant.service';
import { logger } from '../utils/logger';
import { config } from '../config/config';

interface MigrationOptions {
  batchSize?: number;
  dryRun?: boolean;
  compareResults?: boolean;
  maxRetries?: number;
}

class PineconeToQdrantMigrator {
  private migratedCount = 0;
  private failedIds: string[] = [];
  private totalVectors = 0;

  async migrate(options: MigrationOptions = {}) {
    const {
      batchSize = 100,
      dryRun = false,
      compareResults = true,
      maxRetries = 3
    } = options;

    logger.info('🚀 Starting Pinecone to Qdrant migration');
    logger.info(`Configuration: batchSize=${batchSize}, dryRun=${dryRun}, compareResults=${compareResults}`);

    try {
      // Initialize both services
      await this.initializeServices();

      // Get migration stats
      await this.getMigrationStats();

      if (this.totalVectors === 0) {
        logger.info('✅ No vectors found in Pinecone to migrate');
        return;
      }

      logger.info(`📊 Found ${this.totalVectors} vectors to migrate`);

      if (dryRun) {
        logger.info('🔍 DRY RUN: Would migrate vectors but not actually executing');
        return;
      }

      // Perform migration in batches
      await this.performBatchMigration(batchSize, maxRetries);

      // Validate migration if requested
      if (compareResults) {
        await this.validateMigration();
      }

      // Print final results
      this.printMigrationResults();

    } catch (error) {
      logger.error('❌ Migration failed:', error);
      throw error;
    }
  }

  private async initializeServices() {
    logger.info('🔧 Initializing services...');
    
    // Check if Pinecone is available
    if (!config.pinecone?.apiKey) {
      throw new Error('Pinecone API key not configured');
    }

    // Initialize Pinecone
    await pineconeService.initialize();
    logger.info('✅ Pinecone service initialized');

    // Initialize Qdrant
    await qdrantService.initialize();
    logger.info('✅ Qdrant service initialized');
  }

  private async getMigrationStats() {
    logger.info('📊 Getting migration statistics...');
    
    try {
      const pineconeStats = await pineconeService.getIndexStats();
      this.totalVectors = pineconeStats.totalVectorCount;
      
      const qdrantStats = await qdrantService.getIndexStats();
      const existingVectors = qdrantStats.totalVectorCount;
      
      logger.info(`Pinecone vectors: ${this.totalVectors}`);
      logger.info(`Qdrant vectors: ${existingVectors}`);
      
      if (existingVectors > 0) {
        logger.warn(`⚠️  Qdrant already has ${existingVectors} vectors. This migration will add/update vectors.`);
      }
    } catch (error) {
      logger.error('Failed to get migration stats:', error);
      throw error;
    }
  }

  private async performBatchMigration(batchSize: number, maxRetries: number) {
    logger.info('🔄 Starting batch migration...');
    
    // This is a simplified approach - in reality you'd need to paginate through Pinecone
    // For now, we'll create a placeholder since Pinecone doesn't have a direct "list all" API
    logger.warn('⚠️  This script needs talent IDs from your database to fetch and migrate vectors');
    logger.info('💡 Consider running this script with a list of talent IDs from your database');
    
    // Example migration logic (you'd need to adapt this based on your data source)
    await this.migrateFromDatabase(batchSize, maxRetries);
  }

  private async migrateFromDatabase(batchSize: number, maxRetries: number) {
    // This would typically query your PostgreSQL database for talent IDs
    // For demonstration, we'll show the structure
    
    logger.info('📝 Migration requires talent IDs from database');
    logger.info('To run migration:');
    logger.info('1. Query your talents table for all talent IDs');
    logger.info('2. For each ID, fetch vector from Pinecone');
    logger.info('3. Upsert vector to Qdrant');
    
    // Placeholder for actual implementation
    const exampleTalentIds = ['talent-1', 'talent-2', 'talent-3']; // Would come from DB
    
    for (let i = 0; i < exampleTalentIds.length; i += batchSize) {
      const batch = exampleTalentIds.slice(i, i + batchSize);
      await this.migrateBatch(batch, maxRetries);
      
      // Progress update
      const progress = Math.min(i + batchSize, exampleTalentIds.length);
      logger.info(`📈 Progress: ${progress}/${exampleTalentIds.length} (${Math.round(progress/exampleTalentIds.length*100)}%)`);
    }
  }

  private async migrateBatch(talentIds: string[], maxRetries: number) {
    const migrationPromises = talentIds.map(talentId => 
      this.migrateTalent(talentId, maxRetries)
    );
    
    const results = await Promise.allSettled(migrationPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        this.migratedCount++;
      } else {
        this.failedIds.push(talentIds[index]);
        logger.error(`Failed to migrate ${talentIds[index]}:`, result.reason);
      }
    });
  }

  private async migrateTalent(talentId: string, maxRetries: number): Promise<void> {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        // Fetch vector from Pinecone
        const pineconeVector = await pineconeService.getTalentVector(talentId);
        
        if (!pineconeVector || !pineconeVector.values) {
          logger.warn(`No vector found in Pinecone for talent: ${talentId}`);
          return;
        }
        
        // Upsert to Qdrant
        await qdrantService.upsertTalentEmbedding(
          talentId,
          pineconeVector.values,
          pineconeVector.metadata!
        );
        
        logger.debug(`✅ Migrated talent: ${talentId}`);
        return;
        
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          throw new Error(`Failed to migrate ${talentId} after ${maxRetries} attempts: ${error}`);
        }
        
        logger.warn(`Retrying migration for ${talentId} (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      }
    }
  }

  private async validateMigration() {
    logger.info('🔍 Validating migration...');
    
    try {
      const pineconeStats = await pineconeService.getIndexStats();
      const qdrantStats = await qdrantService.getIndexStats();
      
      logger.info(`Pinecone vectors: ${pineconeStats.totalVectorCount}`);
      logger.info(`Qdrant vectors: ${qdrantStats.totalVectorCount}`);
      
      if (qdrantStats.totalVectorCount >= this.migratedCount) {
        logger.info('✅ Migration validation passed');
      } else {
        logger.warn('⚠️  Migration validation: Vector count mismatch');
      }
      
    } catch (error) {
      logger.error('Failed to validate migration:', error);
    }
  }

  private printMigrationResults() {
    logger.info('📋 Migration Results:');
    logger.info(`✅ Successfully migrated: ${this.migratedCount} vectors`);
    logger.info(`❌ Failed migrations: ${this.failedIds.length}`);
    
    if (this.failedIds.length > 0) {
      logger.warn('Failed talent IDs:', this.failedIds);
    }
    
    const successRate = this.totalVectors > 0 ? 
      Math.round((this.migratedCount / this.totalVectors) * 100) : 0;
    logger.info(`📊 Success rate: ${successRate}%`);
  }

  async testConnection() {
    logger.info('🔍 Testing service connections...');
    
    try {
      await this.initializeServices();
      
      // Test Pinecone
      const pineconeStats = await pineconeService.getIndexStats();
      logger.info(`✅ Pinecone connected - ${pineconeStats.totalVectorCount} vectors`);
      
      // Test Qdrant
      const qdrantStats = await qdrantService.getIndexStats();
      logger.info(`✅ Qdrant connected - ${qdrantStats.totalVectorCount} vectors`);
      
      return true;
    } catch (error) {
      logger.error('❌ Connection test failed:', error);
      return false;
    }
  }
}

// CLI interface
async function main() {
  const migrator = new PineconeToQdrantMigrator();
  
  const args = process.argv.slice(2);
  const command = args[0] || 'migrate';
  
  try {
    switch (command) {
      case 'test':
        await migrator.testConnection();
        break;
        
      case 'migrate':
        const options: MigrationOptions = {
          batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '100'),
          dryRun: args.includes('--dry-run'),
          compareResults: !args.includes('--no-validation'),
          maxRetries: parseInt(args.find(arg => arg.startsWith('--max-retries='))?.split('=')[1] || '3'),
        };
        
        await migrator.migrate(options);
        break;
        
      default:
        console.log('Usage:');
        console.log('  npm run migrate:pinecone-qdrant test');
        console.log('  npm run migrate:pinecone-qdrant migrate [options]');
        console.log('');
        console.log('Options:');
        console.log('  --dry-run                 Run without actually migrating');
        console.log('  --batch-size=N           Batch size (default: 100)');
        console.log('  --max-retries=N          Max retry attempts (default: 3)');
        console.log('  --no-validation          Skip result validation');
    }
  } catch (error) {
    logger.error('Migration script failed:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
export { PineconeToQdrantMigrator };

// Run if called directly
if (require.main === module) {
  main();
}