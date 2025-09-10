/**
 * tRPC Types for Frontend
 * Mirror of backend AppRouter type
 */

// This should match the backend AppRouter type
export interface AppRouter {
  health: {
    check: {
      query: () => Promise<{
        success: boolean;
        status: string;
        timestamp: string;
        uptime: number;
        environment: string;
        version: string;
        server: string;
        database?: string;
      }>;
    };
  };
  talents: {
    list: {
      query: (input: {
        page?: number;
        limit?: number;
        query?: string;
        location?: string;
        experience?: string;
        languages?: string[];
        skills?: string[];
        minRating?: number;
      }) => Promise<{
        success: boolean;
        data: Array<{
          id: string;
          name: string;
          email: string;
          phone?: string;
          location?: string;
          experience: string;
          languages: string[];
          skills: string[];
          rating?: number;
          reviewCount?: number;
          bio?: string;
          status: string;
          createdAt: Date;
          updatedAt: Date;
          stageName?: string;
          gender?: string;
          city?: string;
          state?: string;
          country?: string;
          height?: number;
          weight?: number;
          eyeColor?: string;
          hairColor?: string;
          willingToTravel?: boolean;
          minBudget?: string;
          maxBudget?: string;
        }>;
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      }>;
    };
    getById: {
      query: (input: { id: string }) => Promise<{
        success: boolean;
        data: any;
      }>;
    };
  };
  dashboard: {
    getStats: {
      query: () => Promise<{
        success: boolean;
        data: {
          totalTalents: number;
          activeProjects: number;
          pendingApplications: number;
          cities: number;
          responseRate: number;
          thisWeekTrend: {
            talents: string;
            projects: string;
            applications: string;
            responseRate: string;
          };
        };
      }>;
    };
    getRecentProjects: {
      query: (input: { limit?: number }) => Promise<{
        success: boolean;
        data: any[];
      }>;
    };
    getRecentActivity: {
      query: (input: { limit?: number }) => Promise<{
        success: boolean;
        data: any[];
      }>;
    };
  };
  ai: {
    chat: {
      mutation: (input: {
        message: string;
        conversationId?: string;
        context?: {
          type: 'talent_search' | 'script_analysis' | 'casting_insights';
          data?: any;
        };
      }) => Promise<{
        success: boolean;
        data: {
          message: string;
          conversationId: string;
          suggestions?: string[];
          context?: any;
        };
      }>;
    };
    searchTalents: {
      query: (input: {
        query: string;
        filters?: {
          experience?: string;
          location?: string;
          skills?: string[];
          languages?: string[];
          ageRange?: { min: number; max: number };
          budget?: { min: number; max: number };
        };
      }) => Promise<{
        success: boolean;
        data: {
          talents: any[];
          insights: string;
          recommendations: string[];
        };
      }>;
    };
    analyzeScript: {
      mutation: (input: {
        script: string;
        genre?: string;
        budget?: number;
      }) => Promise<{
        success: boolean;
        data: {
          characters: Array<{
            name: string;
            description: string;
            ageRange: { min: number; max: number };
            gender: string;
            traits: string[];
            importance: 'lead' | 'supporting' | 'minor';
          }>;
          castingInsights: string;
          budgetRecommendations: string;
        };
      }>;
    };
  };
}