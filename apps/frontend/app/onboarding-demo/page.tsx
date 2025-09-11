'use client';

import React, { useState } from 'react';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { TourAnalyticsDashboard } from '@/components/onboarding/TourAnalyticsDashboard';
import { UserRole } from '@/lib/onboarding/tour-config';
import { motion } from 'framer-motion';
import { PlayCircle, RotateCcw, BarChart, Users, Sparkles, Settings } from 'lucide-react';

export default function OnboardingDemoPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('talent');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [userId] = useState('demo-user-123');

  // Use the onboarding hook
  const {
    currentTour,
    isActive,
    currentStepIndex,
    startTour,
    pauseTour,
    resumeTour,
    skipTour,
    restartTour,
    analytics,
    shouldShowTour,
    hasCompletedTour,
  } = useOnboardingTour({
    userId,
    userRole: selectedRole,
    autoStart: false,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Demo Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-cyan-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  CastMatch Onboarding Demo
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Interactive tour system with role-specific experiences
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <BarChart className="w-4 h-4" />
              {showAnalytics ? 'Hide' : 'Show'} Analytics
            </button>
          </div>
        </div>
      </div>

      {showAnalytics ? (
        <TourAnalyticsDashboard />
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Role Selector */}
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select User Role
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['talent', 'casting_director', 'producer', 'agent'] as UserRole[]).map(role => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${
                      selectedRole === role
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <Users className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {role.replace('_', ' ')}
                  </p>
                  {hasCompletedTour(`${role}-onboarding-v1`) && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Completed</p>
                  )}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Tour Controls */}
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Tour Controls
            </h2>

            <div className="flex flex-wrap gap-4 mb-6">
              {!isActive ? (
                <button
                  onClick={startTour}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium flex items-center gap-2 hover:shadow-lg transition-shadow"
                  disabled={!currentTour}
                >
                  <PlayCircle className="w-5 h-5" />
                  Start Tour
                </button>
              ) : (
                <>
                  <button
                    onClick={pauseTour}
                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Pause Tour
                  </button>

                  <button
                    onClick={skipTour}
                    className="px-6 py-3 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
                  >
                    Skip Tour
                  </button>
                </>
              )}

              {!isActive && currentTour && (
                <>
                  <button
                    onClick={resumeTour}
                    className="px-6 py-3 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg font-medium hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
                  >
                    Resume Tour
                  </button>

                  <button
                    onClick={restartTour}
                    className="px-6 py-3 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg font-medium flex items-center gap-2 hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restart Tour
                  </button>
                </>
              )}
            </div>

            {/* Tour Status */}
            {currentTour && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Tour Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">{currentTour.name}</p>
                  </div>

                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Progress</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Step {currentStepIndex + 1} / {currentTour.steps.length}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Completion</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {analytics.completionPercentage}%
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Time Spent</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {Math.floor(analytics.totalTimeSpent / 60)}:
                      {(analytics.totalTimeSpent % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Demo Application UI */}
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Demo Application Interface
            </h2>

            <div className="space-y-4">
              {/* Mock navigation with tour targets */}
              <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <button
                  data-tour="profile-button"
                  className="px-4 py-2 bg-white dark:bg-gray-700 rounded-lg shadow"
                >
                  Profile
                </button>
                <button
                  data-tour="search-auditions"
                  className="px-4 py-2 bg-white dark:bg-gray-700 rounded-lg shadow"
                >
                  Search
                </button>
                <button
                  data-tour="ai-chat"
                  className="px-4 py-2 bg-white dark:bg-gray-700 rounded-lg shadow"
                >
                  AI Assistant
                </button>
                <button
                  data-tour="calendar"
                  className="px-4 py-2 bg-white dark:bg-gray-700 rounded-lg shadow"
                >
                  Calendar
                </button>
                <button
                  data-tour="notifications"
                  className="px-4 py-2 bg-white dark:bg-gray-700 rounded-lg shadow"
                >
                  Notifications
                </button>
              </div>

              {/* Mock content areas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  data-tour="self-tape-studio"
                  className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <h3 className="font-medium mb-2">Self-Tape Studio</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Record and submit auditions
                  </p>
                </div>

                <div
                  data-tour="ai-matching"
                  className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <h3 className="font-medium mb-2">AI Matching</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Find perfect talent matches
                  </p>
                </div>

                <div
                  data-tour="talent-pool"
                  className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <h3 className="font-medium mb-2">Talent Database</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Browse verified talent</p>
                </div>

                <div
                  data-tour="analytics"
                  className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <h3 className="font-medium mb-2">Analytics</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Track performance metrics
                  </p>
                </div>
              </div>

              {/* Additional mock elements for different roles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  data-tour="create-project"
                  className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center"
                >
                  <Settings className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Create Project</p>
                </div>

                <div
                  data-tour="submissions"
                  className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center"
                >
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Submissions</p>
                </div>

                <div
                  data-tour="team-collaboration"
                  className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center"
                >
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Team Collab</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Onboarding Tour Component */}
      <OnboardingTour
        userId={userId}
        userRole={selectedRole}
        autoStart={false}
        showWelcomeModal={true}
        onComplete={() => {
          console.log('Tour completed!');
        }}
      />
    </div>
  );
}
