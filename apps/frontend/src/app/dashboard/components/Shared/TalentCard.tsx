"use client";

import { Card, CardBody, Button, Avatar, Chip } from "@heroui/react";
import { 
  EyeIcon,
  CalendarIcon,
  StarIcon,
  MapPinIcon
} from "@heroicons/react/24/outline";

interface TalentCardProps {
  talent: {
    id: string | number;
    name: string;
    experience: string;
    age?: number;
    location?: string;
    rating?: number;
    match?: number;
    image?: string;
    photo?: string;
    specialties?: string[];
    availability?: string;
    rate?: string;
    languages?: string[];
    training?: string;
    recentWork?: string;
    strengths?: string[];
    socialMedia?: string;
  };
  onViewPortfolio: (talentId: string) => void;
  onBookAudition: (talentId: string) => void;
}

export default function TalentCard({ talent, onViewPortfolio, onBookAudition }: TalentCardProps) {
  return (
    <Card className="w-full max-w-sm shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-gray-100 bg-white overflow-hidden">
      <CardBody className="p-0">
        {/* Image Section */}
        <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg overflow-hidden">
          {(talent.image || talent.photo) ? (
            <img 
              src={talent.image || talent.photo} 
              alt={talent.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Avatar
                name={talent.name}
                size="lg"
                classNames={{
                  base: "w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600",
                  name: "text-white font-semibold text-xl"
                }}
              />
            </div>
          )}
          
          {/* Match Score Badge */}
          {talent.match && (
            <div className="absolute top-2 right-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full px-2.5 py-1 flex items-center gap-1 shadow-lg backdrop-blur-sm">
              <StarIcon className="h-3.5 w-3.5 fill-current" />
              <span className="text-xs font-bold tracking-wide">{talent.match}%</span>
            </div>
          )}
          
          {/* Age Badge */}
          {talent.age && (
            <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm border border-white/50">
              <span className="text-xs font-semibold text-gray-800">{talent.age}y</span>
            </div>
          )}
        </div>
        
        {/* Content Section */}
        <div className="p-4 space-y-3">
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 text-lg leading-tight">
              {talent.name}
            </h3>
            <p className="text-sm text-gray-600 font-medium">
              {talent.experience}
            </p>
            
            {/* Rate */}
            {talent.rate && (
              <p className="text-sm font-semibold text-green-700">
                {talent.rate}
              </p>
            )}
            
            {/* Location */}
            {talent.location && (
              <div className="flex items-center gap-1 text-gray-500">
                <MapPinIcon className="h-3 w-3" />
                <span className="text-xs">{talent.location}</span>
              </div>
            )}
          </div>
          
          {/* Additional Info Section */}
          <div className="space-y-2">
            {/* Recent Work */}
            {talent.recentWork && (
              <p className="text-xs text-gray-600 italic">
                Recent: {talent.recentWork}
              </p>
            )}
            
            {/* Languages */}
            {talent.languages && talent.languages.length > 0 && (
              <div>
                <span className="text-xs text-gray-500">Languages: </span>
                <span className="text-xs text-gray-700 font-medium">
                  {talent.languages.slice(0, 3).join(', ')}
                  {talent.languages.length > 3 && ` +${talent.languages.length - 3}`}
                </span>
              </div>
            )}
          </div>
          
          {/* Specialties */}
          {talent.specialties && talent.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {talent.specialties.slice(0, 2).map((specialty, index) => (
                <Chip 
                  key={index}
                  size="sm" 
                  variant="flat"
                  classNames={{
                    base: "bg-teal-50 border border-teal-200",
                    content: "text-teal-700 font-medium text-xs"
                  }}
                >
                  {specialty}
                </Chip>
              ))}
              {talent.specialties.length > 2 && (
                <Chip 
                  size="sm" 
                  variant="flat"
                  classNames={{
                    base: "bg-gray-50 border border-gray-200",
                    content: "text-gray-600 text-xs"
                  }}
                >
                  +{talent.specialties.length - 2}
                </Chip>
              )}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="bordered"
              startContent={<EyeIcon className="h-3.5 w-3.5" />}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
              onClick={() => onViewPortfolio(talent.id.toString())}
            >
              Portfolio
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800 shadow-md hover:shadow-lg transition-all duration-200 font-medium"
              startContent={<CalendarIcon className="h-3.5 w-3.5" />}
              onClick={() => onBookAudition(talent.id.toString())}
            >
              Audition
            </Button>
          </div>
          
          {/* Availability */}
          {talent.availability && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Available: {talent.availability}
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}