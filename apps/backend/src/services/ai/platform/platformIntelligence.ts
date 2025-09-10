import { PrismaClient } from '@prisma/client';
import * as tf from '@tensorflow/tfjs-node';
import * as stats from 'simple-statistics';
import * as cron from 'node-cron';
import { AIConfig } from '../core/config';
import { PlatformMetrics, UserBehaviorEvent } from '../types';

export class PlatformIntelligence {
  private prisma: PrismaClient;
  private metricsCache: Map<string, any> = new Map();
  private performanceModel?: tf.LayersModel;
  private featureAdoptionModel?: tf.LayersModel;
  private businessMetricsModel?: tf.LayersModel;

  constructor() {
    this.prisma = new PrismaClient();
    this.loadModels();
    this.setupMetricsCollection();
  }

  private async loadModels(): Promise<void> {
    try {
      this.performanceModel = await tf.loadLayersModel(
        `file://${AIConfig.tensorflow.modelPath}/performance_prediction/model.json`
      );
      this.featureAdoptionModel = await tf.loadLayersModel(
        `file://${AIConfig.tensorflow.modelPath}/feature_adoption/model.json`
      );
      this.businessMetricsModel = await tf.loadLayersModel(
        `file://${AIConfig.tensorflow.modelPath}/business_metrics/model.json`
      );
    } catch {
      this.createDefaultModels();
    }
  }

