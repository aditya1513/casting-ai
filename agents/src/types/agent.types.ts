// Core Agent Types
export interface AgentBase {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error';
  createdAt: Date;
  lastExecuted?: Date;
}

export interface AgentExecution {
  agentId: string;
  input: any;
  output?: any;
  error?: string;
  duration: number;
  timestamp: Date;
}

// Casting-specific Types
export interface CastingProject {
  id: string;
  title: string;
  type: 'film' | 'tv-series' | 'web-series' | 'commercial' | 'theatre';
  status: 'pre-production' | 'casting' | 'production' | 'post-production' | 'completed';
  budget?: {
    total: number;
    casting: number;
    currency: string;
  };
  timeline: {
    castingStart: Date;
    castingEnd: Date;
    productionStart: Date;
  };
  requirements: RoleRequirement[];
  stakeholders: Stakeholder[];
}

export interface RoleRequirement {
  id: string;
  characterName: string;
  description: string;
  importance: 'lead' | 'supporting' | 'background';
  ageRange: { min: number; max: number };
  gender: 'male' | 'female' | 'non-binary' | 'any';
  physicalRequirements?: string[];
  skills?: string[];
  experience?: 'newcomer' | 'emerging' | 'experienced' | 'star';
  budgetRange?: { min: number; max: number };
  availability: {
    startDate: Date;
    endDate: Date;
    location: string;
  };
}

export interface TalentProfile {
  id: string;
  personalInfo: {
    name: string;
    age: number;
    gender: string;
    location: string;
    contact: {
      email: string;
      phone: string;
    };
  };
  physicalAttributes: {
    height: string;
    weight: string;
    eyeColor: string;
    hairColor: string;
    build: string;
  };
  professional: {
    experience: string[];
    skills: string[];
    training: string[];
    representation?: {
      agentName: string;
      agentContact: string;
    };
    rates: {
      dailyRate: number;
      currency: string;
    };
  };
  portfolio: {
    headshots: string[];
    reels: string[];
    resumeUrl: string;
  };
  availability: {
    isAvailable: boolean;
    blackoutDates?: Date[];
    preferredLocations: string[];
  };
}

export interface AuditionSlot {
  id: string;
  projectId: string;
  roleId: string;
  talentId: string;
  datetime: Date;
  duration: number;
  location: string;
  type: 'in-person' | 'virtual' | 'self-tape';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

export interface CastingDecision {
  roleId: string;
  selectedTalentId: string;
  alternativeOptions: string[];
  reasoning: string;
  confidence: number;
  stakeholderApprovals: {
    stakeholderId: string;
    approved: boolean;
    feedback?: string;
  }[];
  finalizedAt?: Date;
}

export interface Stakeholder {
  id: string;
  name: string;
  role: 'director' | 'producer' | 'casting-director' | 'network-executive';
  contactInfo: {
    email: string;
    phone?: string;
  };
  approvalLevel: 'advisory' | 'required' | 'veto';
  preferences?: {
    communicationMethod: 'email' | 'phone' | 'in-app';
    notificationFrequency: 'immediate' | 'daily' | 'weekly';
  };
}

// Agent Function Types
export interface ScriptAnalysisResult {
  characters: {
    name: string;
    description: string;
    ageRange: string;
    gender: string;
    importance: 'lead' | 'supporting' | 'background';
    sceneCount: number;
    dialogueIntensity: 'high' | 'medium' | 'low';
    specialSkills: string[];
    budgetTier: 'A' | 'B' | 'C';
  }[];
  genres: string[];
  themes: string[];
  budgetEstimate: {
    castingCost: number;
    complexity: 'simple' | 'moderate' | 'complex';
  };
}

export interface TalentSearchParams {
  roleDescription: string;
  physicalRequirements: {
    ageRange: { min: number; max: number };
    gender: string;
    height?: string;
    build?: string;
  };
  experienceLevel: string;
  budgetRange: { min: number; max: number };
  locationPreference: string;
  availabilityWindow: { start: Date; end: Date };
  specialSkills?: string[];
  languages?: string[];
}

export interface TalentRanking {
  talentId: string;
  matchScore: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  riskFactors: string[];
  recommendation: 'strongly_recommend' | 'recommend' | 'consider' | 'not_suitable';
  reasoning: string;
}

export interface ApplicationScreeningResult {
  applicationId: string;
  compatibilityScore: number; // 0-100
  strengths: string[];
  concerns: string[];
  recommendation: 'shortlist' | 'maybe' | 'reject';
  reasoning: string;
  flaggedIssues?: string[];
}

export interface BudgetAnalysis {
  currentCastingCost: number;
  budgetUtilization: number; // percentage
  costBreakdown: {
    leads: number;
    supporting: number;
    background: number;
  };
  optimizationOpportunities: {
    category: string;
    currentCost: number;
    optimizedCost: number;
    impactOnQuality: 'none' | 'minimal' | 'moderate' | 'significant';
    alternativeOptions: string[];
  }[];
  alerts: string[];
}

export interface ProgressReport {
  projectId: string;
  overallProgress: number; // percentage
  rolesStatus: {
    roleId: string;
    roleName: string;
    status: 'not_started' | 'searching' | 'auditioning' | 'deciding' | 'cast';
    timelineStatus: 'ahead' | 'on_track' | 'at_risk' | 'delayed';
    bottlenecks: string[];
  }[];
  upcomingDeadlines: {
    item: string;
    deadline: Date;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }[];
  recommendedActions: string[];
}