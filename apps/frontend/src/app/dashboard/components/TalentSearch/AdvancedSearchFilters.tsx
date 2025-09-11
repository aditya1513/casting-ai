'use client';

import { useState } from 'react';
import {
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Slider,
  Button,
  Chip,
  Accordion,
  AccordionItem,
  Checkbox,
  CheckboxGroup,
  Switch,
} from '@heroui/react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  BookmarkIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

export interface SearchFilters {
  searchTerm: string;
  ageRange: [number, number];
  gender: string;
  location: string;
  languages: string[];
  skills: string[];
  experienceLevel: string;
  availability: string;
  minRating: number;
  verified: boolean;
  physicalAttributes: {
    height: [number, number];
    eyeColor: string;
    hairColor: string;
    bodyType: string;
    ethnicity: string;
  };
  budget: [number, number];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface AdvancedSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}

const genderOptions = [
  { key: 'any', label: 'Any Gender' },
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'non-binary', label: 'Non-binary' },
  { key: 'other', label: 'Other' },
];

const experienceLevels = [
  { key: 'any', label: 'Any Experience' },
  { key: 'fresher', label: 'Fresher (0-2 years)' },
  { key: 'intermediate', label: 'Intermediate (3-5 years)' },
  { key: 'experienced', label: 'Experienced (6-10 years)' },
  { key: 'veteran', label: 'Veteran (10+ years)' },
];

const availabilityOptions = [
  { key: 'any', label: 'Any Availability' },
  { key: 'immediate', label: 'Immediate' },
  { key: 'within_week', label: 'Within a week' },
  { key: 'within_month', label: 'Within a month' },
  { key: 'flexible', label: 'Flexible' },
];

const commonLanguages = [
  'Hindi',
  'English',
  'Marathi',
  'Bengali',
  'Telugu',
  'Tamil',
  'Gujarati',
  'Kannada',
  'Malayalam',
  'Punjabi',
  'Urdu',
  'Sanskrit',
];

const commonSkills = [
  'Method Acting',
  'Classical Acting',
  'Improv',
  'Voice Acting',
  'Theatre',
  'Commercial Acting',
  'Comedy',
  'Drama',
  'Action',
  'Dance',
  'Singing',
  'Musical Theatre',
  'Stunt Work',
  'Horse Riding',
  'Martial Arts',
  'Swimming',
  'Gymnastics',
  'Yoga',
  'Meditation',
];

const eyeColors = ['Any', 'Brown', 'Black', 'Hazel', 'Green', 'Blue', 'Gray'];
const hairColors = ['Any', 'Black', 'Brown', 'Blonde', 'Red', 'Gray', 'White'];
const bodyTypes = ['Any', 'Slim', 'Athletic', 'Average', 'Curvy', 'Plus Size'];
const ethnicities = [
  'Any',
  'North Indian',
  'South Indian',
  'Punjabi',
  'Bengali',
  'Gujarati',
  'Marathi',
];

const sortOptions = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'rating', label: 'Rating' },
  { key: 'experience', label: 'Experience' },
  { key: 'recently_active', label: 'Recently Active' },
  { key: 'created_at', label: 'Newest First' },
];

