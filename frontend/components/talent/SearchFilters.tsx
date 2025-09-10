'use client'

import { useState, useEffect } from 'react'
import { X, ChevronDown, ChevronUp, Filter, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { TalentSearchParams } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface SearchFiltersProps {
  filters: TalentSearchParams
  onFiltersChange: (filters: TalentSearchParams) => void
  className?: string
  isMobile?: boolean
}

interface FilterSection {
  title: string
  key: string
  isOpen: boolean
}

const LANGUAGES = [
  'Hindi', 'English', 'Marathi', 'Gujarati', 'Punjabi', 
  'Bengali', 'Tamil', 'Telugu', 'Malayalam', 'Kannada'
]

const SKILLS = [
  'Acting', 'Dancing', 'Singing', 'Comedy', 'Drama', 'Action',
  'Romance', 'Thriller', 'Voice Acting', 'Modeling', 'Theatre',
  'Improvisation', 'Stunts', 'Classical Dance', 'Western Dance'
]

const LOCATIONS = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata',
  'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'
]

export function SearchFilters({ filters, onFiltersChange, className, isMobile = false }: SearchFiltersProps) {
  const [sections, setSections] = useState<FilterSection[]>([
    { title: 'Age Range', key: 'age', isOpen: true },
    { title: 'Gender', key: 'gender', isOpen: true },
    { title: 'Location', key: 'location', isOpen: true },
    { title: 'Languages', key: 'languages', isOpen: true },
    { title: 'Skills', key: 'skills', isOpen: true },
    { title: 'Experience Level', key: 'experience', isOpen: true },
    { title: 'Availability', key: 'availability', isOpen: true },
    { title: 'Rating', key: 'rating', isOpen: true },
    { title: 'Verification', key: 'verification', isOpen: true },
  ])

  const toggleSection = (key: string) => {
    setSections(prev =>
      prev.map(section =>
        section.key === key ? { ...section, isOpen: !section.isOpen } : section
      )
    )
  }

  const handleFilterChange = (key: keyof TalentSearchParams, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const handleLanguageToggle = (language: string) => {
    const currentLanguages = filters.languages || []
    const newLanguages = currentLanguages.includes(language)
      ? currentLanguages.filter(l => l !== language)
      : [...currentLanguages, language]
    handleFilterChange('languages', newLanguages)
  }

  const handleSkillToggle = (skill: string) => {
    const currentSkills = filters.skills || []
    const newSkills = currentSkills.includes(skill)
      ? currentSkills.filter(s => s !== skill)
      : [...currentSkills, skill]
    handleFilterChange('skills', newSkills)
  }

  const clearAllFilters = () => {
    onFiltersChange({})
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.ageMin || filters.ageMax) count++
    if (filters.gender) count++
    if (filters.location) count++
    if (filters.languages?.length) count += filters.languages.length
    if (filters.skills?.length) count += filters.skills.length
    if (filters.experience) count++
    if (filters.availability) count++
    if (filters.rating) count++
    if (filters.verified) count++
    return count
  }

  const FilterContent = () => (
    <div className="space-y-4">
      {/* Active Filters */}
      {getActiveFiltersCount() > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Active Filters ({getActiveFiltersCount()})</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-auto p-1"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.gender && (
              <Badge variant="secondary" className="gap-1">
                {filters.gender}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => handleFilterChange('gender', undefined)}
                />
              </Badge>
            )}
            {filters.location && (
              <Badge variant="secondary" className="gap-1">
                {filters.location}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => handleFilterChange('location', undefined)}
                />
              </Badge>
            )}
            {filters.languages?.map(lang => (
              <Badge key={lang} variant="secondary" className="gap-1">
                {lang}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => handleLanguageToggle(lang)}
                />
              </Badge>
            ))}
            {filters.skills?.map(skill => (
              <Badge key={skill} variant="secondary" className="gap-1">
                {skill}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => handleSkillToggle(skill)}
                />
              </Badge>
            ))}
          </div>
          <Separator />
        </div>
      )}

      {/* Filter Sections */}
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-4 pr-4">
          {/* Age Range */}
          <Collapsible open={sections.find(s => s.key === 'age')?.isOpen}>
            <CollapsibleTrigger
              onClick={() => toggleSection('age')}
              className="flex items-center justify-between w-full hover:bg-gray-50 p-2 rounded-md"
            >
              <span className="font-medium">Age Range</span>
              {sections.find(s => s.key === 'age')?.isOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <div className="px-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    {filters.ageMin || 18} - {filters.ageMax || 65} years
                  </span>
                </div>
                <Slider
                  min={18}
                  max={65}
                  step={1}
                  value={[filters.ageMin || 18, filters.ageMax || 65]}
                  onValueChange={([min, max]) => {
                    handleFilterChange('ageMin', min)
                    handleFilterChange('ageMax', max)
                  }}
                  className="w-full"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Gender */}
          <Collapsible open={sections.find(s => s.key === 'gender')?.isOpen}>
            <CollapsibleTrigger
              onClick={() => toggleSection('gender')}
              className="flex items-center justify-between w-full hover:bg-gray-50 p-2 rounded-md"
            >
              <span className="font-medium">Gender</span>
              {sections.find(s => s.key === 'gender')?.isOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <RadioGroup
                value={filters.gender || ''}
                onValueChange={(value) => handleFilterChange('gender', value || undefined)}
                className="space-y-2 px-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="" id="all-genders" />
                  <Label htmlFor="all-genders">All</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">Female</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other">Other</Label>
                </div>
              </RadioGroup>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Location */}
          <Collapsible open={sections.find(s => s.key === 'location')?.isOpen}>
            <CollapsibleTrigger
              onClick={() => toggleSection('location')}
              className="flex items-center justify-between w-full hover:bg-gray-50 p-2 rounded-md"
            >
              <span className="font-medium">Location</span>
              {sections.find(s => s.key === 'location')?.isOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <RadioGroup
                value={filters.location || ''}
                onValueChange={(value) => handleFilterChange('location', value || undefined)}
                className="space-y-2 px-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="" id="all-locations" />
                  <Label htmlFor="all-locations">All Locations</Label>
                </div>
                {LOCATIONS.map(location => (
                  <div key={location} className="flex items-center space-x-2">
                    <RadioGroupItem value={location} id={location} />
                    <Label htmlFor={location}>{location}</Label>
                  </div>
                ))}
              </RadioGroup>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Languages */}
          <Collapsible open={sections.find(s => s.key === 'languages')?.isOpen}>
            <CollapsibleTrigger
              onClick={() => toggleSection('languages')}
              className="flex items-center justify-between w-full hover:bg-gray-50 p-2 rounded-md"
            >
              <span className="font-medium">Languages</span>
              {sections.find(s => s.key === 'languages')?.isOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2 px-2">
                {LANGUAGES.map(language => (
                  <div key={language} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`lang-${language}`}
                      checked={filters.languages?.includes(language) || false}
                      onChange={() => handleLanguageToggle(language)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={`lang-${language}`} className="cursor-pointer">
                      {language}
                    </Label>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Skills */}
          <Collapsible open={sections.find(s => s.key === 'skills')?.isOpen}>
            <CollapsibleTrigger
              onClick={() => toggleSection('skills')}
              className="flex items-center justify-between w-full hover:bg-gray-50 p-2 rounded-md"
            >
              <span className="font-medium">Skills</span>
              {sections.find(s => s.key === 'skills')?.isOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2 px-2">
                {SKILLS.map(skill => (
                  <div key={skill} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`skill-${skill}`}
                      checked={filters.skills?.includes(skill) || false}
                      onChange={() => handleSkillToggle(skill)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={`skill-${skill}`} className="cursor-pointer">
                      {skill}
                    </Label>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Experience Level */}
          <Collapsible open={sections.find(s => s.key === 'experience')?.isOpen}>
            <CollapsibleTrigger
              onClick={() => toggleSection('experience')}
              className="flex items-center justify-between w-full hover:bg-gray-50 p-2 rounded-md"
            >
              <span className="font-medium">Experience Level</span>
              {sections.find(s => s.key === 'experience')?.isOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <RadioGroup
                value={filters.experience || ''}
                onValueChange={(value) => handleFilterChange('experience', value || undefined)}
                className="space-y-2 px-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="" id="all-experience" />
                  <Label htmlFor="all-experience">All Levels</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="beginner" id="beginner" />
                  <Label htmlFor="beginner">Beginner</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="intermediate" id="intermediate" />
                  <Label htmlFor="intermediate">Intermediate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="expert" id="expert" />
                  <Label htmlFor="expert">Expert</Label>
                </div>
              </RadioGroup>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Availability */}
          <Collapsible open={sections.find(s => s.key === 'availability')?.isOpen}>
            <CollapsibleTrigger
              onClick={() => toggleSection('availability')}
              className="flex items-center justify-between w-full hover:bg-gray-50 p-2 rounded-md"
            >
              <span className="font-medium">Availability</span>
              {sections.find(s => s.key === 'availability')?.isOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <RadioGroup
                value={filters.availability || ''}
                onValueChange={(value) => handleFilterChange('availability', value || undefined)}
                className="space-y-2 px-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="" id="all-availability" />
                  <Label htmlFor="all-availability">All</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="available" id="available" />
                  <Label htmlFor="available">Available</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="busy" id="busy" />
                  <Label htmlFor="busy">Busy</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="not_available" id="not_available" />
                  <Label htmlFor="not_available">Not Available</Label>
                </div>
              </RadioGroup>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Rating */}
          <Collapsible open={sections.find(s => s.key === 'rating')?.isOpen}>
            <CollapsibleTrigger
              onClick={() => toggleSection('rating')}
              className="flex items-center justify-between w-full hover:bg-gray-50 p-2 rounded-md"
            >
              <span className="font-medium">Minimum Rating</span>
              {sections.find(s => s.key === 'rating')?.isOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <div className="px-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    {filters.rating || 0}+ stars
                  </span>
                </div>
                <Slider
                  min={0}
                  max={5}
                  step={0.5}
                  value={[filters.rating || 0]}
                  onValueChange={([value]) => handleFilterChange('rating', value)}
                  className="w-full"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Verification */}
          <Collapsible open={sections.find(s => s.key === 'verification')?.isOpen}>
            <CollapsibleTrigger
              onClick={() => toggleSection('verification')}
              className="flex items-center justify-between w-full hover:bg-gray-50 p-2 rounded-md"
            >
              <span className="font-medium">Verification</span>
              {sections.find(s => s.key === 'verification')?.isOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="flex items-center justify-between px-2">
                <Label htmlFor="verified-only">Verified profiles only</Label>
                <Switch
                  id="verified-only"
                  checked={filters.verified || false}
                  onCheckedChange={(checked) => handleFilterChange('verified', checked)}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="ml-1">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <FilterContent />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div className={cn('bg-white rounded-lg border p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Filters</h3>
        {getActiveFiltersCount() > 0 && (
          <Badge variant="secondary">{getActiveFiltersCount()} active</Badge>
        )}
      </div>
      <FilterContent />
    </div>
  )
}