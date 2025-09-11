/**
 * Vector Services Performance Benchmark
 * Comprehensive performance testing between Pinecone and Qdrant
 */

import { vectorService as pineconeService } from '../services/vector.service';
import { qdrantService } from '../services/qdrant.service';
import { logger } from '../utils/logger';
import { TalentVectorMetadata } from '../services/vector.service';

interface BenchmarkConfig {
  testQueries: number;
  concurrency: number;
  vectorDimension: number;
  includeMetadata: boolean;
  topK: number;
  warmupQueries: number;
}

interface BenchmarkResult {
  service: 'pinecone' | 'qdrant';
  operation: string;
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  totalTime: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  minLatency: number;
  maxLatency: number;
  queriesPerSecond: number;
  errors: string[];
}

interface ComparisonReport {
  timestamp: Date;
  config: BenchmarkConfig;
  pineconeResults: BenchmarkResult;
  qdrantResults: BenchmarkResult;
  winner: {
    latency: 'pinecone' | 'qdrant' | 'tie';
    throughput: 'pinecone' | 'qdrant' | 'tie';
    reliability: 'pinecone' | 'qdrant' | 'tie';
    overall: 'pinecone' | 'qdrant' | 'tie';
  };
  recommendations: string[];
}

class VectorServiceBenchmark {
  private generateRandomVector(dimension: number): number[] {
    return Array.from({ length: dimension }, () => Math.random() - 0.5);
  }