export default function AdvancedSearchFilters({
  filters,
  onFiltersChange,
  onSearch,
  onClearFilters,
  isLoading = false,
}: AdvancedSearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const updatePhysicalAttribute = (key: keyof SearchFilters['physicalAttributes'], value: any) => {
    onFiltersChange({
      ...filters,
      physicalAttributes: {
        ...filters.physicalAttributes,
        [key]: value,
      },
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.searchTerm !== '' ||
      filters.gender !== 'any' ||
      filters.location !== '' ||
      filters.languages.length > 0 ||
      filters.skills.length > 0 ||
      filters.experienceLevel !== 'any' ||
      filters.availability !== 'any' ||
      filters.minRating > 0 ||
      filters.verified ||
      filters.physicalAttributes.eyeColor !== 'Any' ||
      filters.physicalAttributes.hairColor !== 'Any' ||
      filters.physicalAttributes.bodyType !== 'Any' ||
      filters.physicalAttributes.ethnicity !== 'Any'
    );
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.gender !== 'any') count++;
    if (filters.location) count++;
    if (filters.languages.length > 0) count++;
    if (filters.skills.length > 0) count++;
    if (filters.experienceLevel !== 'any') count++;
    if (filters.availability !== 'any') count++;
    if (filters.minRating > 0) count++;
    if (filters.verified) count++;
    if (filters.physicalAttributes.eyeColor !== 'Any') count++;
    if (filters.physicalAttributes.hairColor !== 'Any') count++;
    if (filters.physicalAttributes.bodyType !== 'Any') count++;
    if (filters.physicalAttributes.ethnicity !== 'Any') count++;
    return count;
  };

  return (
    <Card className="w-full">
      <CardBody className="p-6">
        {/* Search Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MagnifyingGlassIcon className="h-6 w-6 text-teal-600" />
            <h2 className="text-xl font-semibold text-gray-900">Talent Search</h2>
            {hasActiveFilters() && (
              <Chip size="sm" color="primary" variant="flat">
                {getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? 's' : ''} active
              </Chip>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              startContent={<FunnelIcon className="h-4 w-4" />}
              onPress={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Hide Filters' : 'Show Filters'}
            </Button>
            {hasActiveFilters() && (
              <Button
                variant="ghost"
                size="sm"
                color="danger"
                startContent={<XMarkIcon className="h-4 w-4" />}
                onPress={onClearFilters}
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Main Search Bar */}
        <div className="flex gap-3 mb-4">
          <Input
            placeholder="Search by name, skills, or description..."
            value={filters.searchTerm}
            onChange={e => updateFilter('searchTerm', e.target.value)}
            startContent={<MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />}
            className="flex-1"
            onKeyPress={e => e.key === 'Enter' && onSearch()}
          />
          <Button color="primary" onPress={onSearch} isLoading={isLoading} className="px-8">
            Search
          </Button>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Select
            size="sm"
            placeholder="Gender"
            selectedKeys={[filters.gender]}
            onSelectionChange={keys => updateFilter('gender', Array.from(keys)[0] as string)}
            className="w-32"
          >
            {genderOptions.map(option => (
              <SelectItem key={option.key}>{option.label}</SelectItem>
            ))}
          </Select>

          <Input
            size="sm"
            placeholder="Location (City/State)"
            value={filters.location}
            onChange={e => updateFilter('location', e.target.value)}
            className="w-48"
          />

          <Select
            size="sm"
            placeholder="Experience"
            selectedKeys={[filters.experienceLevel]}
            onSelectionChange={keys =>
              updateFilter('experienceLevel', Array.from(keys)[0] as string)
            }
            className="w-40"
          >
            {experienceLevels.map(level => (
              <SelectItem key={level.key}>{level.label}</SelectItem>
            ))}
          </Select>

          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
            <StarIcon className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-gray-600">Min Rating:</span>
            <Slider
              size="sm"
              step={0.5}
              maxValue={5}
              minValue={0}
              value={filters.minRating}
              onChange={value => updateFilter('minRating', value as number)}
              className="w-20"
            />
            <span className="text-sm font-medium w-8">{filters.minRating}</span>
          </div>
        </div>

        {/* Advanced Filters */}
        {isExpanded && (
          <Accordion variant="bordered" className="mt-4">
            <AccordionItem
              key="demographics"
              aria-label="Demographics"
              title="Demographics & Physical Attributes"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Age Range: {filters.ageRange[0]} - {filters.ageRange[1]} years
                  </label>
                  <Slider
                    step={1}
                    maxValue={80}
                    minValue={18}
                    value={filters.ageRange}
                    onChange={value => updateFilter('ageRange', value as [number, number])}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Height Range: {filters.physicalAttributes.height[0]} -{' '}
                    {filters.physicalAttributes.height[1]} cm
                  </label>
                  <Slider
                    step={1}
                    maxValue={220}
                    minValue={120}
                    value={filters.physicalAttributes.height}
                    onChange={value => updatePhysicalAttribute('height', value as [number, number])}
                  />
                </div>

                <Select
                  label="Eye Color"
                  selectedKeys={[filters.physicalAttributes.eyeColor]}
                  onSelectionChange={keys =>
                    updatePhysicalAttribute('eyeColor', Array.from(keys)[0] as string)
                  }
                >
                  {eyeColors.map(color => (
                    <SelectItem key={color}>{color}</SelectItem>
                  ))}
                </Select>

                <Select
                  label="Hair Color"
                  selectedKeys={[filters.physicalAttributes.hairColor]}
                  onSelectionChange={keys =>
                    updatePhysicalAttribute('hairColor', Array.from(keys)[0] as string)
                  }
                >
                  {hairColors.map(color => (
                    <SelectItem key={color}>{color}</SelectItem>
                  ))}
                </Select>

                <Select
                  label="Body Type"
                  selectedKeys={[filters.physicalAttributes.bodyType]}
                  onSelectionChange={keys =>
                    updatePhysicalAttribute('bodyType', Array.from(keys)[0] as string)
                  }
                >
                  {bodyTypes.map(type => (
                    <SelectItem key={type}>{type}</SelectItem>
                  ))}
                </Select>

                <Select
                  label="Ethnicity"
                  selectedKeys={[filters.physicalAttributes.ethnicity]}
                  onSelectionChange={keys =>
                    updatePhysicalAttribute('ethnicity', Array.from(keys)[0] as string)
                  }
                >
                  {ethnicities.map(ethnicity => (
                    <SelectItem key={ethnicity}>{ethnicity}</SelectItem>
                  ))}
                </Select>
              </div>
            </AccordionItem>

            <AccordionItem
              key="skills-languages"
              aria-label="Skills & Languages"
              title="Skills & Languages"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">Languages</label>
                  <CheckboxGroup
                    value={filters.languages}
                    onValueChange={value => updateFilter('languages', value)}
                    className="grid grid-cols-2 gap-2"
                  >
                    {commonLanguages.map(language => (
                      <Checkbox key={language} value={language}>
                        {language}
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">Skills</label>
                  <CheckboxGroup
                    value={filters.skills}
                    onValueChange={value => updateFilter('skills', value)}
                    className="grid grid-cols-2 gap-2"
                  >
                    {commonSkills.map(skill => (
                      <Checkbox key={skill} value={skill}>
                        {skill}
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                </div>
              </div>
            </AccordionItem>

            <AccordionItem
              key="availability-budget"
              aria-label="Availability & Budget"
              title="Availability & Budget"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                <Select
                  label="Availability"
                  selectedKeys={[filters.availability]}
                  onSelectionChange={keys =>
                    updateFilter('availability', Array.from(keys)[0] as string)
                  }
                >
                  {availabilityOptions.map(option => (
                    <SelectItem key={option.key}>{option.label}</SelectItem>
                  ))}
                </Select>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Budget Range: ₹{filters.budget[0].toLocaleString()} - ₹
                    {filters.budget[1].toLocaleString()}
                  </label>
                  <Slider
                    step={1000}
                    maxValue={1000000}
                    minValue={0}
                    value={filters.budget}
                    onChange={value => updateFilter('budget', value as [number, number])}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <Switch
                    isSelected={filters.verified}
                    onValueChange={value => updateFilter('verified', value)}
                  >
                    Verified Profiles Only
                  </Switch>
                </div>
              </div>
            </AccordionItem>

            <AccordionItem key="sorting" aria-label="Sorting Options" title="Sorting Options">
              <div className="flex gap-4 p-4">
                <Select
                  label="Sort By"
                  selectedKeys={[filters.sortBy]}
                  onSelectionChange={keys => updateFilter('sortBy', Array.from(keys)[0] as string)}
                  className="w-48"
                >
                  {sortOptions.map(option => (
                    <SelectItem key={option.key}>{option.label}</SelectItem>
                  ))}
                </Select>

                <Select
                  label="Order"
                  selectedKeys={[filters.sortOrder]}
                  onSelectionChange={keys =>
                    updateFilter('sortOrder', Array.from(keys)[0] as 'asc' | 'desc')
                  }
                  className="w-32"
                >
                  <SelectItem key="desc">Descending</SelectItem>
                  <SelectItem key="asc">Ascending</SelectItem>
                </Select>
              </div>
            </AccordionItem>
          </Accordion>
        )}
      </CardBody>
    </Card>
  );
}
