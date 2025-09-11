'use client';

import React, { useState } from 'react';
import { ScriptUploadZone, ScriptAnalysisDashboard } from '../components/script';

interface AnalysisResult {
  id: string;
  fileId: string;
  metadata: any;
  characters: any[];
  summary: string;
  createdAt: Date;
}

export default function ScriptUploadPage() {
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);

  const handleFileAnalyzed = (result: any) => {
    console.log('File analyzed:', result);
    
    // Mock analysis result for demo
    const mockAnalysis: AnalysisResult = {
      id: result.id,
      fileId: result.id,
      metadata: {
        title: 'Mumbai Stories',
        genre: ['Drama', 'Romance'],
        themes: ['Family', 'Love', 'Ambition'],
        setting: {
          timeframe: 'Contemporary',
          locations: ['Mumbai', 'Bollywood Studio'],
          budget: 'medium',
        },
        structure: {
          acts: 3,
          scenes: 15,
          pages: 120,
          duration: 125,
        },
        language: {
          primary: 'Hindi',
          secondary: ['English'],
          dialects: ['Mumbai Hindi'],
        },
      },
      characters: [
        {
          id: 'char_1',
          name: 'Arjun Sharma',
          description: 'Lead protagonist - aspiring actor from middle-class Mumbai family',
          age: '25-30',
          gender: 'male',
          role: 'lead',
          traits: ['Determined', 'Emotional', 'Charismatic'],
          dialogueCount: 120,
          sceneCount: 12,
          importance: 10,
          requirements: {
            physical: ['Athletic build', 'Expressive eyes'],
            skills: ['Acting', 'Dancing', 'Hindi dialogue'],
            experience: ['Theater', 'Supporting roles'],
            languages: ['Hindi', 'English', 'Marathi'],
          },
          talentMatches: [
            {
              id: 'match_1',
              talentId: 'talent_1',
              name: 'Rahul Verma',
              profileImage: '/api/placeholder/150/150',
              matchScore: 92,
              age: 27,
              experience: ['Theater', 'Supporting roles'],
              skills: ['Acting', 'Dancing', 'Hindi dialogue'],
              languages: ['Hindi', 'English', 'Marathi'],
              location: 'Mumbai',
              availability: 'available',
              rateRange: { min: 50000, max: 100000, currency: 'INR' },
            },
          ],
        },
        {
          id: 'char_2',
          name: 'Priya Kapoor',
          description: 'Female lead - successful casting director',
          age: '23-28',
          gender: 'female',
          role: 'lead',
          traits: ['Independent', 'Professional', 'Compassionate'],
          dialogueCount: 85,
          sceneCount: 10,
          importance: 9,
          requirements: {
            physical: ['Professional appearance', 'Confident posture'],
            skills: ['Acting', 'English/Hindi dialogue'],
            experience: ['Lead/supporting roles', 'Commercial experience'],
            languages: ['Hindi', 'English'],
          },
          talentMatches: [
            {
              id: 'match_2',
              talentId: 'talent_2',
              name: 'Priyanka Singh',
              profileImage: '/api/placeholder/150/150',
              matchScore: 88,
              age: 25,
              experience: ['Lead roles', 'Commercial experience'],
              skills: ['Acting', 'English/Hindi dialogue'],
              languages: ['Hindi', 'English'],
              location: 'Mumbai',
              availability: 'available',
              rateRange: { min: 75000, max: 150000, currency: 'INR' },
            },
          ],
        },
      ],
      summary: 'A heartwarming story of a young aspiring actor from Mumbai who navigates the challenges of the film industry while maintaining family relationships. The script explores themes of ambition, love, and staying true to one\'s roots in the fast-paced world of Bollywood.',
      createdAt: new Date(),
    };

    setCurrentAnalysis(mockAnalysis);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Script Analysis</h1>
          <p className="text-gray-600 mt-2">
            Upload your script to get detailed character breakdown and talent matching recommendations
          </p>
        </div>

        {!currentAnalysis ? (
          <div className="max-w-4xl mx-auto">
            <ScriptUploadZone
              onFileAnalyzed={handleFileAnalyzed}
              maxFiles={1}
              maxSize={50 * 1024 * 1024} // 50MB
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">
                Analysis Results
              </h2>
              <button
                onClick={() => setCurrentAnalysis(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Upload New Script
              </button>
            </div>
            
            <ScriptAnalysisDashboard analysis={currentAnalysis} />
          </div>
        )}
      </div>
    </div>
  );
}