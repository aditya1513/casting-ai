'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Users, 
  Clock, 
  Film, 
  Star, 
  MapPin, 
  Calendar,
  TrendingUp,
  Download,
  Share2,
  Edit,
  Eye,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  BarChart3,
  PieChart,
  Activity,
  Award,
  Heart,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface Character {
  id: string;
  name: string;
  description: string;
  age: string;
  gender: 'Male' | 'Female' | 'Non-binary' | 'Any';
  importance: 'Lead' | 'Supporting' | 'Minor';
  scenes: number;
  dialogueCount: number;
  traits: string[];
  requirements: {
    experience: string;
    skills: string[];
    physicalAttributes: string[];
    languages: string[];
  };
  matchedTalents?: {
    id: string;
    name: string;
    avatar: string;
    matchScore: number;
    availability: 'available' | 'busy' | 'booked';
  }[];
}

interface ScriptAnalysis {
  id: string;
  title: string;
  genre: string[];
  duration: string;
  scenes: number;
  complexity: 'Simple' | 'Medium' | 'Complex';
  budget: 'Low' | 'Medium' | 'High';
  characters: Character[];
  themes: string[];
  locations: string[];
  timeOfDay: string[];
  targetAudience: string[];
  productionNotes: string[];
  uploadedAt: Date;
  analyzedAt: Date;
  confidence: number;
}

interface ScriptAnalysisDashboardProps {
  analysis: ScriptAnalysis;
  onTalentMatch?: (characterId: string, talentId: string) => void;
  onScheduleAudition?: (characterId: string, talentId: string) => void;
  onExportReport?: () => void;
  className?: string;
}

