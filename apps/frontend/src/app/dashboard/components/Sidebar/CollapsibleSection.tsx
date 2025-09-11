'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export default function CollapsibleSection({
  title,
  icon,
  children,
  defaultExpanded = true,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 rounded-full transition-colors duration-200 group"
      >
        <div className="flex items-center gap-3">
          {icon && <div className="text-gray-400 group-hover:text-gray-600">{icon}</div>}
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {title}
          </span>
        </div>
        <div className="text-gray-400 group-hover:text-gray-600 transition-all duration-200">
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
