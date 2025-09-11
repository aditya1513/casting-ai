'use client';

import React, { useState } from 'react';
import { Card, CardBody, Button, Input } from '@heroui/react';
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  FilmIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Simulate API call for password reset
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsSubmitted(true);
    } catch (error) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsLoading(true);
    try {
      // Simulate resend API call
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Resend error:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
            {!isSubmitted ? (
              <>
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

                  <h1 className="text-2xl font-bold text-white mb-2">Forgot Password?</h1>
                  <p className="text-gray-400 text-sm">
                    No worries! Enter your email and we'll send you a reset link.
                  </p>
                </div>

                {/* Reset Form */}
                <motion.form
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  <Input
                    type="email"
                    label="Email Address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    isInvalid={!!error}
                    errorMessage={error}
                    startContent={<EnvelopeIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    classNames={{
                      input: 'text-white',
                      inputWrapper:
                        'bg-gray-700/50 border-gray-600 data-[hover=true]:border-gray-500 group-data-[focus=true]:border-teal-500',
                      label: 'text-gray-300',
                    }}
                  />

                  <Button
                    type="submit"
                    isLoading={isLoading}
                    className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg shadow-teal-500/25"
                    size="lg"
                  >
                    {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
                  </Button>
                </motion.form>

                {/* Back to Login */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="mt-6"
                >
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back to Sign In
                  </Link>
                </motion.div>
              </>
            ) : (
              <>
                {/* Success State */}
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="flex items-center justify-center mb-6"
                  >
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                      <CheckCircleIcon className="w-8 h-8 text-white" />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    <h1 className="text-2xl font-bold text-white mb-2">Check Your Email</h1>
                    <p className="text-gray-400 text-sm mb-6">
                      We've sent a password reset link to
                    </p>
                    <p className="text-white font-medium mb-8">{email}</p>
                  </motion.div>

                  {/* Instructions */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="space-y-4 mb-8"
                  >
                    <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                      <h3 className="text-white font-medium mb-2 text-sm">What's next?</h3>
                      <ul className="text-gray-400 text-xs space-y-1 text-left">
                        <li>• Check your email inbox</li>
                        <li>• Click the reset link in the email</li>
                        <li>• Create a new password</li>
                        <li>• Sign in with your new password</li>
                      </ul>
                    </div>
                  </motion.div>

                  {/* Actions */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="space-y-4"
                  >
                    <Button
                      onClick={handleResendEmail}
                      isLoading={isLoading}
                      variant="bordered"
                      className="w-full border-gray-600 text-gray-300 hover:bg-white/5"
                    >
                      {isLoading ? 'Resending...' : 'Resend Email'}
                    </Button>

                    <Link
                      href="/login"
                      className="block text-center text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      Back to Sign In
                    </Link>
                  </motion.div>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        {/* Additional Help */}
        {!isSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-center mt-8"
          >
            <p className="text-gray-500 text-xs">
              Need help? Contact our{' '}
              <Link href="/support" className="text-teal-400 hover:text-teal-300">
                support team
              </Link>
            </p>
          </motion.div>
        )}

        {isSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="text-center mt-8"
          >
            <p className="text-gray-500 text-xs">
              Didn't receive an email? Check your spam folder or{' '}
              <Link href="/support" className="text-teal-400 hover:text-teal-300">
                contact support
              </Link>
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
