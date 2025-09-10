/**
 * Example Implementation: CastMatch Mobile Interaction Patterns
 * Demonstrates how to integrate all interaction systems in a real component
 */

import React, { useState, useEffect } from 'react';
import {
  SwipeableTalentCard,
  ZoomableImage,
  SwipeableMediaGallery,
  PullToRefreshContainer,
  LongPressContextMenu,
  HapticButton,
  SmartTooltip,
  FloatingHelpButton,
  HelpSuggestionPanel,
  useHapticFeedback,
  useKeyboardNavigation,
  useTouchGestures,
  useContextualHelp,
  useAccessibility,
  useInteractionSystems,
  interactionManager
} from './index';

// Example: Talent Discovery Page with Mobile Interactions
export const TalentDiscoveryPage: React.FC = () => {
  const [talents, setTalents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState<any>(null);

  // Initialize interaction systems
  const { manager, isInitialized, status } = useInteractionSystems();
  const { haptic } = useHapticFeedback();
  const { announce } = useAccessibility();
  const { helpSystem } = useContextualHelp();

  useEffect(() => {
    // Initialize with custom configuration
    if (!isInitialized) {
      manager.initialize({
        haptics: {
          enabled: true,
          intensity: 'medium',
          customPatterns: true
        },
        touch: {
          gestures: true,
          sensitivity: 'medium',
          preventScrolling: false
        },
        help: {
          contextual: true,
          smartSuggestions: true,
          onboarding: true
        }
      });
    }

    // Load initial data
    loadTalents();
  }, []);

  const loadTalents = async () => {
    setIsLoading(true);
    announce('Loading talents...');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockTalents = Array.from({ length: 10 }, (_, i) => ({
        id: `talent-${i + 1}`,
        name: `Talent ${i + 1}`,
        image: `/api/placeholder/400/600?id=${i + 1}`,
        role: i % 2 === 0 ? 'Actor' : 'Model',
        location: i % 3 === 0 ? 'Mumbai' : i % 3 === 1 ? 'Delhi' : 'Bangalore',
        experience: `${Math.floor(Math.random() * 10) + 1} years`,
        media: [
          {
            id: `media-${i}-1`,
            type: 'image' as const,
            src: `/api/placeholder/800/600?id=${i}-1`,
            thumbnail: `/api/placeholder/200/150?id=${i}-1`,
            caption: `Portfolio image ${i + 1}`
          },
          {
            id: `media-${i}-2`,
            type: 'video' as const,
            src: `/api/placeholder/800/600/mp4?id=${i}-2`,
            thumbnail: `/api/placeholder/200/150?id=${i}-2`,
            caption: `Acting reel ${i + 1}`
          }
        ]
      }));
      
      setTalents(mockTalents);
      announce(`${mockTalents.length} talents loaded`);
      haptic.searchComplete();
    } catch (error) {
      announce('Failed to load talents', 'assertive');
      haptic.error();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTalentShortlist = (id: string) => {
    console.log('Shortlisting talent:', id);
    announce('Talent added to shortlist');
    haptic.talentShortlisted();
    
    // Remove from current list
    setTalents(prev => prev.filter(t => t.id !== id));
    
    // Track help interaction
    helpSystem.trackHelpRequest('talent-shortlist-action');
  };

  const handleTalentPass = (id: string) => {
    console.log('Passing on talent:', id);
    announce('Talent passed');
    haptic.swipeAction();
    
    // Remove from current list
    setTalents(prev => prev.filter(t => t.id !== id));
  };

  const handleViewProfile = (id: string) => {
    const talent = talents.find(t => t.id === id);
    setSelectedTalent(talent);
    announce(`Viewing ${talent?.name} profile`);
    haptic.menuOpen();
  };

  const handleRefresh = async () => {
    await loadTalents();
  };

  const contextMenuItems = [
    {
      id: 'view-portfolio',
      label: 'View Portfolio',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      action: () => console.log('View portfolio')
    },
    {
      id: 'start-chat',
      label: 'Start Chat',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      action: () => console.log('Start chat')
    },
    {
      id: 'schedule-audition',
      label: 'Schedule Audition',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      action: () => console.log('Schedule audition')
    },
    {
      id: 'add-note',
      label: 'Add Note',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      action: () => console.log('Add note')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Smart Tooltips */}
      <header className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Discover Talent</h1>
          
          <div className="flex items-center space-x-4">
            <SmartTooltip
              content="Search for specific talent using filters and keywords"
              trigger="hover"
              position="bottom"
            >
              <HapticButton
                variant="secondary"
                hapticType="light"
                onClick={() => console.log('Open search')}
                className="p-2"
                data-keyboard-context="global-search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </HapticButton>
            </SmartTooltip>

            <SmartTooltip
              content="Apply filters to narrow down your search"
              trigger="hover"
              position="bottom"
            >
              <HapticButton
                variant="secondary"
                hapticType="light"
                onClick={() => console.log('Open filters')}
                className="p-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                </svg>
              </HapticButton>
            </SmartTooltip>
          </div>
        </div>
      </header>

      {/* Main Content with Pull-to-Refresh */}
      <PullToRefreshContainer
        onRefresh={handleRefresh}
        className="flex-1"
      >
        <main className="container mx-auto px-4 py-6" id="main-content">
          {/* System Status (Debug) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Interaction System Status:</h3>
              <div className="grid grid-cols-5 gap-2 text-xs">
                <div className={`p-2 rounded text-center ${status.haptics ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                  Haptics: {status.haptics ? '✓' : '✗'}
                </div>
                <div className={`p-2 rounded text-center ${status.keyboard ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                  Keyboard: {status.keyboard ? '✓' : '✗'}
                </div>
                <div className={`p-2 rounded text-center ${status.touch ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                  Touch: {status.touch ? '✓' : '✗'}
                </div>
                <div className={`p-2 rounded text-center ${status.help ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                  Help: {status.help ? '✓' : '✗'}
                </div>
                <div className={`p-2 rounded text-center ${status.accessibility ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                  A11y: {status.accessibility ? '✓' : '✗'}
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">Loading talents...</p>
            </div>
          )}

          {/* Talent Cards */}
          {!isLoading && talents.length > 0 && (
            <div className="space-y-6">
              {talents.map((talent, index) => (
                <LongPressContextMenu
                  key={talent.id}
                  items={contextMenuItems}
                  className="w-full"
                >
                  <SwipeableTalentCard
                    talent={talent}
                    onShortlist={handleTalentShortlist}
                    onPass={handleTalentPass}
                    onViewProfile={handleViewProfile}
                  />
                </LongPressContextMenu>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && talents.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No talents found</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your search criteria or refresh the page.</p>
              <div className="mt-6">
                <HapticButton
                  variant="primary"
                  hapticType="medium"
                  onClick={handleRefresh}
                >
                  Refresh
                </HapticButton>
              </div>
            </div>
          )}
        </main>
      </PullToRefreshContainer>

      {/* Profile Modal */}
      {selectedTalent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{selectedTalent.name}</h2>
                <button
                  onClick={() => setSelectedTalent(null)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                  aria-label="Close profile"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <ZoomableImage
                  src={selectedTalent.image}
                  alt={selectedTalent.name}
                  className="w-full h-64 rounded-lg"
                />
                
                <div>
                  <p className="text-gray-600">{selectedTalent.role}</p>
                  <p className="text-sm text-gray-500">{selectedTalent.location} • {selectedTalent.experience}</p>
                </div>
                
                {selectedTalent.media && (
                  <div>
                    <h3 className="font-medium mb-2">Portfolio</h3>
                    <SwipeableMediaGallery
                      media={selectedTalent.media}
                      onMediaChange={(index) => console.log('Media changed to:', index)}
                    />
                  </div>
                )}
                
                <div className="flex space-x-3 pt-4">
                  <HapticButton
                    variant="destructive"
                    hapticType="medium"
                    onClick={() => {
                      handleTalentPass(selectedTalent.id);
                      setSelectedTalent(null);
                    }}
                    className="flex-1"
                  >
                    Pass
                  </HapticButton>
                  
                  <HapticButton
                    variant="primary"
                    hapticType="medium"
                    onClick={() => {
                      handleTalentShortlist(selectedTalent.id);
                      setSelectedTalent(null);
                    }}
                    className="flex-1"
                  >
                    Shortlist
                  </HapticButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Help Button */}
      <FloatingHelpButton />
      
      {/* Help Suggestion Panel */}
      <HelpSuggestionPanel />
    </div>
  );
};

// Example: Settings Page for Interaction Preferences
export const InteractionSettingsPage: React.FC = () => {
  const { manager, updateConfig, config } = useInteractionSystems();
  const { haptic, preferences: hapticPrefs, updatePreferences: updateHapticPrefs } = useHapticFeedback();
  const { preferences: a11yPrefs, updatePreferences: updateA11yPrefs } = useAccessibility();

  const handleHapticTest = () => {
    haptic.testHaptic();
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Interaction Preferences</h1>
      
      <div className="space-y-6">
        {/* Haptic Feedback Settings */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-medium mb-4">Haptic Feedback</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Enable Haptic Feedback</label>
              <input
                type="checkbox"
                checked={hapticPrefs.enabled}
                onChange={(e) => updateHapticPrefs({ enabled: e.target.checked })}
                className="toggle"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-2">Intensity</label>
              <select
                value={hapticPrefs.intensity}
                onChange={(e) => updateHapticPrefs({ intensity: e.target.value as any })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="off">Off</option>
                <option value="light">Light</option>
                <option value="medium">Medium</option>
                <option value="heavy">Heavy</option>
              </select>
            </div>
            
            <HapticButton
              variant="secondary"
              hapticType="medium"
              onClick={handleHapticTest}
            >
              Test Haptic Feedback
            </HapticButton>
          </div>
        </div>

        {/* Accessibility Settings */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-medium mb-4">Accessibility</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">High Contrast Mode</label>
              <input
                type="checkbox"
                checked={a11yPrefs.highContrast}
                onChange={(e) => updateA11yPrefs({ highContrast: e.target.checked })}
                className="toggle"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Reduced Motion</label>
              <input
                type="checkbox"
                checked={a11yPrefs.reducedMotion}
                onChange={(e) => updateA11yPrefs({ reducedMotion: e.target.checked })}
                className="toggle"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Screen Reader Announcements</label>
              <input
                type="checkbox"
                checked={a11yPrefs.announcements}
                onChange={(e) => updateA11yPrefs({ announcements: e.target.checked })}
                className="toggle"
              />
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-medium mb-4">System Status</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-1">📱</div>
              <div className="text-sm font-medium">Touch Gestures</div>
              <div className="text-xs text-green-600">Active</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-1">⌨️</div>
              <div className="text-sm font-medium">Keyboard Shortcuts</div>
              <div className="text-xs text-green-600">Active</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-1">🔄</div>
              <div className="text-sm font-medium">Haptic Feedback</div>
              <div className="text-xs text-green-600">
                {hapticPrefs.enabled ? 'Active' : 'Disabled'}
              </div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-1">💡</div>
              <div className="text-sm font-medium">Contextual Help</div>
              <div className="text-xs text-green-600">Active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default {
  TalentDiscoveryPage,
  InteractionSettingsPage
};