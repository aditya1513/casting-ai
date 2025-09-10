import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import * as tf from '@tensorflow/tfjs-node';
import * as natural from 'natural';
import { AIConfig } from '../core/config';
import { 
  ProfileQualityScore, 
  ProfileRecommendation,
  ExplainableAIResult,
  FeatureImportance 
} from '../types';

export class SmartProfileCompletion {
  private prisma: PrismaClient;
  private openai: OpenAI;
  private tfidf: natural.TfIdf;
  private profileModel?: tf.LayersModel;

  constructor() {
    this.prisma = new PrismaClient();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.tfidf = new natural.TfIdf();
    this.loadProfileModel();
  }

  private async loadProfileModel(): Promise<void> {
    try {
      this.profileModel = await tf.loadLayersModel(
        `file://${AIConfig.tensorflow.modelPath}/profile_quality/model.json`
      );
    } catch {
      this.profileModel = this.createDefaultProfileModel();
    }
  }

  private createDefaultProfileModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [50], units: 128, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 4, activation: 'softmax' }),
      ],
    });

    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });

    return model;
  }

  async analyzeProfileQuality(userId: string): Promise<ProfileQualityScore> {
    const profile = await this.getFullProfile(userId);
    const features = await this.extractProfileFeatures(profile);
    
    const completeness = this.calculateCompleteness(profile);
    const richness = await this.calculateRichness(profile);
    const accuracy = await this.calculateAccuracy(profile);
    const recency = this.calculateRecency(profile);
    
    const weights = AIConfig.ml.profileCompletion.weights;
    const overallScore = 
      completeness * weights.completeness +
      richness * weights.richness +
      accuracy * weights.accuracy +
      recency * weights.recency;
    
    const recommendations = await this.generateRecommendations(
      profile,
      { completeness, richness, accuracy, recency }
    );
    
    await this.storeProfileAnalysis(userId, overallScore, recommendations);
    
    return {
      overallScore,
      completeness,
      richness,
      accuracy,
      recency,
      recommendations,
    };
  }

  private async getFullProfile(userId: string): Promise<any> {
    const profile = await this.prisma.$queryRaw`
      SELECT 
        u.*,
        up.*,
        COUNT(DISTINCT e.id) as experience_count,
        COUNT(DISTINCT s.id) as skill_count,
        COUNT(DISTINCT p.id) as portfolio_count,
        COUNT(DISTINCT c.id) as certification_count
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN experiences e ON u.id = e.user_id
      LEFT JOIN user_skills s ON u.id = s.user_id
      LEFT JOIN portfolio_items p ON u.id = p.user_id
      LEFT JOIN certifications c ON u.id = c.user_id
      WHERE u.id = ${userId}
      GROUP BY u.id, up.id
    `;
    
    return profile[0] || {};
  }

  private async extractProfileFeatures(profile: any): Promise<number[]> {
    const features: number[] = [];
    
    features.push(profile.name ? 1 : 0);
    features.push(profile.email ? 1 : 0);
    features.push(profile.phone ? 1 : 0);
    features.push(profile.bio ? profile.bio.length / 1000 : 0);
    features.push(profile.headline ? 1 : 0);
    features.push(profile.location ? 1 : 0);
    features.push(profile.profile_picture ? 1 : 0);
    features.push(profile.experience_count || 0);
    features.push(profile.skill_count || 0);
    features.push(profile.portfolio_count || 0);
    features.push(profile.certification_count || 0);
    
    const bioKeywords = this.extractKeywords(profile.bio || '');
    features.push(bioKeywords.length);
    
    const industryRelevance = await this.calculateIndustryRelevance(profile);
    features.push(industryRelevance);
    
    const socialPresence = this.calculateSocialPresence(profile);
    features.push(...socialPresence);
    
    const engagementMetrics = await this.getEngagementMetrics(profile.id);
    features.push(...engagementMetrics);
    
    while (features.length < 50) {
      features.push(0);
    }
    
    return features.slice(0, 50);
  }

  private calculateCompleteness(profile: any): number {
    const requiredFields = [
      'name', 'email', 'phone', 'bio', 'headline',
      'location', 'profile_picture', 'industry', 'experience_level',
      'availability', 'preferred_roles', 'languages'
    ];
    
    const optionalFields = [
      'website', 'linkedin', 'twitter', 'instagram',
      'emergency_contact', 'resume', 'video_intro',
      'hourly_rate', 'availability_calendar'
    ];
    
    let requiredComplete = 0;
    let optionalComplete = 0;
    
    requiredFields.forEach(field => {
      if (profile[field] && profile[field] !== '') {
        requiredComplete++;
      }
    });
    
    optionalFields.forEach(field => {
      if (profile[field] && profile[field] !== '') {
        optionalComplete++;
      }
    });
    
    const requiredScore = requiredComplete / requiredFields.length;
    const optionalScore = optionalComplete / optionalFields.length;
    
    return requiredScore * 0.7 + optionalScore * 0.3;
  }

  private async calculateRichness(profile: any): Promise<number> {
    let richness = 0;
    
    if (profile.bio && profile.bio.length > 200) {
      richness += 0.2;
    }
    
    if (profile.experience_count > 3) {
      richness += 0.2;
    }
    
    if (profile.skill_count > 5) {
      richness += 0.15;
    }
    
    if (profile.portfolio_count > 3) {
      richness += 0.25;
    }
    
    if (profile.certification_count > 1) {
      richness += 0.1;
    }
    
    const hasVideoIntro = profile.video_intro ? 0.1 : 0;
    richness += hasVideoIntro;
    
    return Math.min(richness, 1);
  }

  private async calculateAccuracy(profile: any): Promise<number> {
    let accuracyScore = 1.0;
    
    if (profile.email && !this.isValidEmail(profile.email)) {
      accuracyScore -= 0.2;
    }
    
    if (profile.phone && !this.isValidPhone(profile.phone)) {
      accuracyScore -= 0.2;
    }
    
    if (profile.linkedin && !this.isValidLinkedIn(profile.linkedin)) {
      accuracyScore -= 0.1;
    }
    
    const skillValidation = await this.validateSkills(profile.id);
    accuracyScore -= (1 - skillValidation) * 0.2;
    
    const experienceValidation = await this.validateExperience(profile.id);
    accuracyScore -= (1 - experienceValidation) * 0.3;
    
    return Math.max(accuracyScore, 0);
  }

  private calculateRecency(profile: any): number {
    const lastUpdate = new Date(profile.updated_at || profile.created_at);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate < 7) return 1.0;
    if (daysSinceUpdate < 30) return 0.8;
    if (daysSinceUpdate < 90) return 0.6;
    if (daysSinceUpdate < 180) return 0.4;
    if (daysSinceUpdate < 365) return 0.2;
    return 0.1;
  }

  async generateRecommendations(
    profile: any,
    scores: { completeness: number; richness: number; accuracy: number; recency: number }
  ): Promise<ProfileRecommendation[]> {
    const recommendations: ProfileRecommendation[] = [];
    
    if (!profile.bio || profile.bio.length < 100) {
      recommendations.push({
        field: 'bio',
        importance: 'high',
        suggestion: 'Add a comprehensive bio (at least 200 characters) to help others understand your background and expertise',
        impact: 0.15,
      });
    }
    
    if (!profile.profile_picture) {
      recommendations.push({
        field: 'profile_picture',
        importance: 'high',
        suggestion: 'Upload a professional profile picture to increase trust and engagement',
        impact: 0.12,
      });
    }
    
    if (!profile.headline) {
      recommendations.push({
        field: 'headline',
        importance: 'high',
        suggestion: 'Add a compelling headline that summarizes your professional identity',
        impact: 0.10,
      });
    }
    
    if (profile.experience_count < 2) {
      recommendations.push({
        field: 'experience',
        importance: 'high',
        suggestion: 'Add at least 2-3 relevant work experiences to showcase your background',
        impact: 0.15,
      });
    }
    
    if (profile.skill_count < 5) {
      recommendations.push({
        field: 'skills',
        importance: 'medium',
        suggestion: 'Add at least 5 key skills relevant to your industry',
        impact: 0.08,
      });
    }
    
    if (profile.portfolio_count < 3) {
      recommendations.push({
        field: 'portfolio',
        importance: 'medium',
        suggestion: 'Upload 3-5 portfolio items to showcase your work',
        impact: 0.10,
      });
    }
    
    if (!profile.video_intro) {
      recommendations.push({
        field: 'video_intro',
        importance: 'low',
        suggestion: 'Record a 30-60 second video introduction to stand out',
        impact: 0.05,
      });
    }
    
    const industryRecommendations = await this.generateIndustrySpecificRecommendations(profile);
    recommendations.push(...industryRecommendations);
    
    const aiSuggestions = await this.generateAISuggestions(profile);
    recommendations.push(...aiSuggestions);
    
    return recommendations.sort((a, b) => b.impact - a.impact).slice(0, 10);
  }

  private async generateIndustrySpecificRecommendations(profile: any): Promise<ProfileRecommendation[]> {
    const recommendations: ProfileRecommendation[] = [];
    
    if (profile.industry === 'Film & TV') {
      if (!profile.imdb_link) {
        recommendations.push({
          field: 'imdb_link',
          importance: 'medium',
          suggestion: 'Add your IMDb profile link to showcase your filmography',
          impact: 0.07,
        });
      }
      
      if (!profile.showreel) {
        recommendations.push({
          field: 'showreel',
          importance: 'high',
          suggestion: 'Upload a showreel to demonstrate your acting range',
          impact: 0.12,
        });
      }
    }
    
    if (profile.industry === 'Theater') {
      if (!profile.stage_experience) {
        recommendations.push({
          field: 'stage_experience',
          importance: 'high',
          suggestion: 'Add your theater and stage performance experience',
          impact: 0.10,
        });
      }
    }
    
    return recommendations;
  }

  private async generateAISuggestions(profile: any): Promise<ProfileRecommendation[]> {
    try {
      const prompt = `
        Analyze this user profile and suggest improvements:
        Industry: ${profile.industry || 'Not specified'}
        Experience Level: ${profile.experience_level || 'Not specified'}
        Bio: ${profile.bio || 'No bio'}
        Skills: ${profile.skill_count} skills listed
        Portfolio: ${profile.portfolio_count} items
        
        Provide 3 specific, actionable recommendations to improve profile quality.
        Focus on industry-specific improvements for the Mumbai entertainment market.
      `;
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a profile optimization expert for the Mumbai entertainment industry.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      });
      
      const suggestions = this.parseAISuggestions(response.choices[0].message.content || '');
      return suggestions;
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      return [];
    }
  }

  private parseAISuggestions(content: string): ProfileRecommendation[] {
    const recommendations: ProfileRecommendation[] = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    lines.forEach((line, index) => {
      if (line.match(/^\d+\.|^-|^•/)) {
        const suggestion = line.replace(/^\d+\.|^-|^•/, '').trim();
        recommendations.push({
          field: 'ai_suggestion',
          importance: index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
          suggestion,
          impact: 0.05,
        });
      }
    });
    
    return recommendations.slice(0, 3);
  }

  async inferProfileData(userId: string): Promise<any> {
    const profile = await this.getFullProfile(userId);
    const inferences: any = {};
    
    if (profile.bio) {
      const keywords = this.extractKeywords(profile.bio);
      const inferredSkills = await this.inferSkillsFromBio(profile.bio);
      inferences.suggestedSkills = inferredSkills;
      
      const inferredIndustry = await this.inferIndustryFromContent(profile.bio, keywords);
      if (!profile.industry && inferredIndustry) {
        inferences.suggestedIndustry = inferredIndustry;
      }
    }
    
    if (profile.experience_count > 0) {
      const experiences = await this.getUserExperiences(userId);
      const inferredLevel = this.inferExperienceLevel(experiences);
      if (!profile.experience_level && inferredLevel) {
        inferences.suggestedExperienceLevel = inferredLevel;
      }
      
      const inferredRoles = this.inferPreferredRoles(experiences);
      inferences.suggestedRoles = inferredRoles;
    }
    
    const uploadedFiles = await this.getUserUploadedFiles(userId);
    const inferredFromFiles = await this.inferFromUploadedContent(uploadedFiles);
    inferences.fromFiles = inferredFromFiles;
    
    const socialData = await this.analyzeSocialProfiles(profile);
    inferences.socialInsights = socialData;
    
    return inferences;
  }

  private async inferSkillsFromBio(bio: string): Promise<string[]> {
    const skillKeywords = [
      'acting', 'directing', 'producing', 'writing', 'editing',
      'cinematography', 'music', 'dance', 'choreography', 'stunts',
      'voice acting', 'modeling', 'theatre', 'improvisation',
      'method acting', 'classical training', 'comedy', 'drama',
      'action', 'romance', 'hindi', 'english', 'marathi', 'gujarati'
    ];
    
    const bio_lower = bio.toLowerCase();
    const foundSkills = skillKeywords.filter(skill => 
      bio_lower.includes(skill)
    );
    
    return foundSkills;
  }

  private async inferIndustryFromContent(bio: string, keywords: string[]): Promise<string> {
    const industryKeywords = {
      'Film & TV': ['film', 'movie', 'television', 'tv', 'cinema', 'bollywood'],
      'Theater': ['theater', 'theatre', 'stage', 'play', 'drama', 'broadway'],
      'OTT': ['ott', 'netflix', 'amazon', 'hotstar', 'streaming', 'web series'],
      'Advertising': ['advertising', 'commercial', 'ad', 'brand', 'campaign'],
      'Music': ['music', 'singer', 'musician', 'composer', 'band'],
    };
    
    let bestMatch = '';
    let maxScore = 0;
    
    for (const [industry, terms] of Object.entries(industryKeywords)) {
      const score = terms.filter(term => 
        bio.toLowerCase().includes(term) || keywords.includes(term)
      ).length;
      
      if (score > maxScore) {
        maxScore = score;
        bestMatch = industry;
      }
    }
    
    return bestMatch;
  }

  private inferExperienceLevel(experiences: any[]): string {
    if (experiences.length === 0) return 'Fresher';
    
    const totalYears = experiences.reduce((sum, exp) => {
      const start = new Date(exp.start_date);
      const end = exp.end_date ? new Date(exp.end_date) : new Date();
      return sum + (end.getTime() - start.getTime()) / (365 * 24 * 60 * 60 * 1000);
    }, 0);
    
    if (totalYears < 1) return 'Fresher';
    if (totalYears < 3) return 'Junior';
    if (totalYears < 7) return 'Mid-level';
    if (totalYears < 12) return 'Senior';
    return 'Expert';
  }

  private inferPreferredRoles(experiences: any[]): string[] {
    const roleFrequency: Record<string, number> = {};
    
    experiences.forEach(exp => {
      const role = exp.role || exp.title;
      if (role) {
        roleFrequency[role] = (roleFrequency[role] || 0) + 1;
      }
    });
    
    return Object.entries(roleFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([role]) => role);
  }

  async validateAndEnhanceProfile(userId: string): Promise<ExplainableAIResult> {
    const profile = await this.getFullProfile(userId);
    const features = await this.extractProfileFeatures(profile);
    
    const prediction = this.profileModel!.predict(tf.tensor2d([features])) as tf.Tensor;
    const scores = await prediction.data();
    
    const categories = ['Incomplete', 'Basic', 'Good', 'Excellent'];
    const predictedCategory = categories[scores.indexOf(Math.max(...scores))];
    const confidence = Math.max(...scores);
    
    const featureImportance = await this.calculateFeatureImportance(features);
    const reasoning = this.generateReasoning(profile, featureImportance);
    const alternatives = this.generateAlternatives(profile, scores);
    
    const result: ExplainableAIResult = {
      prediction: {
        category: predictedCategory,
        score: confidence,
      },
      confidence,
      explanation: {
        features: featureImportance,
        reasoning,
        alternativeOutcomes: alternatives,
      },
      metadata: {
        modelVersion: '1.0.0',
        timestamp: new Date(),
        processingTime: 0,
      },
    };
    
    await this.storeValidationResult(userId, result);
    
    return result;
  }

  private async calculateFeatureImportance(features: number[]): Promise<FeatureImportance[]> {
    const featureNames = [
      'name', 'email', 'phone', 'bio_length', 'headline',
      'location', 'profile_picture', 'experience_count', 'skill_count',
      'portfolio_count', 'certification_count', 'bio_keywords',
      'industry_relevance', 'social_presence'
    ];
    
    const importance: FeatureImportance[] = [];
    
    features.slice(0, featureNames.length).forEach((value, index) => {
      const impact = Math.abs(value - 0.5);
      importance.push({
        feature: featureNames[index] || `feature_${index}`,
        importance: impact,
        contribution: value > 0.5 ? 'positive' : value < 0.5 ? 'negative' : 'neutral',
        value,
      });
    });
    
    return importance.sort((a, b) => b.importance - a.importance).slice(0, 10);
  }

  private generateReasoning(profile: any, features: FeatureImportance[]): string {
    const topFeatures = features.slice(0, 3);
    const positiveFeatures = topFeatures.filter(f => f.contribution === 'positive');
    const negativeFeatures = topFeatures.filter(f => f.contribution === 'negative');
    
    let reasoning = 'Your profile quality is determined by several factors. ';
    
    if (positiveFeatures.length > 0) {
      reasoning += `Strong points include: ${positiveFeatures.map(f => f.feature).join(', ')}. `;
    }
    
    if (negativeFeatures.length > 0) {
      reasoning += `Areas for improvement: ${negativeFeatures.map(f => f.feature).join(', ')}. `;
    }
    
    reasoning += 'Focusing on these areas will significantly improve your profile visibility and matching accuracy.';
    
    return reasoning;
  }

  private generateAlternatives(profile: any, scores: number[]): any[] {
    const categories = ['Incomplete', 'Basic', 'Good', 'Excellent'];
    const alternatives: any[] = [];
    
    scores.forEach((score, index) => {
      if (score > 0.1 && score < Math.max(...scores)) {
        const changes = this.getRequiredChangesForCategory(profile, categories[index]);
        alternatives.push({
          outcome: categories[index],
          probability: score,
          requiredChanges: changes,
        });
      }
    });
    
    return alternatives.sort((a, b) => b.probability - a.probability);
  }

  private getRequiredChangesForCategory(profile: any, category: string): string[] {
    const changes: string[] = [];
    
    switch (category) {
      case 'Excellent':
        changes.push('Complete all profile sections');
        changes.push('Add professional video introduction');
        changes.push('Include 5+ portfolio items');
        changes.push('Get profile verified');
        break;
      case 'Good':
        changes.push('Add detailed work experience');
        changes.push('Upload portfolio samples');
        changes.push('Complete skill assessments');
        break;
      case 'Basic':
        changes.push('Add profile picture');
        changes.push('Write comprehensive bio');
        changes.push('List key skills');
        break;
    }
    
    return changes;
  }

  private extractKeywords(text: string): string[] {
    this.tfidf.addDocument(text);
    const terms: any[] = [];
    
    this.tfidf.listTerms(0).forEach((item: any) => {
      terms.push(item.term);
    });
    
    return terms.slice(0, 20);
  }

  private async calculateIndustryRelevance(profile: any): Promise<number> {
    if (!profile.industry) return 0;
    
    const industryKeywords = await this.getIndustryKeywords(profile.industry);
    const profileText = `${profile.bio} ${profile.headline} ${profile.skills}`.toLowerCase();
    
    let matchCount = 0;
    industryKeywords.forEach(keyword => {
      if (profileText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    });
    
    return Math.min(matchCount / industryKeywords.length, 1);
  }

  private async getIndustryKeywords(industry: string): Promise<string[]> {
    const keywords: Record<string, string[]> = {
      'Film & TV': ['actor', 'director', 'producer', 'screenplay', 'cinematography'],
      'Theater': ['stage', 'play', 'performance', 'drama', 'theatrical'],
      'OTT': ['streaming', 'web series', 'digital', 'content', 'original'],
    };
    
    return keywords[industry] || [];
  }

  private calculateSocialPresence(profile: any): number[] {
    return [
      profile.linkedin ? 1 : 0,
      profile.twitter ? 1 : 0,
      profile.instagram ? 1 : 0,
      profile.facebook ? 1 : 0,
      profile.website ? 1 : 0,
    ];
  }

  private async getEngagementMetrics(userId: string): Promise<number[]> {
    const metrics = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(DISTINCT profile_views) as views,
        COUNT(DISTINCT connections) as connections,
        COUNT(DISTINCT messages) as messages,
        COUNT(DISTINCT applications) as applications
      FROM user_engagement_metrics
      WHERE user_id = ${userId}
      AND created_at > NOW() - INTERVAL '30 days'
    `;
    
    const data = metrics[0] || {};
    return [
      Math.min(data.views / 100, 1),
      Math.min(data.connections / 50, 1),
      Math.min(data.messages / 20, 1),
      Math.min(data.applications / 10, 1),
    ];
  }

  private async getUserExperiences(userId: string): Promise<any[]> {
    return await this.prisma.$queryRaw`
      SELECT * FROM experiences
      WHERE user_id = ${userId}
      ORDER BY start_date DESC
    `;
  }

  private async getUserUploadedFiles(userId: string): Promise<any[]> {
    return await this.prisma.$queryRaw`
      SELECT * FROM user_files
      WHERE user_id = ${userId}
    `;
  }

  private async inferFromUploadedContent(files: any[]): Promise<any> {
    const inferences: any = {
      hasResume: files.some(f => f.type === 'resume'),
      hasPortfolio: files.some(f => f.type === 'portfolio'),
      hasHeadshots: files.some(f => f.type === 'headshot'),
      fileCount: files.length,
    };
    
    return inferences;
  }

  private async analyzeSocialProfiles(profile: any): Promise<any> {
    const insights: any = {};
    
    if (profile.linkedin) {
      insights.hasLinkedIn = true;
    }
    
    if (profile.instagram) {
      insights.hasInstagram = true;
    }
    
    return insights;
  }

  private async validateSkills(userId: string): Promise<number> {
    const skills = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM user_skills
      WHERE user_id = ${userId}
    `;
    
    if (skills.length === 0) return 0;
    
    const validSkills = skills.filter(skill => 
      skill.name && skill.name.length > 1 && skill.name.length < 50
    );
    
    return validSkills.length / skills.length;
  }

  private async validateExperience(userId: string): Promise<number> {
    const experiences = await this.getUserExperiences(userId);
    
    if (experiences.length === 0) return 0;
    
    const validExperiences = experiences.filter(exp => {
      const hasRequiredFields = exp.title && exp.company && exp.start_date;
      const hasValidDates = !exp.end_date || new Date(exp.end_date) > new Date(exp.start_date);
      return hasRequiredFields && hasValidDates;
    });
    
    return validExperiences.length / experiences.length;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
  }

  private isValidLinkedIn(url: string): boolean {
    return url.includes('linkedin.com/in/');
  }

  private async storeProfileAnalysis(
    userId: string,
    score: number,
    recommendations: ProfileRecommendation[]
  ): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO profile_analyses (
        user_id, overall_score, recommendations, analyzed_at
      ) VALUES (
        ${userId}, ${score}, ${JSON.stringify(recommendations)}, ${new Date()}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        overall_score = ${score},
        recommendations = ${JSON.stringify(recommendations)},
        analyzed_at = ${new Date()}
    `;
  }

  private async storeValidationResult(userId: string, result: ExplainableAIResult): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO profile_validations (
        user_id, prediction, confidence, explanation, metadata, created_at
      ) VALUES (
        ${userId}, ${JSON.stringify(result.prediction)}, ${result.confidence},
        ${JSON.stringify(result.explanation)}, ${JSON.stringify(result.metadata)}, ${new Date()}
      )
    `;
  }

  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}