/**
 * tRPC Types for Frontend
 * These types match the backend tRPC router structure
 */

export interface TalentProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  experience: 'beginner' | 'intermediate' | 'expert';
  languages: string[];
  skills: string[];
  rating: number;
  reviewCount: number;
  bio?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
  stageName?: string;
  gender?: string;
  city?: string;
  state?: string;
  country?: string;
  height?: string;
  weight?: string;
  eyeColor?: string;
  hairColor?: string;
  willingToTravel?: boolean;
  minBudget?: string;
  maxBudget?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface TalentListResponse {
  success: boolean;
  data: TalentProfile[];
  pagination: PaginationInfo;
}

export interface HealthResponse {
  success: boolean;
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  server: string;
  database?: string;
}

// tRPC Router type definition (simplified for frontend usage)
export interface AppRouter {
  health: {
    check: {
      query: () => HealthResponse;
    };
  };
  talents: {
    list: {
      query: (input?: {
        query?: string;
        location?: string;
        experience?: 'beginner' | 'intermediate' | 'expert';
        languages?: string[];
        skills?: string[];
        minRating?: number;
        page?: number;
        limit?: number;
      }) => TalentListResponse;
    };
    getById: {
      query: (input: { id: string }) => {
        success: boolean;
        data: TalentProfile;
      };
    };
  };
}