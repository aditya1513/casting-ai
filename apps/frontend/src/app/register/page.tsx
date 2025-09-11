'use client';

import React from 'react';
import { Card, CardBody } from '@heroui/react';
import { FilmIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-teal-900 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 backdrop-blur-sm">
          <CardBody className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="flex items-center justify-center gap-3 mb-6"
              >
                <div className="relative">
                  <FilmIcon className="h-10 w-10 text-teal-500" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full animate-pulse" />
                </div>
                <span className="font-bold text-2xl text-white">CastMatch</span>
              </motion.div>

              <h1 className="text-2xl font-bold text-white mb-2">Join CastMatch</h1>
              <p className="text-gray-400 text-sm">Create your account and start casting smarter</p>
            </div>

            {/* Clerk SignUp Component */}
            <div className="flex justify-center">
              <SignUp
                appearance={{
                  baseTheme: undefined,
                  variables: {
                    colorPrimary: '#008B8B',
                    colorBackground: 'transparent',
                    colorInputBackground: 'rgba(55, 65, 81, 0.5)',
                    colorInputText: '#ffffff',
                    colorText: '#ffffff',
                    colorTextSecondary: '#9CA3AF',
                  },
                  elements: {
                    card: 'bg-transparent border-none shadow-none',
                    headerTitle: 'text-white',
                    headerSubtitle: 'text-gray-400',
                    socialButtonsBlockButton: 'border-gray-600 text-gray-300 hover:bg-white/5',
                    formButtonPrimary:
                      'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700',
                    footerActionLink: 'text-teal-400 hover:text-teal-300',
                  },
                }}
                redirectUrl="/dashboard"
                signInUrl="/login"
              />
            </div>
          </CardBody>
        </Card>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-center mt-8"
        >
          <p className="text-gray-500 text-xs">
            By signing up, you agree to our{' '}
            <Link href="/terms" className="text-teal-400 hover:text-teal-300">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-teal-400 hover:text-teal-300">
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
