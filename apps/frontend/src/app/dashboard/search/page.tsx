'use client';

import { useState } from 'react';
import { useUser, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import Sidebar from '../components/Sidebar';
import MobileMenu from '../components/Shared/MobileMenu';
import LiveRegion from '../components/Shared/LiveRegion';
import TalentSearch from '../components/TalentSearch';
import { TalentProfile } from '../components/TalentSearch/SearchResults';

export default function SearchPage() {
  const { user, isLoaded } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');

  // Handle talent contact
  const handleContactTalent = (talent: TalentProfile) => {
    setLiveMessage(`Contacting ${talent.firstName} ${talent.lastName}...`);
    // This could open a chat modal or redirect to messages
    console.log('Contact talent:', talent);
  };

  // Handle view talent profile
  const handleViewTalentProfile = (talent: TalentProfile) => {
    setLiveMessage(`Viewing profile for ${talent.firstName} ${talent.lastName}`);
    // This could open a detailed profile modal or navigate to profile page
    console.log('View talent profile:', talent);
  };

  // Handler for navigation
  const handleNewChat = () => {
    setLiveMessage('Starting new chat...');
    window.location.href = '/dashboard';
  };

  const handleProjectSelect = (projectId: string) => {
    setLiveMessage(`Selected project: ${projectId}`);
    console.log('Selected project:', projectId);
  };

  const handleChatSelect = (chatId: string) => {
    setLiveMessage(`Selected chat: ${chatId}`);
    console.log('Selected chat:', chatId);
  };

  const handleSettingsClick = () => {
    setLiveMessage('Opening settings...');
    console.log('Settings clicked');
  };

  const handleHelpClick = () => {
    setLiveMessage('Opening help...');
    console.log('Help clicked');
  };

  const handleUpgradeClick = () => {
    setLiveMessage('Opening upgrade options...');
    console.log('Upgrade clicked');
  };

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SignedIn>
        <div className="flex h-screen bg-gray-50 relative">
          {/* Live Region for Accessibility Announcements */}
          <LiveRegion message={liveMessage} priority="polite" />

          {/* Mobile Menu Toggle */}
          <MobileMenu isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

          {/* Enhanced Sidebar */}
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onNewChat={() => {
              handleNewChat();
              setSidebarOpen(false);
            }}
            onProjectSelect={projectId => {
              handleProjectSelect(projectId);
              setSidebarOpen(false);
            }}
            onChatSelect={chatId => {
              handleChatSelect(chatId);
              setSidebarOpen(false);
            }}
            onSettingsClick={handleSettingsClick}
            onHelpClick={handleHelpClick}
            onUpgradeClick={handleUpgradeClick}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Talent Search</h1>
                  <p className="text-sm text-gray-600">
                    Find the perfect talent for your casting projects
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    Signed in as {user?.firstName || user?.emailAddresses[0]?.emailAddress}
                  </span>
                </div>
              </div>
            </div>

            {/* Search Content */}
            <div className="flex-1 overflow-auto bg-gray-50 p-6">
              <TalentSearch
                onContactTalent={handleContactTalent}
                onViewTalentProfile={handleViewTalentProfile}
              />
            </div>
          </div>

          {/* Mobile Backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </div>
      </SignedIn>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
