'use client';

import { useState, useEffect, useRef } from 'react';
import FocusTrap from 'focus-trap-react';
import BrandHeader from './BrandHeader';
import SearchBar from './SearchBar';
import NewChatButton from './NewChatButton';
import Navigation from './Navigation';
import ProjectsList from './ProjectsList';
import RecentChats from './RecentChats';
import UserProfile from './UserProfile';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onNewChat: () => void;
  onProjectSelect: (projectId: string) => void;
  onChatSelect: (chatId: string) => void;
  onSettingsClick?: () => void;
  onHelpClick?: () => void;
  onUpgradeClick?: () => void;
}

export default function Sidebar({
  isOpen = true,
  onClose,
  onNewChat,
  onProjectSelect,
  onChatSelect,
  onSettingsClick,
  onHelpClick,
  onUpgradeClick,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const sidebarRef = useRef<HTMLElement>(null);

  // Handle keyboard navigation for mobile
  useEffect(() => {
    if (isOpen && onClose) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const sidebarContent = (
    <aside
      ref={sidebarRef}
      className={`w-80 bg-white border-r border-gray-200 flex flex-col h-full transition-transform duration-300 ease-in-out md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:relative fixed z-40`}
      role="navigation"
      aria-label="Main navigation sidebar"
    >
      {/* Close button for mobile */}
      {onClose && (
        <button
          onClick={onClose}
          className="md:hidden absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 z-50"
          aria-label="Close sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      {/* Brand Header */}
      <BrandHeader />

      {/* Search Bar */}
      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      {/* Navigation */}
      <Navigation />

      {/* New Chat Button */}
      <NewChatButton onClick={onNewChat} />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2">
          {/* Projects List */}
          <ProjectsList onProjectSelect={onProjectSelect} />

          {/* Recent Chats */}
          <RecentChats onChatSelect={onChatSelect} />
        </div>
      </div>

      {/* User Profile */}
      <UserProfile
        onSettingsClick={onSettingsClick}
        onHelpClick={onHelpClick}
        onUpgradeClick={onUpgradeClick}
      />
    </aside>
  );

  // Use FocusTrap only on mobile when sidebar is open
  if (onClose && isOpen) {
    return (
      <FocusTrap
        focusTrapOptions={{
          allowOutsideClick: true,
          escapeDeactivates: false, // We handle escape ourselves
          returnFocusOnDeactivate: true,
        }}
      >
        {sidebarContent}
      </FocusTrap>
    );
  }

  return sidebarContent;
}