  private createDefaultModels(): void {
    this.performanceModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [30], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'linear' }),
      ],
    });

    this.featureAdoptionModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [20], units: 40, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 20, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' }),
      ],
    });

    this.businessMetricsModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [25], units: 50, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.25 }),
        tf.layers.dense({ units: 25, activation: 'relu' }),
        tf.layers.dense({ units: 5, activation: 'linear' }),
      ],
    });

    [this.performanceModel, this.featureAdoptionModel, this.businessMetricsModel].forEach(model => {
      model.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError',
        metrics: ['mae'],
      });
    });
  }

  private setupMetricsCollection(): void {
    const interval = AIConfig.platform.monitoring.metricsInterval;
    
    cron.schedule(`*/${Math.floor(interval / 60000)} * * * *`, () => {
      this.collectPlatformMetrics();
    });

    cron.schedule('0 * * * *', () => {
      this.analyzePerformanceTrends();
    });

    cron.schedule('0 0 * * *', () => {
      this.generateDailyInsights();
    });
  }

  async collectPlatformMetrics(): Promise<PlatformMetrics> {
    const metrics: PlatformMetrics = {
      dailyActiveUsers: await this.calculateDAU(),
      monthlyActiveUsers: await this.calculateMAU(),
      userRetention: await this.calculateRetention(),
      featureAdoption: await this.calculateFeatureAdoption(),
      performanceMetrics: await this.calculatePerformanceMetrics(),
      businessMetrics: await this.calculateBusinessMetrics(),
    };

    await this.storePlatformMetrics(metrics);
    this.metricsCache.set('latest', metrics);

    return metrics;
  }

  private async calculateDAU(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT user_id) as count
      FROM user_behavior_events
      WHERE timestamp >= ${today}
    `;
    
    return Number(result[0]?.count || 0);
  }

  private async calculateMAU(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT user_id) as count
      FROM user_behavior_events
      WHERE timestamp >= ${thirtyDaysAgo}
    `;
    
    return Number(result[0]?.count || 0);
  }

  private async calculateRetention(): Promise<{ day1: number; day7: number; day30: number }> {
    const cohorts = await this.prisma.$queryRaw<any[]>`
      WITH cohorts AS (
        SELECT 
          user_id,
          DATE(MIN(timestamp)) as first_seen,
          DATE(timestamp) as active_date
        FROM user_behavior_events
        WHERE timestamp >= NOW() - INTERVAL '35 days'
        GROUP BY user_id, DATE(timestamp)
      ),
      retention_data AS (
        SELECT 
          first_seen,
          COUNT(DISTINCT CASE WHEN active_date = first_seen + INTERVAL '1 day' THEN user_id END) as day1_retained,
          COUNT(DISTINCT CASE WHEN active_date = first_seen + INTERVAL '7 days' THEN user_id END) as day7_retained,
          COUNT(DISTINCT CASE WHEN active_date = first_seen + INTERVAL '30 days' THEN user_id END) as day30_retained,
          COUNT(DISTINCT user_id) as cohort_size
        FROM cohorts
        WHERE first_seen = first_seen
        GROUP BY first_seen
      )
      SELECT 
        AVG(day1_retained::float / NULLIF(cohort_size, 0)) as day1,
        AVG(day7_retained::float / NULLIF(cohort_size, 0)) as day7,
        AVG(day30_retained::float / NULLIF(cohort_size, 0)) as day30
      FROM retention_data
    `;

    const data = cohorts[0] || {};
    return {
      day1: data.day1 || 0,
      day7: data.day7 || 0,
      day30: data.day30 || 0,
    };
  }

  private async calculateFeatureAdoption(): Promise<Record<string, number>> {
    const features = await this.prisma.$queryRaw<any[]>`
      SELECT 
        event_type as feature,
        COUNT(DISTINCT user_id) as users,
        (SELECT COUNT(DISTINCT user_id) FROM user_behavior_events 
         WHERE timestamp >= NOW() - INTERVAL '30 days') as total_users
      FROM user_behavior_events
      WHERE timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY event_type
    `;

    const adoption: Record<string, number> = {};
    
    features.forEach(feature => {
      adoption[feature.feature] = feature.users / Math.max(feature.total_users, 1);
    });

    return adoption;
  }

  private async calculatePerformanceMetrics(): Promise<{
    avgResponseTime: number;
    errorRate: number;
    uptime: number;
  }> {
    const performance = await this.prisma.$queryRaw<any[]>`
      SELECT 
        AVG(response_time) as avg_response_time,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END)::float / COUNT(*) as error_rate,
        COUNT(CASE WHEN status_code < 500 THEN 1 END)::float / COUNT(*) as uptime
      FROM api_logs
      WHERE timestamp >= NOW() - INTERVAL '1 hour'
    `;

    const data = performance[0] || {};
    return {
      avgResponseTime: data.avg_response_time || 0,
      errorRate: data.error_rate || 0,
      uptime: data.uptime || 1,
    };
  }

  private async calculateBusinessMetrics(): Promise<{
    totalRevenue: number;
    avgRevenuePerUser: number;
    conversionRate: number;
    churnRate: number;
  }> {
    const business = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(DISTINCT user_id) as paying_users,
        (SELECT COUNT(DISTINCT user_id) FROM user_behavior_events 
         WHERE timestamp >= NOW() - INTERVAL '30 days') as total_users
      FROM transactions
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `;

    const churn = await this.prisma.$queryRaw<any[]>`
      WITH last_month_active AS (
        SELECT DISTINCT user_id
        FROM user_behavior_events
        WHERE timestamp >= NOW() - INTERVAL '60 days'
        AND timestamp < NOW() - INTERVAL '30 days'
      ),
      this_month_active AS (
        SELECT DISTINCT user_id
        FROM user_behavior_events
        WHERE timestamp >= NOW() - INTERVAL '30 days'
      )
      SELECT 
        COUNT(lm.user_id) as last_month_users,
        COUNT(tm.user_id) as retained_users
      FROM last_month_active lm
      LEFT JOIN this_month_active tm ON lm.user_id = tm.user_id
    `;

    const data = business[0] || {};
    const churnData = churn[0] || {};

    const totalRevenue = Number(data.total_revenue || 0);
    const payingUsers = Number(data.paying_users || 0);
    const totalUsers = Number(data.total_users || 1);
    const lastMonthUsers = Number(churnData.last_month_users || 1);
    const retainedUsers = Number(churnData.retained_users || 0);

    return {
      totalRevenue,
      avgRevenuePerUser: totalRevenue / Math.max(payingUsers, 1),
      conversionRate: payingUsers / totalUsers,
      churnRate: (lastMonthUsers - retainedUsers) / lastMonthUsers,
    };
  }

  async predictPerformanceBottlenecks(): Promise<any[]> {
    const currentMetrics = await this.getCurrentSystemMetrics();
    const historicalData = await this.getHistoricalPerformanceData();
    
    const features = this.extractPerformanceFeatures(currentMetrics, historicalData);
    
    const prediction = this.performanceModel!.predict(tf.tensor2d([features])) as tf.Tensor;
    const bottleneckScore = (await prediction.data())[0];
    
    const bottlenecks = [];
    
    if (bottleneckScore > 0.7) {
      const rootCause = await this.identifyBottleneckCause(currentMetrics);
      bottlenecks.push({
        type: 'performance_degradation',
        severity: bottleneckScore > 0.9 ? 'critical' : 'high',
        predictedIn: this.calculateTimeToBottleneck(bottleneckScore),
        cause: rootCause,
        recommendations: this.generatePerformanceRecommendations(rootCause),
      });
    }
    
    return bottlenecks;
  }

  private async getCurrentSystemMetrics(): Promise<any> {
    return {
      cpuUsage: Math.random() * 0.8,
      memoryUsage: Math.random() * 0.75,
      diskIO: Math.random() * 0.6,
      networkLatency: Math.random() * 100,
      activeConnections: Math.floor(Math.random() * 1000),
      queueLength: Math.floor(Math.random() * 50),
    };
  }

  private async getHistoricalPerformanceData(): Promise<any[]> {
    return await this.prisma.$queryRaw`
      SELECT 
        cpu_usage, memory_usage, disk_io, network_latency,
        active_connections, queue_length, timestamp
      FROM system_metrics
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      ORDER BY timestamp DESC
      LIMIT 100
    `;
  }

  private extractPerformanceFeatures(current: any, historical: any[]): number[] {
    const features: number[] = [];
    
    features.push(current.cpuUsage || 0);
    features.push(current.memoryUsage || 0);
    features.push(current.diskIO || 0);
    features.push(current.networkLatency / 1000 || 0);
    features.push(current.activeConnections / 1000 || 0);
    features.push(current.queueLength / 100 || 0);
    
    if (historical.length > 0) {
      const avgCpu = stats.mean(historical.map(h => h.cpu_usage));
      const avgMemory = stats.mean(historical.map(h => h.memory_usage));
      const avgDisk = stats.mean(historical.map(h => h.disk_io));
      
      features.push(avgCpu);
      features.push(avgMemory);
      features.push(avgDisk);
      
      features.push((current.cpuUsage - avgCpu) / avgCpu);
      features.push((current.memoryUsage - avgMemory) / avgMemory);
      features.push((current.diskIO - avgDisk) / avgDisk);
    }
    
    while (features.length < 30) {
      features.push(0);
    }
    
    return features.slice(0, 30);
  }

  private async identifyBottleneckCause(metrics: any): Promise<string> {
    if (metrics.cpuUsage > 0.8) return 'high_cpu_usage';
    if (metrics.memoryUsage > 0.85) return 'memory_exhaustion';
    if (metrics.diskIO > 0.7) return 'disk_bottleneck';
    if (metrics.networkLatency > 500) return 'network_latency';
    if (metrics.queueLength > 100) return 'queue_overflow';
    return 'unknown';
  }

  private calculateTimeToBottleneck(score: number): string {
    const hours = Math.max(1, (1 - score) * 24);
    if (hours < 1) return 'within 1 hour';
    if (hours < 24) return `within ${Math.ceil(hours)} hours`;
    return `within ${Math.ceil(hours / 24)} days`;
  }

  private generatePerformanceRecommendations(cause: string): string[] {
    const recommendations: Record<string, string[]> = {
      high_cpu_usage: [
        'Scale horizontally by adding more server instances',
        'Optimize CPU-intensive algorithms',
        'Implement caching for frequent computations',
        'Review and optimize database queries',
      ],
      memory_exhaustion: [
        'Increase available memory',
        'Implement memory pooling',
        'Review memory leaks in application',
        'Optimize data structures',
      ],
      disk_bottleneck: [
        'Upgrade to SSD storage',
        'Implement disk-based caching',
        'Optimize file I/O operations',
        'Consider using in-memory databases',
      ],
      network_latency: [
        'Implement CDN for static assets',
        'Optimize API payload sizes',
        'Use connection pooling',
        'Consider geographic distribution',
      ],
      queue_overflow: [
        'Increase worker capacity',
        'Implement priority queues',
        'Add circuit breakers',
        'Optimize job processing time',
      ],
    };
    
    return recommendations[cause] || ['Monitor system closely'];
  }

  async analyzeFeatureAdoption(featureName: string): Promise<any> {
    const adoptionData = await this.getFeatureAdoptionData(featureName);
    const features = this.extractAdoptionFeatures(adoptionData);
    
    const prediction = this.featureAdoptionModel!.predict(tf.tensor2d([features])) as tf.Tensor;
    const adoptionScore = (await prediction.data())[0];
    
    const insights = await this.generateAdoptionInsights(featureName, adoptionData);
    
    return {
      featureName,
      currentAdoption: adoptionData.currentRate,
      predictedAdoption: adoptionScore,
      trend: adoptionData.trend,
      insights,
      recommendations: this.generateAdoptionRecommendations(adoptionScore, insights),
    };
  }

  private async getFeatureAdoptionData(featureName: string): Promise<any> {
    const data = await this.prisma.$queryRaw<any[]>`
      WITH daily_adoption AS (
        SELECT 
          DATE(timestamp) as date,
          COUNT(DISTINCT user_id) as users,
          (SELECT COUNT(DISTINCT user_id) FROM user_behavior_events 
           WHERE DATE(timestamp) = DATE(ube.timestamp)) as total_users
        FROM user_behavior_events ube
        WHERE event_type = ${featureName}
        AND timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(timestamp)
      )
      SELECT 
        date,
        users,
        total_users,
        users::float / NULLIF(total_users, 0) as adoption_rate
      FROM daily_adoption
      ORDER BY date
    `;
    
    const rates = data.map(d => d.adoption_rate);
    const currentRate = rates[rates.length - 1] || 0;
    const trend = rates.length > 1 ? this.calculateTrend(rates) : 0;
    
    return {
      dailyData: data,
      currentRate,
      trend,
      totalUsers: data[data.length - 1]?.total_users || 0,
    };
  }

  private extractAdoptionFeatures(data: any): number[] {
    const features: number[] = [];
    
    features.push(data.currentRate || 0);
    features.push(data.trend || 0);
    features.push(data.totalUsers / 10000 || 0);
    
    const rates = data.dailyData.map((d: any) => d.adoption_rate);
    if (rates.length > 0) {
      features.push(stats.mean(rates));
      features.push(stats.standardDeviation(rates));
      features.push(Math.max(...rates));
      features.push(Math.min(...rates));
    }
    
    while (features.length < 20) {
      features.push(0);
    }
    
    return features.slice(0, 20);
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const x = values.map((_, i) => i);
    const y = values;
    
    return stats.linearRegressionLine(stats.linearRegression(x.map((xi, i) => [xi, y[i]])))(1) -
           stats.linearRegressionLine(stats.linearRegression(x.map((xi, i) => [xi, y[i]])))(0);
  }

  private async generateAdoptionInsights(featureName: string, data: any): Promise<string[]> {
    const insights: string[] = [];
    
    if (data.trend > 0.01) {
      insights.push('Feature adoption is growing steadily');
    } else if (data.trend < -0.01) {
      insights.push('Feature adoption is declining');
    } else {
      insights.push('Feature adoption has plateaued');
    }
    
    if (data.currentRate < 0.1) {
      insights.push('Low adoption rate indicates potential usability issues');
    } else if (data.currentRate > 0.7) {
      insights.push('High adoption rate shows strong product-market fit');
    }
    
    const variance = stats.standardDeviation(data.dailyData.map((d: any) => d.adoption_rate));
    if (variance > 0.1) {
      insights.push('High variance suggests inconsistent user experience');
    }
    
    return insights;
  }

  private generateAdoptionRecommendations(score: number, insights: string[]): string[] {
    const recommendations: string[] = [];
    
    if (score < 0.3) {
      recommendations.push('Improve feature discoverability');
      recommendations.push('Add onboarding tutorials');
      recommendations.push('Gather user feedback on barriers');
    } else if (score > 0.7) {
      recommendations.push('Expand feature capabilities');
      recommendations.push('Use as a differentiator in marketing');
      recommendations.push('Consider making it a core workflow');
    } else {
      recommendations.push('A/B test different approaches');
      recommendations.push('Optimize user interface');
      recommendations.push('Add contextual help');
    }
    
    return recommendations;
  }

  async generateBusinessInsights(): Promise<any> {
    const currentMetrics = await this.collectPlatformMetrics();
    const historicalData = await this.getHistoricalBusinessData();
    
    const features = this.extractBusinessFeatures(currentMetrics, historicalData);
    
    const prediction = this.businessMetricsModel!.predict(tf.tensor2d([features])) as tf.Tensor;
    const predictions = await prediction.data();
    
    return {
      predictedRevenue: predictions[0],
      predictedGrowth: predictions[1],
      predictedChurn: predictions[2],
      predictedCosts: predictions[3],
      predictedProfit: predictions[4],
      insights: this.generateBusinessRecommendations(currentMetrics, predictions),
    };
  }

  private async getHistoricalBusinessData(): Promise<any[]> {
    return await this.prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        SUM(amount) as revenue,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) as transactions
      FROM transactions
      WHERE created_at >= NOW() - INTERVAL '90 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `;
  }

  private extractBusinessFeatures(current: PlatformMetrics, historical: any[]): number[] {
    const features: number[] = [];
    
    features.push(current.dailyActiveUsers / 1000);
    features.push(current.monthlyActiveUsers / 10000);
    features.push(current.userRetention.day1);
    features.push(current.userRetention.day7);
    features.push(current.userRetention.day30);
    features.push(current.businessMetrics.totalRevenue / 100000);
    features.push(current.businessMetrics.avgRevenuePerUser / 100);
    features.push(current.businessMetrics.conversionRate);
    features.push(current.businessMetrics.churnRate);
    
    if (historical.length > 0) {
      const revenueValues = historical.map(h => Number(h.revenue));
      const userValues = historical.map(h => Number(h.active_users));
      
      features.push(stats.mean(revenueValues) / 10000);
      features.push(stats.mean(userValues) / 1000);
      features.push(this.calculateTrend(revenueValues));
      features.push(this.calculateTrend(userValues));
    }
    
    while (features.length < 25) {
      features.push(0);
    }
    
    return features.slice(0, 25);
  }

  private generateBusinessRecommendations(current: PlatformMetrics, predictions: Float32Array): string[] {
    const recommendations: string[] = [];
    
    if (predictions[2] > 0.15) {
      recommendations.push('High predicted churn - implement retention campaigns');
      recommendations.push('Analyze user feedback to identify pain points');
      recommendations.push('Offer personalized incentives to at-risk users');
    }
    
    if (predictions[1] < 0.05) {
      recommendations.push('Low growth predicted - increase marketing spend');
      recommendations.push('Focus on improving user acquisition funnels');
      recommendations.push('Consider new feature development');
    }
    
    if (current.businessMetrics.conversionRate < 0.02) {
      recommendations.push('Low conversion rate - optimize pricing strategy');
      recommendations.push('Improve onboarding experience');
      recommendations.push('Add more value propositions');
    }
    
    return recommendations;
  }

  private async analyzePerformanceTrends(): Promise<void> {
    const bottlenecks = await this.predictPerformanceBottlenecks();
    
    for (const bottleneck of bottlenecks) {
      if (bottleneck.severity === 'critical') {
        await this.createPerformanceAlert(bottleneck);
      }
    }
    
    await this.optimizeSystemResources(bottlenecks);
  }

  private async generateDailyInsights(): Promise<void> {
    const metrics = await this.collectPlatformMetrics();
    const businessInsights = await this.generateBusinessInsights();
    
    const insights = {
      metrics,
      businessInsights,
      timestamp: new Date(),
      recommendations: this.generateDailyRecommendations(metrics),
    };
    
    await this.storeDailyInsights(insights);
  }

  private generateDailyRecommendations(metrics: PlatformMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.userRetention.day1 < 0.4) {
      recommendations.push('Focus on improving day-1 user experience');
    }
    
    if (metrics.performanceMetrics.errorRate > 0.02) {
      recommendations.push('High error rate detected - investigate immediately');
    }
    
    if (metrics.dailyActiveUsers < metrics.monthlyActiveUsers * 0.1) {
      recommendations.push('Low daily engagement - consider push notifications');
    }
    
    return recommendations;
  }

  private async createPerformanceAlert(bottleneck: any): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO performance_alerts (
        type, severity, cause, predicted_in, 
        recommendations, created_at
      ) VALUES (
        ${bottleneck.type}, ${bottleneck.severity}, ${bottleneck.cause},
        ${bottleneck.predictedIn}, ${JSON.stringify(bottleneck.recommendations)}, ${new Date()}
      )
    `;
  }

  private async optimizeSystemResources(bottlenecks: any[]): Promise<void> {
    for (const bottleneck of bottlenecks) {
      switch (bottleneck.cause) {
        case 'high_cpu_usage':
          await this.scaleResources('cpu');
          break;
        case 'memory_exhaustion':
          await this.scaleResources('memory');
          break;
        case 'disk_bottleneck':
          await this.optimizeDiskUsage();
          break;
      }
    }
  }

  private async scaleResources(type: string): Promise<void> {
    console.log(`Auto-scaling ${type} resources`);
  }

  private async optimizeDiskUsage(): Promise<void> {
    console.log('Optimizing disk usage');
  }

  private async storePlatformMetrics(metrics: PlatformMetrics): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO platform_metrics (
        daily_active_users, monthly_active_users,
        day1_retention, day7_retention, day30_retention,
        feature_adoption, performance_metrics,
        business_metrics, timestamp
      ) VALUES (
        ${metrics.dailyActiveUsers}, ${metrics.monthlyActiveUsers},
        ${metrics.userRetention.day1}, ${metrics.userRetention.day7}, ${metrics.userRetention.day30},
        ${JSON.stringify(metrics.featureAdoption)}, ${JSON.stringify(metrics.performanceMetrics)},
        ${JSON.stringify(metrics.businessMetrics)}, ${new Date()}
      )
    `;
  }

  private async storeDailyInsights(insights: any): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO daily_insights (
        metrics, business_insights, recommendations, created_at
      ) VALUES (
        ${JSON.stringify(insights.metrics)}, ${JSON.stringify(insights.businessInsights)},
        ${JSON.stringify(insights.recommendations)}, ${new Date()}
      )
    `;
  }

  async getHealthScore(): Promise<number> {
    const metrics = this.metricsCache.get('latest') || await this.collectPlatformMetrics();
    
    let score = 0;
    let totalWeight = 0;
    
    // Performance health (30%)
    const perfScore = (1 - metrics.performanceMetrics.errorRate) * 
                     Math.min(1000 / metrics.performanceMetrics.avgResponseTime, 1) *
                     metrics.performanceMetrics.uptime;
    score += perfScore * 0.3;
    totalWeight += 0.3;
    
    // User engagement health (40%)
    const engagementScore = (metrics.dailyActiveUsers / Math.max(metrics.monthlyActiveUsers * 0.2, 1)) *
                           metrics.userRetention.day7;
    score += Math.min(engagementScore, 1) * 0.4;
    totalWeight += 0.4;
    
    // Business health (30%)
    const businessScore = Math.min(metrics.businessMetrics.conversionRate * 50, 1) *
                         (1 - metrics.businessMetrics.churnRate);
    score += businessScore * 0.3;
    totalWeight += 0.3;
    
    return Math.min(score / totalWeight, 1);
  }

  async cleanup(): Promise<void> {
    this.metricsCache.clear();
    await this.prisma.$disconnect();
  }
}