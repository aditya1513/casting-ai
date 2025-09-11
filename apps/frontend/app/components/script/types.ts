// Core script analysis types
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadProgress: number;
  analysisProgress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  url?: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  age: string;
  gender: 'male' | 'female' | 'non-binary' | 'any';
  role: 'lead' | 'supporting' | 'cameo';
  traits: string[];
  dialogueCount: number;
  sceneCount: number;
  importance: number;
  requirements: {
    physical: string[];
    skills: string[];
    experience: string[];
    languages: string[];
  };
  talentMatches?: TalentMatch[];
}

export interface TalentMatch {
  talentId: string;
  name: string;
  profileImage: string;
  matchScore: number;
  age: number;
  experience: string[];
  skills: string[];
  languages: string[];
  location: string;
  availability: 'available' | 'busy' | 'unknown';
  rateRange: {
    min: number;
    max: number;
    currency: string;
  };
  portfolio?: {
    images: string[];
    videos: string[];
    credits: string[];
  };
}

export interface ScriptMetadata {
  title: string;
  genre: string[];
  themes: string[];
  setting: {
    timeframe: string;
    locations: string[];
    budget: 'low' | 'medium' | 'high';
  };
  structure: {
    acts: number;
    scenes: number;
    pages: number;
    duration: number; // in minutes
  };
  complexity: {
    visualEffects: 'none' | 'minimal' | 'moderate' | 'heavy';
    stunts: 'none' | 'minimal' | 'moderate' | 'heavy';
    specialRequirements: string[];
  };
  language: {
    primary: string;
    secondary: string[];
    dialects: string[];
  };
}

export interface AnalysisResult {
  id: string;
  fileId: string;
  metadata: ScriptMetadata;
  characters: Character[];
  summary: string;
  keyScenes: {
    id: string;
    title: string;
    description: string;
    charactersInvolved: string[];
    importance: number;
    requirements: string[];
  }[];
  timeline: {
    totalDays: number;
    phases: {
      name: string;
      duration: number;
      scenes: string[];
    }[];
  };
  budget: {
    estimated: {
      min: number;
      max: number;
      currency: string;
    };
    breakdown: {
      category: string;
      amount: number;
      percentage: number;
    }[];
  };
  casting: {
    priority: 'high' | 'medium' | 'low';
    deadline?: Date;
    status: 'not-started' | 'in-progress' | 'completed';
    progress: {
      charactersAssigned: number;
      auditionsScheduled: number;
      callbacksComplete: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}