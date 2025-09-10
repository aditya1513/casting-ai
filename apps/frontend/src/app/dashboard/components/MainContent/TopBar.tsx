"use client";

import { useState } from "react";
import { 
  Select, 
  SelectItem, 
  Badge, 
  Avatar,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from "@heroui/react";
import { 
  BellIcon, 
  Cog6ToothIcon,
  ChevronDownIcon
} from "@heroicons/react/24/outline";

interface TopBarProps {
  currentProject?: string;
  projects?: Array<{ id: string; name: string; }>;
  notificationCount?: number;
  user?: {
    name: string;
    avatar?: string;
  };
  onProjectChange: (projectId: string) => void;
  onNotificationsClick: () => void;
  onSettingsClick: () => void;
}

const defaultProjects = [
  { id: "mumbai-dreams", name: "Mumbai Dreams" },
  { id: "bollywood-series", name: "Bollywood Series" },
  { id: "commercial-ads", name: "Commercial Ads" }
];

const defaultUser = {
  name: "Aditya Sharma"
};

export default function TopBar({
  currentProject = "mumbai-dreams",
  projects = defaultProjects,
  notificationCount = 3,
  user = defaultUser,
  onProjectChange,
  onNotificationsClick,
  onSettingsClick
}: TopBarProps) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
      {/* Left Section - Project Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 font-medium">Project:</span>
          <Select
            selectedKeys={[currentProject]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0] as string;
              onProjectChange(key);
            }}
            size="sm"
            variant="bordered"
            className="min-w-48"
            aria-label="Select project"
            classNames={{
              trigger: "h-8 min-h-8 border-gray-300 hover:border-gray-400",
              value: "text-sm font-medium text-gray-900",
              popoverContent: "min-w-48"
            }}
            renderValue={(items) => {
              const project = projects.find(p => p.id === currentProject);
              return (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>{project?.name}</span>
                </div>
              );
            }}
          >
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id} textValue={project.name}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>{project.name}</span>
                </div>
              </SelectItem>
            ))}
          </Select>
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button
          onClick={onNotificationsClick}
          className="relative p-2 rounded-full hover:bg-gray-50 transition-colors duration-200"
          aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
        >
          <BellIcon className="h-5 w-5 text-gray-600" />
          {notificationCount > 0 && (
            <Badge
              content={notificationCount}
              size="sm"
              color="danger"
              className="absolute -top-1 -right-1"
            />
          )}
        </button>

        {/* Settings */}
        <button
          onClick={onSettingsClick}
          className="p-2 rounded-full hover:bg-gray-50 transition-colors duration-200"
          aria-label="Settings"
        >
          <Cog6ToothIcon className="h-5 w-5 text-gray-600" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
          <Avatar
            src={user.avatar}
            name={user.name}
            size="sm"
            classNames={{
              base: "bg-gradient-to-br from-teal-500 to-teal-600",
              name: "text-white font-medium text-xs"
            }}
          />
          <span className="text-sm font-medium text-gray-900 hidden sm:block">
            {user.name}
          </span>
        </div>
      </div>
    </header>
  );
}