'use client';

import { FolderIcon } from '@heroicons/react/24/outline';
import CollapsibleSection from './CollapsibleSection';

interface Project {
  id: string;
  name: string;
  subtitle: string;
  status: 'active' | 'paused' | 'completed';
  isActive?: boolean;
}

interface ProjectsListProps {
  projects: Project[];
  activeProjectId?: string;
  onProjectSelect: (projectId: string) => void;
}

const mockProjects: Project[] = [
  {
    id: 'mumbai-dreams',
    name: 'Mumbai Dreams',
    subtitle: 'Lead Character Casting',
    status: 'active',
    isActive: true,
  },
  {
    id: 'bollywood-series',
    name: 'Bollywood Series',
    subtitle: 'Supporting Cast',
    status: 'active',
  },
  {
    id: 'commercial-ads',
    name: 'Commercial Ads',
    subtitle: 'Brand Campaign',
    status: 'paused',
  },
];

export default function ProjectsList({
  projects = mockProjects,
  activeProjectId = 'mumbai-dreams',
  onProjectSelect,
}: ProjectsListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <CollapsibleSection
      title="Projects"
      icon={<FolderIcon className="h-4 w-4" />}
      defaultExpanded={true}
    >
      <div className="space-y-1">
        {projects.map(project => (
          <button
            key={project.id}
            onClick={() => onProjectSelect(project.id)}
            className={`w-full px-4 py-3 rounded-full text-left hover:bg-gray-50 transition-all duration-200 group ${
              activeProjectId === project.id
                ? 'bg-teal-50 border-l-4 border-teal-600'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`} />
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium text-sm truncate ${
                    activeProjectId === project.id ? 'text-teal-900' : 'text-gray-900'
                  }`}
                >
                  {project.name}
                </p>
                <p
                  className={`text-xs truncate ${
                    activeProjectId === project.id ? 'text-teal-600' : 'text-gray-500'
                  }`}
                >
                  {project.subtitle}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </CollapsibleSection>
  );
}
