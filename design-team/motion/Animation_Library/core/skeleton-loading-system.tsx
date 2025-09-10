/**
 * Optimized Loading Skeleton Animation System
 * Adaptive skeleton screens with performance optimization and accessibility
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { gpuAcceleration } from './gpu-acceleration-config';
import { motionAccessibility, useMotionAccessibility } from './accessibility-motion';

export interface SkeletonConfig {
  variant: 'wave' | 'pulse' | 'shimmer' | 'gradient' | 'dots' | 'static';
  speed: 'slow' | 'normal' | 'fast';
  intensity: 'subtle' | 'normal' | 'pronounced';
  color: {
    base: string;
    highlight: string;
    gradient?: string[];
  };
  adaptToConnection: boolean;
  respectMotionPrefs: boolean;
}

interface SkeletonDimensions {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  aspectRatio?: number;
}

interface SkeletonItemProps extends SkeletonDimensions {
  variant?: SkeletonConfig['variant'];
  speed?: SkeletonConfig['speed'];
  className?: string;
  animate?: boolean;
  children?: React.ReactNode;
}

// Connection speed detection
class ConnectionSpeedDetector {
  private static instance: ConnectionSpeedDetector;
  private connectionType: 'slow' | 'normal' | 'fast' = 'normal';
  private effectiveType: string = '';

  constructor() {
    this.detectConnectionSpeed();
  }

  static getInstance(): ConnectionSpeedDetector {
    if (!ConnectionSpeedDetector.instance) {
      ConnectionSpeedDetector.instance = new ConnectionSpeedDetector();
    }
    return ConnectionSpeedDetector.instance;
  }

  private detectConnectionSpeed(): void {
    // @ts-ignore - Navigator connection API
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      this.effectiveType = connection.effectiveType || '';
      
      switch (connection.effectiveType) {
        case 'slow-2g':
        case '2g':
          this.connectionType = 'slow';
          break;
        case '3g':
          this.connectionType = 'normal';
          break;
        case '4g':
        case '5g':
          this.connectionType = 'fast';
          break;
        default:
          this.connectionType = 'normal';
      }

      // Listen for connection changes
      connection.addEventListener('change', () => {
        this.detectConnectionSpeed();
      });
    }
  }

  getConnectionType(): 'slow' | 'normal' | 'fast' {
    return this.connectionType;
  }

  getEffectiveType(): string {
    return this.effectiveType;
  }
}

// Skeleton configuration manager
class SkeletonConfigManager {
  private static instance: SkeletonConfigManager;
  private defaultConfig: SkeletonConfig;
  private connectionDetector: ConnectionSpeedDetector;

  constructor() {
    this.connectionDetector = ConnectionSpeedDetector.getInstance();
    this.defaultConfig = this.createOptimalConfig();
  }

  static getInstance(): SkeletonConfigManager {
    if (!SkeletonConfigManager.instance) {
      SkeletonConfigManager.instance = new SkeletonConfigManager();
    }
    return SkeletonConfigManager.instance;
  }

  private createOptimalConfig(): SkeletonConfig {
    const motionPrefs = motionAccessibility.getPreferences();
    const connectionType = this.connectionDetector.getConnectionType();
    const gpuCapabilities = gpuAcceleration.getCapabilities();

    // Base configuration
    let config: SkeletonConfig = {
      variant: 'shimmer',
      speed: 'normal',
      intensity: 'normal',
      color: {
        base: '#f0f0f0',
        highlight: '#e0e0e0',
        gradient: ['#f0f0f0', '#e0e0e0', '#f0f0f0']
      },
      adaptToConnection: true,
      respectMotionPrefs: true
    };

    // Adjust for motion preferences
    if (motionPrefs.reducedMotion) {
      config.variant = 'static';
      config.speed = 'slow';
      config.intensity = 'subtle';
    }

    // Adjust for connection speed
    if (connectionType === 'slow') {
      config.variant = 'pulse';
      config.speed = 'slow';
      config.intensity = 'subtle';
    } else if (connectionType === 'fast' && !motionPrefs.reducedMotion) {
      config.variant = 'shimmer';
      config.speed = 'fast';
      config.intensity = 'pronounced';
    }

    // Adjust for GPU capabilities
    if (!gpuCapabilities?.hasHardwareAcceleration) {
      config.variant = config.variant === 'shimmer' ? 'pulse' : config.variant;
      config.intensity = 'subtle';
    }

    return config;
  }

  getOptimalConfig(): SkeletonConfig {
    return { ...this.defaultConfig };
  }

  updateConfig(updates: Partial<SkeletonConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...updates };
  }
}

// Animation generators
const SkeletonAnimations = {
  wave: (duration: number, intensity: string) => ({
    keyframes: [
      { transform: 'translateX(-100%)', opacity: intensity === 'subtle' ? 0.6 : 0.4 },
      { transform: 'translateX(100%)', opacity: intensity === 'subtle' ? 0.8 : 1 }
    ],
    options: { duration, easing: 'ease-in-out', iterationCount: Infinity }
  }),

  pulse: (duration: number, intensity: string) => ({
    keyframes: [
      { opacity: intensity === 'subtle' ? 0.8 : 0.6 },
      { opacity: intensity === 'subtle' ? 0.9 : 1 },
      { opacity: intensity === 'subtle' ? 0.8 : 0.6 }
    ],
    options: { duration, easing: 'ease-in-out', iterationCount: Infinity }
  }),

  shimmer: (duration: number, intensity: string) => {
    const opacityRange = intensity === 'subtle' ? [0.8, 0.9] : [0.4, 1];
    return {
      keyframes: [
        { 
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          backgroundPosition: '-200% 0'
        },
        { 
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          backgroundPosition: '200% 0'
        }
      ],
      options: { duration, easing: 'ease-in-out', iterationCount: Infinity }
    };
  },

  gradient: (duration: number, colors: string[]) => ({
    keyframes: colors.map((color, index) => ({
      backgroundColor: color,
      offset: index / (colors.length - 1)
    })),
    options: { duration, easing: 'ease-in-out', iterationCount: Infinity }
  }),

  dots: (duration: number) => ({
    keyframes: [
      { transform: 'scale(1)', opacity: 0.8 },
      { transform: 'scale(1.1)', opacity: 1 },
      { transform: 'scale(1)', opacity: 0.8 }
    ],
    options: { duration, easing: 'ease-in-out', iterationCount: Infinity }
  })
};

// Main skeleton item component
export const SkeletonItem: React.FC<SkeletonItemProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = '4px',
  aspectRatio,
  variant,
  speed = 'normal',
  className = '',
  animate = true,
  children
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const { preferences } = useMotionAccessibility();
  const configManager = useMemo(() => SkeletonConfigManager.getInstance(), []);
  const [isVisible, setIsVisible] = useState(false);

  // Get optimal configuration
  const config = useMemo(() => {
    const optimal = configManager.getOptimalConfig();
    return {
      ...optimal,
      variant: variant || optimal.variant,
      speed
    };
  }, [variant, speed, configManager]);

  // Intersection observer for performance
  useEffect(() => {
    if (!elementRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(elementRef.current);

    return () => observer.disconnect();
  }, []);

  // Apply animation
  useEffect(() => {
    if (!elementRef.current || !isVisible || !animate) return;
    if (config.variant === 'static' || preferences.reducedMotion) return;

    const element = elementRef.current;
    const speedMultiplier = config.speed === 'slow' ? 2 : config.speed === 'fast' ? 0.5 : 1;
    const baseDuration = 1500 * speedMultiplier;

    // Optimize element for animation
    gpuAcceleration.optimizeElementForAnimation(element, 'transform', 'low');

    let animation: Animation | null = null;

    switch (config.variant) {
      case 'wave':
        const waveAnim = SkeletonAnimations.wave(baseDuration, config.intensity);
        animation = element.animate(waveAnim.keyframes, waveAnim.options);
        break;

      case 'pulse':
        const pulseAnim = SkeletonAnimations.pulse(baseDuration, config.intensity);
        animation = element.animate(pulseAnim.keyframes, pulseAnim.options);
        break;

      case 'shimmer':
        // Apply shimmer using pseudo-element for better performance
        element.classList.add('skeleton-shimmer');
        break;

      case 'gradient':
        if (config.color.gradient) {
          const gradientAnim = SkeletonAnimations.gradient(baseDuration, config.color.gradient);
          animation = element.animate(gradientAnim.keyframes, gradientAnim.options);
        }
        break;

      case 'dots':
        const dotsAnim = SkeletonAnimations.dots(baseDuration);
        animation = element.animate(dotsAnim.keyframes, dotsAnim.options);
        break;
    }

    return () => {
      if (animation) {
        animation.cancel();
      }
      if (element) {
        gpuAcceleration.cleanupElementOptimization(element);
        element.classList.remove('skeleton-shimmer');
      }
    };
  }, [isVisible, animate, config, preferences.reducedMotion]);

  // Dynamic styles
  const dynamicStyles = useMemo(() => {
    const styles: React.CSSProperties = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: aspectRatio ? 'auto' : (typeof height === 'number' ? `${height}px` : height),
      borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
      backgroundColor: config.color.base,
      aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
      position: 'relative',
      overflow: 'hidden',
      display: 'block'
    };

    // Static styles for reduced motion
    if (config.variant === 'static' || preferences.reducedMotion) {
      styles.backgroundColor = config.color.highlight;
    }

    return styles;
  }, [width, height, borderRadius, aspectRatio, config, preferences.reducedMotion]);

  return (
    <div
      ref={elementRef}
      className={`skeleton-item ${className}`}
      style={dynamicStyles}
      role="progressbar"
      aria-label="Loading content"
      aria-busy="true"
    >
      {children}
    </div>
  );
};

// Pre-built skeleton components for common use cases
export const SkeletonText: React.FC<{
  lines?: number;
  lastLineWidth?: string;
  lineHeight?: string;
  spacing?: string;
  className?: string;
}> = ({
  lines = 1,
  lastLineWidth = '60%',
  lineHeight = '1.2em',
  spacing = '0.5em',
  className = ''
}) => (
  <div className={`skeleton-text ${className}`}>
    {Array.from({ length: lines }, (_, index) => (
      <SkeletonItem
        key={index}
        height={lineHeight}
        width={index === lines - 1 && lines > 1 ? lastLineWidth : '100%'}
        borderRadius="2px"
        className="skeleton-text-line"
        style={{ marginBottom: index < lines - 1 ? spacing : 0 }}
      />
    ))}
  </div>
);

export const SkeletonAvatar: React.FC<{
  size?: string | number;
  shape?: 'circle' | 'square' | 'rounded';
  className?: string;
}> = ({ size = '40px', shape = 'circle', className = '' }) => {
  const borderRadius = shape === 'circle' ? '50%' : shape === 'rounded' ? '8px' : '0';
  
  return (
    <SkeletonItem
      width={size}
      height={size}
      borderRadius={borderRadius}
      className={`skeleton-avatar ${className}`}
    />
  );
};

export const SkeletonCard: React.FC<{
  hasImage?: boolean;
  imageHeight?: string;
  textLines?: number;
  hasButton?: boolean;
  className?: string;
}> = ({
  hasImage = true,
  imageHeight = '200px',
  textLines = 3,
  hasButton = false,
  className = ''
}) => (
  <div className={`skeleton-card ${className}`}>
    {hasImage && (
      <SkeletonItem
        height={imageHeight}
        borderRadius="8px 8px 0 0"
        className="skeleton-card-image"
      />
    )}
    
    <div className="skeleton-card-content" style={{ padding: '16px' }}>
      <SkeletonText lines={textLines} />
      
      {hasButton && (
        <SkeletonItem
          width="100px"
          height="36px"
          borderRadius="4px"
          className="skeleton-card-button"
          style={{ marginTop: '16px' }}
        />
      )}
    </div>
  </div>
);

export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
  className?: string;
}> = ({ rows = 5, columns = 4, hasHeader = true, className = '' }) => (
  <div className={`skeleton-table ${className}`}>
    {hasHeader && (
      <div className="skeleton-table-header" style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        {Array.from({ length: columns }, (_, index) => (
          <SkeletonItem
            key={`header-${index}`}
            height="20px"
            borderRadius="2px"
            className="skeleton-table-header-cell"
            style={{ flex: 1 }}
          />
        ))}
      </div>
    )}
    
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div
        key={`row-${rowIndex}`}
        className="skeleton-table-row"
        style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}
      >
        {Array.from({ length: columns }, (_, colIndex) => (
          <SkeletonItem
            key={`cell-${rowIndex}-${colIndex}`}
            height="18px"
            borderRadius="2px"
            className="skeleton-table-cell"
            style={{ flex: 1 }}
          />
        ))}
      </div>
    ))}
  </div>
);

// Provider component for configuration
interface SkeletonProviderProps {
  children: React.ReactNode;
  config?: Partial<SkeletonConfig>;
}

export const SkeletonProvider: React.FC<SkeletonProviderProps> = ({
  children,
  config
}) => {
  const configManager = useMemo(() => SkeletonConfigManager.getInstance(), []);

  useEffect(() => {
    if (config) {
      configManager.updateConfig(config);
    }
  }, [config, configManager]);

  return (
    <>
      {children}
      <SkeletonStyles />
    </>
  );
};

// Global skeleton styles
const SkeletonStyles: React.FC = () => (
  <style jsx global>{`
    .skeleton-item {
      animation-fill-mode: forwards;
    }

    .skeleton-shimmer {
      background: linear-gradient(
        90deg,
        #f0f0f0 25%,
        #e0e0e0 50%,
        #f0f0f0 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite linear;
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      .skeleton-item,
      .skeleton-shimmer {
        animation: none !important;
        background: #e0e0e0 !important;
      }
    }

    .skeleton-text-line:not(:last-child) {
      margin-bottom: 0.5em;
    }

    .skeleton-card {
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .skeleton-table {
      width: 100%;
    }

    .skeleton-avatar {
      flex-shrink: 0;
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .skeleton-item {
        background-color: #666 !important;
      }
      
      .skeleton-shimmer {
        background: linear-gradient(
          90deg,
          #666 25%,
          #888 50%,
          #666 75%
        ) !important;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .skeleton-item {
        background-color: #333;
      }
      
      .skeleton-shimmer {
        background: linear-gradient(
          90deg,
          #333 25%,
          #444 50%,
          #333 75%
        );
      }
    }
  `}</style>
);

// Hook for skeleton configuration
export const useSkeletonConfig = () => {
  const configManager = useMemo(() => SkeletonConfigManager.getInstance(), []);
  
  return {
    getConfig: configManager.getOptimalConfig.bind(configManager),
    updateConfig: configManager.updateConfig.bind(configManager),
    connectionType: ConnectionSpeedDetector.getInstance().getConnectionType()
  };
};