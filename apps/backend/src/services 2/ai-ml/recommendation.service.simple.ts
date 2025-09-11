/**
 * Simple Recommendation Service
 * Temporary implementation to unblock AI routes
 * TODO: Replace with full implementation once Prisma -> Drizzle migration is complete
 */

import { logger } from '../../utils/logger';

export interface TalentRecommendation {
  userId: string;
  name: string;
  profilePicture?: string;
  score: number;
  matchReasons: string[];
  skills: string[];
  experience: string;
  location: string;
  availability: boolean;
  categories: string[];
  languages: string[];
  profileCompleteness: number;
}

export interface RoleRecommendation {
  roleId: string;
  title: string;
  description: string;
  score: number;
  matchReasons: string[];
  requiredSkills: string[];
  category: string;
  location: string;
}

export class RecommendationService {
  /**
   * Get talent recommendations for a role (simplified implementation)
   */
  static async getTalentRecommendations(
    roleId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{
    recommendations: TalentRecommendation[];
    total: number;
    processingTimeMs: number;
  }> {
    const startTime = Date.now();
    
    try {
      logger.info(`Getting talent recommendations for role: ${roleId}`);
      
      // Mock data for now - TODO: Replace with real database queries
      const mockRecommendations: TalentRecommendation[] = [
        {
          userId: 'user-1',
          name: 'Rajesh Kumar',
          profilePicture: '/images/profile1.jpg',
          score: 0.95,
          matchReasons: ['Strong acting experience', 'Perfect age match', 'Mumbai based'],
          skills: ['Method Acting', 'Action Sequences', 'Hindi Fluent'],
          experience: '8 years in film and television',
          location: 'Mumbai',
          availability: true,
          categories: ['Lead Actor', 'Character Actor'],
          languages: ['Hindi', 'English', 'Marathi'],
          profileCompleteness: 95
        },
        {
          userId: 'user-2', 
          name: 'Priya Sharma',
          profilePicture: '/images/profile2.jpg',
          score: 0.88,
          matchReasons: ['Theater background', 'Versatile performer', 'Available immediately'],
          skills: ['Classical Dance', 'Dialogue Delivery', 'Emotional Range'],
          experience: '5 years in theater and web series',
          location: 'Mumbai',
          availability: true,
          categories: ['Supporting Actor', 'Female Lead'],
          languages: ['Hindi', 'English'],
          profileCompleteness: 87
        },
        {
          userId: 'user-3',
          name: 'Amit Singh',
          profilePicture: '/images/profile3.jpg', 
          score: 0.82,
          matchReasons: ['Action experience', 'Stunt training', 'Screen presence'],
          skills: ['Martial Arts', 'Horse Riding', 'Action Choreography'],
          experience: '6 years in action films',
          location: 'Mumbai',
          availability: true,
          categories: ['Action Hero', 'Villain'],
          languages: ['Hindi', 'Punjabi', 'English'],
          profileCompleteness: 78
        }
      ];

      const processingTimeMs = Date.now() - startTime;
      
      logger.info(`Generated ${mockRecommendations.length} talent recommendations in ${processingTimeMs}ms`);

      return {
        recommendations: mockRecommendations.slice(offset, offset + limit),
        total: mockRecommendations.length,
        processingTimeMs
      };

    } catch (error) {
      logger.error('Error getting talent recommendations:', error);
      throw error;
    }
  }

  /**
   * Get role recommendations for a user (simplified implementation)
   */
  static async getRoleRecommendations(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{
    recommendations: RoleRecommendation[];
    total: number;
    processingTimeMs: number;
  }> {
    const startTime = Date.now();
    
    try {
      logger.info(`Getting role recommendations for user: ${userId}`);
      
      // Mock data for now
      const mockRecommendations: RoleRecommendation[] = [
        {
          roleId: 'role-1',
          title: 'Lead Detective',
          description: 'Experienced detective for crime thriller series',
          score: 0.93,
          matchReasons: ['Perfect age range', 'Action experience', 'Strong screen presence'],
          requiredSkills: ['Acting', 'Action Sequences', 'Hindi'],
          category: 'Lead Role',
          location: 'Mumbai'
        },
        {
          roleId: 'role-2',
          title: 'Supporting Character',
          description: 'Best friend character in romantic comedy',
          score: 0.85,
          matchReasons: ['Comedy timing', 'Versatile acting', 'Expressive'],
          requiredSkills: ['Comedy', 'Dialogue Delivery', 'Expressions'],
          category: 'Supporting Role',
          location: 'Mumbai'
        }
      ];

      const processingTimeMs = Date.now() - startTime;
      
      logger.info(`Generated ${mockRecommendations.length} role recommendations in ${processingTimeMs}ms`);

      return {
        recommendations: mockRecommendations.slice(offset, offset + limit),
        total: mockRecommendations.length,
        processingTimeMs
      };

    } catch (error) {
      logger.error('Error getting role recommendations:', error);
      throw error;
    }
  }

  /**
   * Get similar talents (simplified implementation)
   */
  static async getSimilarTalents(
    talentId: string,
    limit: number = 5
  ): Promise<TalentRecommendation[]> {
    try {
      logger.info(`Getting similar talents for: ${talentId}`);
      
      // Return subset of mock recommendations
      const mockSimilar: TalentRecommendation[] = [
        {
          userId: 'similar-1',
          name: 'Vikash Patel',
          score: 0.87,
          matchReasons: ['Similar acting style', 'Same category', 'Mumbai based'],
          skills: ['Method Acting', 'Drama'],
          experience: '7 years experience',
          location: 'Mumbai',
          availability: true,
          categories: ['Character Actor'],
          languages: ['Hindi', 'Gujarati'],
          profileCompleteness: 85
        }
      ];

      return mockSimilar.slice(0, limit);

    } catch (error) {
      logger.error('Error getting similar talents:', error);
      throw error;
    }
  }
}

export default RecommendationService;