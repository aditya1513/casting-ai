'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { HeroUIProvider } from '@heroui/react';
import { TRPCProvider } from './trpc';
import { Toaster } from 'sonner';

const castMatchTheme = {
  extend: 'light',
  colors: {
    // Primary brand colors
    primary: {
      50: '#F0FDFA',
      100: '#CCFBF1',
      200: '#99F6E4',
      300: '#5EEAD4',
      400: '#2DD4BF',
      500: '#008B8B', // Our main teal
      600: '#0D9488',
      700: '#0F766E',
      800: '#115E59',
      900: '#134E4A',
      DEFAULT: '#008B8B',
      foreground: '#ffffff',
    },
    // Accent colors for CTAs
    secondary: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#FF6B5A', // Our coral red
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D',
      DEFAULT: '#FF6B5A',
      foreground: '#ffffff',
    },
    // Success colors
    success: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      300: '#86EFAC',
      400: '#4ADE80', // Our lime green
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
      800: '#166534',
      900: '#14532D',
      DEFAULT: '#4ADE80',
      foreground: '#ffffff',
    },
    // Warning colors
    warning: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B', // Our amber
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
      DEFAULT: '#F59E0B',
      foreground: '#ffffff',
    },
    // Danger/Error colors
    danger: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444', // Our red
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D',
      DEFAULT: '#EF4444',
      foreground: '#ffffff',
    },
    // Background colors
    background: '#F8F9FA', // Our light gray background
    foreground: '#0F172A', // Our dark text
    content1: '#ffffff', // Card backgrounds
    content2: '#F8F9FA', // Subtle backgrounds
    content3: '#E5E7EB', // Borders
    content4: '#D1D5DB', // Dividers
    // Focus colors
    focus: '#008B8B', // Our primary teal
    // Default gray scale
    default: {
      50: '#F8F9FA',
      100: '#E5E7EB',
      200: '#D1D5DB',
      300: '#9CA3AF',
      400: '#6B7280',
      500: '#4B5563',
      600: '#374151',
      700: '#1F2937',
      800: '#111827',
      900: '#0F172A',
      DEFAULT: '#4B5563',
      foreground: '#ffffff',
    },
  },
  layout: {
    fontSize: {
      tiny: '0.75rem', // 12px
      small: '0.875rem', // 14px
      medium: '1rem', // 16px
      large: '1.125rem', // 18px
    },
    lineHeight: {
      tiny: '1rem',
      small: '1.25rem',
      medium: '1.5rem',
      large: '1.75rem',
    },
    radius: {
      small: '0.5rem', // 8px
      medium: '0.75rem', // 12px
      large: '1rem', // 16px
    },
    borderWidth: {
      small: '1px',
      medium: '2px',
      large: '3px',
    },
  },
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <TRPCProvider>
        <HeroUIProvider theme={castMatchTheme}>
          {children}
          <Toaster position="top-right" richColors />
        </HeroUIProvider>
      </TRPCProvider>
    </ClerkProvider>
  );
}
