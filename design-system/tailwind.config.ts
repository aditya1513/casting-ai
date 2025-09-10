import type { Config } from 'tailwindcss';
import colors from './tokens/primitive/colors.json';
import spacing from './tokens/primitive/spacing.json';
import typography from './tokens/primitive/typography.json';
import motion from './tokens/primitive/motion.json';
import themeDark from './tokens/semantic/theme-dark.json';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './design-system/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Map primitive colors
        gray: colors.colors.gray,
        blue: colors.colors.blue,
        cyan: colors.colors.cyan,
        purple: colors.colors.purple,
        
        // Map semantic colors for dark theme
        'bg-primary': themeDark.theme.dark.background.primary,
        'bg-secondary': themeDark.theme.dark.background.secondary,
        'bg-tertiary': themeDark.theme.dark.background.tertiary,
        'bg-elevated': themeDark.theme.dark.background.elevated,
        
        'surface-default': themeDark.theme.dark.surface.default,
        'surface-raised': themeDark.theme.dark.surface.raised,
        'surface-sunken': themeDark.theme.dark.surface.sunken,
        'surface-highlight': themeDark.theme.dark.surface.highlight,
        'surface-interactive': themeDark.theme.dark.surface.interactive,
        'surface-selected': themeDark.theme.dark.surface.selected,
        
        'text-primary': themeDark.theme.dark.text.primary,
        'text-secondary': themeDark.theme.dark.text.secondary,
        'text-tertiary': themeDark.theme.dark.text.tertiary,
        'text-disabled': themeDark.theme.dark.text.disabled,
        'text-inverse': themeDark.theme.dark.text.inverse,
        'text-accent': themeDark.theme.dark.text.accent,
        'text-brand': themeDark.theme.dark.text.brand,
        
        'border-default': themeDark.theme.dark.border.default,
        'border-subtle': themeDark.theme.dark.border.subtle,
        'border-strong': themeDark.theme.dark.border.strong,
        'border-focus': themeDark.theme.dark.border.focus,
        
        'accent-primary': themeDark.theme.dark.accent.primary,
        'accent-secondary': themeDark.theme.dark.accent.secondary,
        'accent-tertiary': themeDark.theme.dark.accent.tertiary
      },
      
      spacing: spacing.spacing.scale,
      
      fontFamily: typography.typography.fontFamily,
      fontSize: typography.typography.fontSize,
      fontWeight: typography.typography.fontWeight,
      lineHeight: typography.typography.lineHeight,
      letterSpacing: typography.typography.letterSpacing,
      
      animation: {
        'fade-in': 'fadeIn 250ms ease-out',
        'fade-out': 'fadeOut 250ms ease-out',
        'slide-in-up': 'slideInUp 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-in-down': 'slideInDown 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'scale-in': 'scaleIn 250ms ease-out',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin': 'spin 1s linear infinite',
        'shimmer': 'shimmer 2s linear infinite'
      },
      
      keyframes: motion.motion.keyframes,
      
      transitionDuration: motion.motion.duration,
      transitionTimingFunction: motion.motion.easing,
      
      boxShadow: {
        'elevation-0': themeDark.theme.dark.elevation['0'],
        'elevation-1': themeDark.theme.dark.elevation['1'],
        'elevation-2': themeDark.theme.dark.elevation['2'],
        'elevation-3': themeDark.theme.dark.elevation['3'],
        'elevation-4': themeDark.theme.dark.elevation['4'],
        'elevation-5': themeDark.theme.dark.elevation['5'],
        'glow': '0 0 40px rgba(6, 182, 212, 0.3)',
        'glow-primary': '0 0 40px rgba(59, 130, 246, 0.4)',
        'glow-secondary': '0 0 40px rgba(6, 182, 212, 0.4)'
      },
      
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-brand': `linear-gradient(135deg, ${themeDark.theme.dark.accent.gradient.start} 0%, ${themeDark.theme.dark.accent.gradient.end} 100%)`,
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)'
      },
      
      screens: {
        'xs': '475px',
        '3xl': '1920px',
        '4xl': '2560px'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio')
  ]
};

export default config;