export const ScriptAnalysisDashboard: React.FC<ScriptAnalysisDashboardProps> = ({
  analysis,
  onTalentMatch,
  onScheduleAudition,
  onExportReport,
  className,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedCharacters, setExpandedCharacters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImportance, setSelectedImportance] = useState<string[]>([]);

  const toggleCharacterExpansion = (characterId: string) => {
    setExpandedCharacters(prev =>
      prev.includes(characterId)
        ? prev.filter(id => id !== characterId)
        : [...prev, characterId]
    );
  };

  const filteredCharacters = analysis.characters.filter(character => {
    const matchesSearch = character.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         character.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesImportance = selectedImportance.length === 0 || 
                             selectedImportance.includes(character.importance);
    return matchesSearch && matchesImportance;
  });

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'Lead':
        return 'bg-red-500/10 text-red-700 border-red-200';
      case 'Supporting':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'Minor':
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getComplexityIcon = (complexity: string) => {
    switch (complexity) {
      case 'Simple':
        return <BarChart3 className="h-4 w-4 text-green-500" />;
      case 'Medium':
        return <TrendingUp className="h-4 w-4 text-yellow-500" />;
      case 'Complex':
        return <Activity className="h-4 w-4 text-red-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{analysis.title}</h1>
            <Badge variant="outline" className="capitalize">
              {analysis.confidence}% confidence
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Analyzed {formatDate(analysis.analyzedAt)}</span>
            <span>•</span>
            <span>{analysis.characters.length} characters identified</span>
            <span>•</span>
            <span>{analysis.scenes} scenes</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Analysis
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Characters</span>
            </div>
            <div className="text-2xl font-bold">{analysis.characters.length}</div>
            <div className="text-xs text-muted-foreground">
              {analysis.characters.filter(c => c.importance === 'Lead').length} leads,{' '}
              {analysis.characters.filter(c => c.importance === 'Supporting').length} supporting
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Duration</span>
            </div>
            <div className="text-2xl font-bold">{analysis.duration}</div>
            <div className="text-xs text-muted-foreground">
              {analysis.scenes} scenes
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {getComplexityIcon(analysis.complexity)}
              <span className="text-sm font-medium">Complexity</span>
            </div>
            <div className="text-2xl font-bold">{analysis.complexity}</div>
            <div className="text-xs text-muted-foreground">
              Production level
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Locations</span>
            </div>
            <div className="text-2xl font-bold">{analysis.locations.length}</div>
            <div className="text-xs text-muted-foreground">
              Shooting locations
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="characters">Characters</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="casting">Casting</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Script Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Script Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Genre</h4>
                  <div className="flex flex-wrap gap-1">
                    {analysis.genre.map((g) => (
                      <Badge key={g} variant="secondary">{g}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Themes</h4>
                  <div className="flex flex-wrap gap-1">
                    {analysis.themes.map((theme) => (
                      <Badge key={theme} variant="outline">{theme}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Target Audience</h4>
                  <div className="flex flex-wrap gap-1">
                    {analysis.targetAudience.map((audience) => (
                      <Badge key={audience} variant="secondary">{audience}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Production Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Locations ({analysis.locations.length})</h4>
                  <div className="space-y-1">
                    {analysis.locations.slice(0, 5).map((location) => (
                      <div key={location} className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span>{location}</span>
                      </div>
                    ))}
                    {analysis.locations.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{analysis.locations.length - 5} more locations
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Time of Day</h4>
                  <div className="flex flex-wrap gap-1">
                    {analysis.timeOfDay.map((time) => (
                      <Badge key={time} variant="outline">{time}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Budget Estimate</h4>
                  <Badge variant="secondary" className="capitalize">
                    {analysis.budget} Budget
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Character Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Character Distribution</CardTitle>
              <CardDescription>
                Distribution of characters by importance and dialogue count
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Lead', 'Supporting', 'Minor'].map((importance) => {
                  const chars = analysis.characters.filter(c => c.importance === importance);
                  const percentage = (chars.length / analysis.characters.length) * 100;
                  
                  return (
                    <div key={importance} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{importance} Characters</span>
                        <span>{chars.length} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="characters" className="space-y-6">
          {/* Character Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search characters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  {['Lead', 'Supporting', 'Minor'].map((importance) => (
                    <Button
                      key={importance}
                      variant={selectedImportance.includes(importance) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedImportance(prev =>
                          prev.includes(importance)
                            ? prev.filter(i => i !== importance)
                            : [...prev, importance]
                        );
                      }}
                    >
                      {importance}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Character List */}
          <div className="space-y-4">
            {filteredCharacters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                expanded={expandedCharacters.includes(character.id)}
                onToggleExpansion={() => toggleCharacterExpansion(character.id)}
                onTalentMatch={onTalentMatch}
                onScheduleAudition={onScheduleAudition}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {/* Detailed Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Script Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Scenes</span>
                    <span className="font-medium">{analysis.scenes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Duration</span>
                    <span className="font-medium">{analysis.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Character Count</span>
                    <span className="font-medium">{analysis.characters.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location Changes</span>
                    <span className="font-medium">{analysis.locations.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Production Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysis.productionNotes.map((note, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Confidence Score */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analysis Confidence</CardTitle>
              <CardDescription>
                AI confidence level in the analysis accuracy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Overall Confidence</span>
                  <Badge variant="secondary">{analysis.confidence}%</Badge>
                </div>
                <Progress value={analysis.confidence} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  {analysis.confidence >= 90 && "Excellent confidence - Analysis is highly reliable"}
                  {analysis.confidence >= 70 && analysis.confidence < 90 && "Good confidence - Analysis is mostly reliable"}
                  {analysis.confidence < 70 && "Fair confidence - Consider manual review"}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="casting" className="space-y-6">
          {/* Casting Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Casting Progress</CardTitle>
              <CardDescription>
                Track your casting progress for each role
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.characters.filter(c => c.importance !== 'Minor').map((character) => (
                  <div key={character.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{character.name}</span>
                      <Badge className={getImportanceColor(character.importance)}>
                        {character.importance}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{character.matchedTalents?.length || 0} matched talents</span>
                      {character.matchedTalents && character.matchedTalents.length > 0 && (
                        <>
                          <span>•</span>
                          <span>Best match: {Math.max(...character.matchedTalents.map(t => t.matchScore))}%</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-24 flex flex-col gap-2">
              <Search className="h-6 w-6" />
              <span>Find Talents</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <Calendar className="h-6 w-6" />
              <span>Schedule Auditions</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <Download className="h-6 w-6" />
              <span>Export Casting Sheet</span>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Character Card Component
interface CharacterCardProps {
  character: Character;
  expanded: boolean;
  onToggleExpansion: () => void;
  onTalentMatch?: (characterId: string, talentId: string) => void;
  onScheduleAudition?: (characterId: string, talentId: string) => void;
}

const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  expanded,
  onToggleExpansion,
  onTalentMatch,
  onScheduleAudition,
}) => {
  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'Lead':
        return 'bg-red-500/10 text-red-700 border-red-200';
      case 'Supporting':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'Minor':
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardContent className="p-0">
          {/* Character Header */}
          <div 
            className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={onToggleExpansion}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{character.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {character.age} • {character.gender}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={getImportanceColor(character.importance)}>
                  {character.importance}
                </Badge>
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Film className="h-4 w-4" />
                <span>{character.scenes} scenes</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>{character.dialogueCount} lines</span>
              </div>
              {character.matchedTalents && character.matchedTalents.length > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  <span>{character.matchedTalents.length} matched</span>
                </div>
              )}
            </div>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t"
              >
                <div className="p-4 space-y-4">
                  {/* Description */}
                  <div>
                    <h4 className="font-medium mb-2">Character Description</h4>
                    <p className="text-sm text-muted-foreground">{character.description}</p>
                  </div>

                  {/* Traits */}
                  <div>
                    <h4 className="font-medium mb-2">Character Traits</h4>
                    <div className="flex flex-wrap gap-1">
                      {character.traits.map((trait) => (
                        <Badge key={trait} variant="outline" className="text-xs">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Requirements */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Required Skills</h4>
                      <div className="space-y-1">
                        {character.requirements.skills.map((skill) => (
                          <div key={skill} className="text-sm text-muted-foreground">
                            • {skill}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Languages</h4>
                      <div className="flex flex-wrap gap-1">
                        {character.requirements.languages.map((lang) => (
                          <Badge key={lang} variant="secondary" className="text-xs">
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Matched Talents */}
                  {character.matchedTalents && character.matchedTalents.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Matched Talents</h4>
                      <div className="space-y-2">
                        {character.matchedTalents.slice(0, 3).map((talent) => (
                          <div key={talent.id} className="flex items-center justify-between p-2 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={talent.avatar} alt={talent.name} />
                                <AvatarFallback>{talent.name.slice(0, 2)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{talent.name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{talent.matchScore}% match</span>
                                  <Badge 
                                    variant={talent.availability === 'available' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {talent.availability}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => onTalentMatch?.(character.id, talent.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => onScheduleAudition?.(character.id, talent.id)}
                              >
                                <Calendar className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        
                        {character.matchedTalents.length > 3 && (
                          <Button variant="outline" size="sm" className="w-full">
                            View All {character.matchedTalents.length} Matches
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm">
                      <Search className="h-4 w-4 mr-2" />
                      Find Talents
                    </Button>
                    <Button variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Audition
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Requirements
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};