  private generateTestMetadata(id: string): TalentVectorMetadata {
    const genders = ['male', 'female', 'non-binary'];
    const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'];
    const languages = ['Hindi', 'English', 'Marathi', 'Tamil', 'Telugu'];
    const skills = ['Acting', 'Dancing', 'Singing', 'Comedy', 'Action'];
    const experienceLevels = ['beginner', 'intermediate', 'advanced', 'expert'];

    return {
      talentId: id,
      userId: `user-${id}`,
      displayName: `Talent ${id}`,
      gender: genders[Math.floor(Math.random() * genders.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      languages: [languages[Math.floor(Math.random() * languages.length)]],
      skills: [skills[Math.floor(Math.random() * skills.length)]],
      experienceLevel: experienceLevels[Math.floor(Math.random() * experienceLevels.length)],
      rating: Math.random() * 5,
      yearsOfExperience: Math.floor(Math.random() * 20),
      availability: Math.random() > 0.5 ? 'available' : 'busy',
      profileCompleteness: Math.random() * 100,
      verified: Math.random() > 0.3,
    };
  }

  async benchmark(config: BenchmarkConfig): Promise<ComparisonReport> {
    logger.info('🚀 Starting Vector Services Benchmark');
    logger.info(`Config: ${config.testQueries} queries, ${config.concurrency} concurrency, ${config.vectorDimension}D vectors`);

    // Initialize services
    await this.initializeServices();

    // Run benchmarks
    const [pineconeResults, qdrantResults] = await Promise.all([
      this.benchmarkService('pinecone', pineconeService, config),
      this.benchmarkService('qdrant', qdrantService, config),
    ]);

    // Generate comparison report
    const report = this.generateComparisonReport(config, pineconeResults, qdrantResults);
    
    this.printReport(report);
    return report;
  }

  private async initializeServices(): Promise<void> {
    logger.info('🔧 Initializing services...');
    
    const initPromises = [
      pineconeService.initialize().catch(error => {
        logger.warn('Pinecone initialization failed:', error.message);
        return false;
      }),
      qdrantService.initialize().catch(error => {
        logger.warn('Qdrant initialization failed:', error.message);
        return false;
      })
    ];

    await Promise.all(initPromises);
    logger.info('✅ Services initialized');
  }

  private async benchmarkService(
    serviceName: 'pinecone' | 'qdrant',
    service: any,
    config: BenchmarkConfig
  ): Promise<BenchmarkResult> {
    logger.info(`📊 Benchmarking ${serviceName}...`);

    const latencies: number[] = [];
    const errors: string[] = [];
    let successfulQueries = 0;
    let failedQueries = 0;

    const startTime = Date.now();

    // Warmup queries
    if (config.warmupQueries > 0) {
      logger.info(`🔥 Running ${config.warmupQueries} warmup queries for ${serviceName}...`);
      await this.runWarmupQueries(service, config);
    }

    // Main benchmark
    const benchmarkStartTime = Date.now();
    
    if (config.concurrency === 1) {
      // Sequential execution
      for (let i = 0; i < config.testQueries; i++) {
        try {
          const queryVector = this.generateRandomVector(config.vectorDimension);
          const queryStart = Date.now();
          
          await service.searchSimilarTalents(queryVector, {
            topK: config.topK,
            includeMetadata: config.includeMetadata,
          });
          
          const queryEnd = Date.now();
          latencies.push(queryEnd - queryStart);
          successfulQueries++;
        } catch (error) {
          failedQueries++;
          errors.push(error.message);
        }
      }
    } else {
      // Concurrent execution
      const batches = Math.ceil(config.testQueries / config.concurrency);
      
      for (let batch = 0; batch < batches; batch++) {
        const batchSize = Math.min(config.concurrency, config.testQueries - batch * config.concurrency);
        const batchPromises = [];
        
        for (let i = 0; i < batchSize; i++) {
          const queryPromise = this.executeQuery(service, config).then(latency => {
            latencies.push(latency);
            successfulQueries++;
          }).catch(error => {
            failedQueries++;
            errors.push(error.message);
          });
          
          batchPromises.push(queryPromise);
        }
        
        await Promise.all(batchPromises);
      }
    }

    const benchmarkEndTime = Date.now();
    const totalTime = benchmarkEndTime - benchmarkStartTime;

    // Calculate statistics
    latencies.sort((a, b) => a - b);
    const averageLatency = latencies.length > 0 ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length : 0;
    const p50Latency = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
    const p95Latency = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const p99Latency = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0;
    const minLatency = latencies.length > 0 ? latencies[0] : 0;
    const maxLatency = latencies.length > 0 ? latencies[latencies.length - 1] : 0;
    const queriesPerSecond = successfulQueries / (totalTime / 1000);

    return {
      service: serviceName,
      operation: 'searchSimilarTalents',
      totalQueries: config.testQueries,
      successfulQueries,
      failedQueries,
      totalTime,
      averageLatency,
      p50Latency,
      p95Latency,
      p99Latency,
      minLatency,
      maxLatency,
      queriesPerSecond,
      errors: errors.slice(0, 5), // Keep first 5 errors for analysis
    };
  }

  private async runWarmupQueries(service: any, config: BenchmarkConfig): Promise<void> {
    for (let i = 0; i < config.warmupQueries; i++) {
      try {
        const queryVector = this.generateRandomVector(config.vectorDimension);
        await service.searchSimilarTalents(queryVector, {
          topK: config.topK,
          includeMetadata: config.includeMetadata,
        });
      } catch (error) {
        // Ignore warmup errors
      }
    }
  }

  private async executeQuery(service: any, config: BenchmarkConfig): Promise<number> {
    const queryVector = this.generateRandomVector(config.vectorDimension);
    const queryStart = Date.now();
    
    await service.searchSimilarTalents(queryVector, {
      topK: config.topK,
      includeMetadata: config.includeMetadata,
    });
    
    return Date.now() - queryStart;
  }

  private generateComparisonReport(
    config: BenchmarkConfig,
    pineconeResults: BenchmarkResult,
    qdrantResults: BenchmarkResult
  ): ComparisonReport {
    const latencyWinner = this.compareMetric(pineconeResults.averageLatency, qdrantResults.averageLatency, 'lower');
    const throughputWinner = this.compareMetric(pineconeResults.queriesPerSecond, qdrantResults.queriesPerSecond, 'higher');
    const reliabilityWinner = this.compareMetric(
      pineconeResults.successfulQueries / pineconeResults.totalQueries,
      qdrantResults.successfulQueries / qdrantResults.totalQueries,
      'higher'
    );

    // Calculate overall winner (weighted scoring)
    const pineconeScore = 
      (latencyWinner === 'pinecone' ? 3 : latencyWinner === 'tie' ? 1.5 : 0) +
      (throughputWinner === 'pinecone' ? 3 : throughputWinner === 'tie' ? 1.5 : 0) +
      (reliabilityWinner === 'pinecone' ? 2 : reliabilityWinner === 'tie' ? 1 : 0);

    const qdrantScore = 
      (latencyWinner === 'qdrant' ? 3 : latencyWinner === 'tie' ? 1.5 : 0) +
      (throughputWinner === 'qdrant' ? 3 : throughputWinner === 'tie' ? 1.5 : 0) +
      (reliabilityWinner === 'qdrant' ? 2 : reliabilityWinner === 'tie' ? 1 : 0);

    const overallWinner = pineconeScore > qdrantScore ? 'pinecone' : 
                         qdrantScore > pineconeScore ? 'qdrant' : 'tie';

    const recommendations = this.generateRecommendations(pineconeResults, qdrantResults, {
      latency: latencyWinner,
      throughput: throughputWinner,
      reliability: reliabilityWinner,
      overall: overallWinner,
    });

    return {
      timestamp: new Date(),
      config,
      pineconeResults,
      qdrantResults,
      winner: {
        latency: latencyWinner,
        throughput: throughputWinner,
        reliability: reliabilityWinner,
        overall: overallWinner,
      },
      recommendations,
    };
  }

  private compareMetric(
    pineconeValue: number,
    qdrantValue: number,
    preference: 'higher' | 'lower'
  ): 'pinecone' | 'qdrant' | 'tie' {
    const threshold = 0.05; // 5% difference threshold for "tie"
    const diff = Math.abs(pineconeValue - qdrantValue) / Math.max(pineconeValue, qdrantValue);
    
    if (diff < threshold) return 'tie';
    
    if (preference === 'higher') {
      return pineconeValue > qdrantValue ? 'pinecone' : 'qdrant';
    } else {
      return pineconeValue < qdrantValue ? 'pinecone' : 'qdrant';
    }
  }

  private generateRecommendations(
    pinecone: BenchmarkResult,
    qdrant: BenchmarkResult,
    winners: any
  ): string[] {
    const recommendations: string[] = [];

    if (winners.overall === 'qdrant') {
      recommendations.push('🎯 Qdrant shows overall better performance - consider migration');
    } else if (winners.overall === 'pinecone') {
      recommendations.push('📌 Pinecone shows overall better performance - consider staying');
    } else {
      recommendations.push('⚖️ Performance is very similar - consider cost and operational factors');
    }

    if (winners.latency === 'qdrant') {
      recommendations.push(`⚡ Qdrant is ${((pinecone.averageLatency / qdrant.averageLatency - 1) * 100).toFixed(1)}% faster on average`);
    }

    if (winners.throughput === 'qdrant') {
      recommendations.push(`🚀 Qdrant handles ${(qdrant.queriesPerSecond - pinecone.queriesPerSecond).toFixed(1)} more queries/second`);
    }

    if (pinecone.failedQueries > 0 || qdrant.failedQueries > 0) {
      recommendations.push('⚠️ Some queries failed - check error logs and service health');
    }

    return recommendations;
  }

  private printReport(report: ComparisonReport): void {
    logger.info('\n📋 BENCHMARK RESULTS SUMMARY');
    logger.info('=' * 50);
    
    logger.info(`\n📊 Pinecone Results:`);
    this.printServiceResults(report.pineconeResults);
    
    logger.info(`\n📊 Qdrant Results:`);
    this.printServiceResults(report.qdrantResults);
    
    logger.info(`\n🏆 Winners:`);
    logger.info(`  Latency: ${report.winner.latency}`);
    logger.info(`  Throughput: ${report.winner.throughput}`);
    logger.info(`  Reliability: ${report.winner.reliability}`);
    logger.info(`  Overall: ${report.winner.overall}`);
    
    logger.info(`\n💡 Recommendations:`);
    report.recommendations.forEach(rec => logger.info(`  ${rec}`));
  }

  private printServiceResults(result: BenchmarkResult): void {
    logger.info(`  Service: ${result.service}`);
    logger.info(`  Success Rate: ${(result.successfulQueries / result.totalQueries * 100).toFixed(2)}%`);
    logger.info(`  Average Latency: ${result.averageLatency.toFixed(2)}ms`);
    logger.info(`  P95 Latency: ${result.p95Latency.toFixed(2)}ms`);
    logger.info(`  Queries/Second: ${result.queriesPerSecond.toFixed(2)}`);
    if (result.errors.length > 0) {
      logger.info(`  Errors: ${result.errors.join(', ')}`);
    }
  }

  // Preset configurations for different scenarios
  static getQuickConfig(): BenchmarkConfig {
    return {
      testQueries: 50,
      concurrency: 1,
      vectorDimension: 1536,
      includeMetadata: true,
      topK: 20,
      warmupQueries: 5,
    };
  }

  static getStandardConfig(): BenchmarkConfig {
    return {
      testQueries: 200,
      concurrency: 5,
      vectorDimension: 1536,
      includeMetadata: true,
      topK: 20,
      warmupQueries: 10,
    };
  }

  static getStressConfig(): BenchmarkConfig {
    return {
      testQueries: 1000,
      concurrency: 20,
      vectorDimension: 1536,
      includeMetadata: true,
      topK: 20,
      warmupQueries: 50,
    };
  }
}

// CLI interface
async function main() {
  const benchmark = new VectorServiceBenchmark();
  
  const args = process.argv.slice(2);
  const configType = args[0] || 'standard';
  
  let config: BenchmarkConfig;
  
  switch (configType) {
    case 'quick':
      config = VectorServiceBenchmark.getQuickConfig();
      break;
    case 'stress':
      config = VectorServiceBenchmark.getStressConfig();
      break;
    case 'standard':
    default:
      config = VectorServiceBenchmark.getStandardConfig();
      break;
  }

  try {
    const report = await benchmark.benchmark(config);
    
    // Save report to file
    const fs = require('fs');
    const reportPath = `benchmark-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logger.info(`📄 Full report saved to: ${reportPath}`);
    
  } catch (error) {
    logger.error('Benchmark failed:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
export { VectorServiceBenchmark };

// Run if called directly
if (require.main === module) {
  main();
}