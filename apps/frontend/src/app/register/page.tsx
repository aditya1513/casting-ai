'use client';

import React, { useState } from 'react';
import { Card, CardBody, Button, Input, Select, SelectItem, Divider, Checkbox } from '@heroui/react';
import { EyeSlashIcon, EyeIcon, FilmIcon, UserIcon, VideoCameraIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import Link from 'next/link';

const userRoles = [
  {
    key: 'casting_director',
    label: 'Casting Director',
    icon: UserIcon,
    description: 'Find and manage talent for productions',
  },
  {
    key: 'producer',
    label: 'Producer',
    icon: VideoCameraIcon,
    description: 'Oversee projects and coordinate casting',
  },
  {
    key: 'actor',
    label: 'Actor/Talent',
    icon: BuildingOfficeIcon,
    description: 'Create profile and find auditions',
  },
];

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    agreeToTerms: false,
  });
  
  const [isVisible, setIsVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleVisibility = () => setIsVisible(!isVisible);
  const toggleConfirmVisibility = () => setIsConfirmVisible(!isConfirmVisible);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.role) {
      newErrors.role = 'Please select your role';
    }
    
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      // Integrate with Auth0 or your authentication system
      // For now, redirect to login
      window.location.href = '/api/auth/login?screen_hint=signup&returnTo=' + encodeURIComponent(window.location.origin + '/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = '/api/auth/login?screen_hint=signup&returnTo=' + encodeURIComponent(window.location.origin + '/dashboard');
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
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
        className="w-full max-w-lg relative z-10"
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
              
              <h1 className="text-2xl font-bold text-white mb-2">
                Join CastMatch
              </h1>
              <p className="text-gray-400 text-sm">
                Create your account and start casting smarter
              </p>
            </div>

            {/* Social Signup */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mb-6"
            >
              <Button
                onClick={handleGoogleSignup}
                variant="bordered"
                className="w-full border-gray-600 text-gray-300 hover:bg-white/5"
                startContent={
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                }
              >
                Continue with Google
              </Button>
            </motion.div>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
              <Divider className="flex-1" />
              <span className="text-gray-500 text-sm">or</span>
              <Divider className="flex-1" />
            </div>

            {/* Registration Form */}
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  isInvalid={!!errors.firstName}
                  errorMessage={errors.firstName}
                  classNames={{
                    input: "text-white",
                    inputWrapper: "bg-gray-700/50 border-gray-600 data-[hover=true]:border-gray-500 group-data-[focus=true]:border-teal-500",
                    label: "text-gray-300",
                  }}
                />
                <Input
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  isInvalid={!!errors.lastName}
                  errorMessage={errors.lastName}
                  classNames={{
                    input: "text-white",
                    inputWrapper: "bg-gray-700/50 border-gray-600 data-[hover=true]:border-gray-500 group-data-[focus=true]:border-teal-500",
                    label: "text-gray-300",
                  }}
                />
              </div>

              {/* Email */}
              <Input
                type="email"
                label="Email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                isInvalid={!!errors.email}
                errorMessage={errors.email}
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-gray-700/50 border-gray-600 data-[hover=true]:border-gray-500 group-data-[focus=true]:border-teal-500",
                  label: "text-gray-300",
                }}
              />

              {/* Role Selection */}
              <Select
                label="I am a..."
                placeholder="Select your role"
                selectedKeys={formData.role ? [formData.role] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;
                  handleInputChange('role', selected);
                }}
                isInvalid={!!errors.role}
                errorMessage={errors.role}
                classNames={{
                  trigger: "bg-gray-700/50 border-gray-600 data-[hover=true]:border-gray-500 data-[focus=true]:border-teal-500",
                  value: "text-white",
                  label: "text-gray-300",
                }}
              >
                {userRoles.map((role) => (
                  <SelectItem
                    key={role.key}
                    value={role.key}
                    startContent={<role.icon className="w-4 h-4" />}
                    description={role.description}
                  >
                    {role.label}
                  </SelectItem>
                ))}
              </Select>

              {/* Password Fields */}
              <Input
                type={isVisible ? "text" : "password"}
                label="Password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                isInvalid={!!errors.password}
                errorMessage={errors.password}
                endContent={
                  <button type="button" onClick={toggleVisibility}>
                    {isVisible ? (
                      <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                    ) : (
                      <EyeIcon className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                }
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-gray-700/50 border-gray-600 data-[hover=true]:border-gray-500 group-data-[focus=true]:border-teal-500",
                  label: "text-gray-300",
                }}
              />

              <Input
                type={isConfirmVisible ? "text" : "password"}
                label="Confirm Password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                isInvalid={!!errors.confirmPassword}
                errorMessage={errors.confirmPassword}
                endContent={
                  <button type="button" onClick={toggleConfirmVisibility}>
                    {isConfirmVisible ? (
                      <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                    ) : (
                      <EyeIcon className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                }
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-gray-700/50 border-gray-600 data-[hover=true]:border-gray-500 group-data-[focus=true]:border-teal-500",
                  label: "text-gray-300",
                }}
              />

              {/* Terms Checkbox */}
              <div className="space-y-2">
                <Checkbox
                  isSelected={formData.agreeToTerms}
                  onValueChange={(checked) => handleInputChange('agreeToTerms', checked)}
                  classNames={{
                    wrapper: "before:border-gray-600",
                    label: "text-gray-300 text-sm",
                  }}
                >
                  <span className="text-gray-300 text-sm">
                    I agree to the{' '}
                    <Link href="/terms" className="text-teal-400 hover:text-teal-300">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-teal-400 hover:text-teal-300">
                      Privacy Policy
                    </Link>
                  </span>
                </Checkbox>
                {errors.agreeToTerms && (
                  <p className="text-red-400 text-xs">{errors.agreeToTerms}</p>
                )}
              </div>

              <Button
                type="submit"
                isLoading={isLoading}
                className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg shadow-teal-500/25"
                size="lg"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </motion.form>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="text-center mt-6"
            >
              <p className="text-gray-400 text-sm">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-teal-400 hover:text-teal-300 transition-colors font-medium"
                >
                  Sign in here
                </Link>
              </p>
            </motion.div>
          </CardBody>
        </Card>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-center mt-8"
        >
          <p className="text-gray-500 text-xs max-w-md mx-auto">
            Join thousands of casting professionals using CastMatch to streamline their workflow 
            and discover the perfect talent for every role.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}