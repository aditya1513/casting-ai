/**
 * Mobile Interaction Patterns Library for CastMatch
 * Complete collection of reusable mobile interaction components
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, PanInfo, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { hapticFeedback } from './haptic-feedback-system';
import { touchGestures } from './touch-gestures';

// SWIPEABLE TALENT CARD
export interface TalentCardProps {
  talent: {
    id: string;
    name: string;
    image: string;
    role: string;
    location: string;
    experience: string;
  };
  onShortlist: (id: string) => void;
  onPass: (id: string) => void;
  onViewProfile: (id: string) => void;
}

export const SwipeableTalentCard: React.FC<TalentCardProps> = ({
  talent,
  onShortlist,
  onPass,
  onViewProfile
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-30, 0, 30]);
  const opacity = useTransform(x, [-300, -150, 0, 150, 300], [0, 1, 1, 1, 0]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 150;
    const velocity = info.velocity.x;

    if (info.offset.x > threshold || velocity > 500) {
      // Swipe right - Shortlist
      setExitDirection('right');
      setTimeout(() => {
        onShortlist(talent.id);
        hapticFeedback.talentShortlisted();
      }, 150);
    } else if (info.offset.x < -threshold || velocity < -500) {
      // Swipe left - Pass
      setExitDirection('left');
      setTimeout(() => {
        onPass(talent.id);
        hapticFeedback.swipeAction();
      }, 150);
    } else {
      // Snap back
      x.set(0);
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      className="relative w-full max-w-sm mx-auto"
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      animate={exitDirection ? {
        x: exitDirection === 'right' ? 300 : -300,
        opacity: 0,
        scale: 0.8
      } : {}}
      exit={{
        x: exitDirection === 'right' ? 300 : -300,
        opacity: 0,
        scale: 0.8
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileTap={{ scale: 0.95 }}
      data-gesture-context="talent-card"
    >
      {/* Swipe Indicators */}
      <motion.div
        className="absolute inset-0 bg-green-500 rounded-2xl flex items-center justify-start pl-8 z-10"
        initial={{ opacity: 0 }}
        style={{ opacity: useTransform(x, [0, 150], [0, 0.8]) }}
      >
        <div className="text-white font-bold text-xl">SHORTLIST</div>
      </motion.div>
      
      <motion.div
        className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end pr-8 z-10"
        initial={{ opacity: 0 }}
        style={{ opacity: useTransform(x, [-150, 0], [0.8, 0]) }}
      >
        <div className="text-white font-bold text-xl">PASS</div>
      </motion.div>

      {/* Card Content */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden relative z-20">
        <div className="aspect-[3/4] relative">
          <img 
            src={talent.image} 
            alt={talent.name}
            className="w-full h-full object-cover"
            onDoubleClick={() => onViewProfile(talent.id)}
          />
          
          {/* Long Press Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <button 
              className="bg-white bg-opacity-90 rounded-full p-3"
              onClick={() => onViewProfile(talent.id)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-bold text-lg text-gray-900">{talent.name}</h3>
          <p className="text-gray-600 text-sm">{talent.role}</p>
          <p className="text-gray-500 text-xs mt-1">{talent.location} • {talent.experience}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4 mt-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg"
          onClick={() => {
            setExitDirection('left');
            onPass(talent.id);
          }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg"
          onClick={() => onViewProfile(talent.id)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-12 h-12 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white shadow-lg"
          onClick={() => {
            setExitDirection('right');
            onShortlist(talent.id);
          }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  );
};

// PINCH-TO-ZOOM IMAGE VIEWER
export interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const ZoomableImage: React.FC<ZoomableImageProps> = ({ src, alt, className = "" }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handleGesture = (event: CustomEvent) => {
      if (event.detail.element === imageRef.current) {
        const { scale: newScale, center } = event.detail;
        setScale(Math.max(1, Math.min(3, newScale)));
        
        if (newScale > 1.1) {
          setIsZoomed(true);
          hapticFeedback.photoZoom();
        } else if (newScale < 0.9) {
          setIsZoomed(false);
          setScale(1);
          setPosition({ x: 0, y: 0 });
        }
      }
    };

    document.addEventListener('castmatch:gesture:headshot:zoom', handleGesture as any);
    return () => document.removeEventListener('castmatch:gesture:headshot:zoom', handleGesture as any);
  }, []);

  return (
    <div className={`overflow-hidden ${className}`} data-gesture-context="headshot-viewer">
      <motion.img
        ref={imageRef}
        src={src}
        alt={alt}
        className="w-full h-full object-contain cursor-zoom-in"
        style={{
          scale,
          x: position.x,
          y: position.y
        }}
        animate={{
          scale,
          x: position.x,
          y: position.y
        }}
        transition={{ type: "spring", damping: 20 }}
        onDoubleClick={() => {
          if (isZoomed) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
            setIsZoomed(false);
          } else {
            setScale(2);
            setIsZoomed(true);
            hapticFeedback.photoZoom();
          }
        }}
      />
    </div>
  );
};

// SWIPEABLE MEDIA GALLERY
export interface MediaGalleryProps {
  media: Array<{
    id: string;
    type: 'image' | 'video';
    src: string;
    thumbnail: string;
    caption?: string;
  }>;
  initialIndex?: number;
  onMediaChange?: (index: number) => void;
}

export const SwipeableMediaGallery: React.FC<MediaGalleryProps> = ({ 
  media, 
  initialIndex = 0, 
  onMediaChange 
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const x = useMotionValue(0);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    const velocity = info.velocity.x;

    if (info.offset.x > threshold || velocity > 300) {
      // Swipe right - Previous
      const newIndex = Math.max(0, currentIndex - 1);
      setCurrentIndex(newIndex);
      onMediaChange?.(newIndex);
      hapticFeedback.gallerySwipe();
    } else if (info.offset.x < -threshold || velocity < -300) {
      // Swipe left - Next
      const newIndex = Math.min(media.length - 1, currentIndex + 1);
      setCurrentIndex(newIndex);
      onMediaChange?.(newIndex);
      hapticFeedback.gallerySwipe();
    }
    
    x.set(0);
  };

  return (
    <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden" data-gesture-context="media-gallery">
      <motion.div
        className="flex h-full"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={{ x: -currentIndex * 100 + '%' }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
      >
        {media.map((item, index) => (
          <div key={item.id} className="min-w-full h-full relative">
            {item.type === 'image' ? (
              <ZoomableImage
                src={item.src}
                alt={item.caption || `Media ${index + 1}`}
                className="w-full h-full"
              />
            ) : (
              <video 
                src={item.src}
                className="w-full h-full object-contain"
                controls
                data-gesture-context="video-player"
              />
            )}
            
            {item.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
                <p className="text-sm">{item.caption}</p>
              </div>
            )}
          </div>
        ))}
      </motion.div>

      {/* Navigation Dots */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {media.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? 'bg-white' : 'bg-white bg-opacity-50'
            }`}
            onClick={() => {
              setCurrentIndex(index);
              onMediaChange?.(index);
            }}
          />
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white"
        onClick={() => {
          const newIndex = Math.max(0, currentIndex - 1);
          setCurrentIndex(newIndex);
          onMediaChange?.(newIndex);
        }}
        disabled={currentIndex === 0}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white"
        onClick={() => {
          const newIndex = Math.min(media.length - 1, currentIndex + 1);
          setCurrentIndex(newIndex);
          onMediaChange?.(newIndex);
        }}
        disabled={currentIndex === media.length - 1}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

// PULL-TO-REFRESH CONTAINER
export interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  refreshThreshold?: number;
  className?: string;
}

export const PullToRefreshContainer: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  refreshThreshold = 80,
  className = ""
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const y = useMotionValue(0);

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (window.scrollY > 0) return; // Only allow pull when at top
    
    const distance = Math.max(0, info.offset.y);
    setPullDistance(distance);
    
    if (distance > refreshThreshold) {
      hapticFeedback.notification();
    }
  };

  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > refreshThreshold && window.scrollY === 0) {
      setIsRefreshing(true);
      hapticFeedback.profileSaved();
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
        hapticFeedback.error();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        y.set(0);
      }
    } else {
      setPullDistance(0);
      y.set(0);
    }
  };

  const refreshProgress = Math.min(pullDistance / refreshThreshold, 1);

  return (
    <div className={`relative ${className}`} data-pull-to-refresh="true">
      {/* Pull to Refresh Indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center"
        style={{ 
          height: pullDistance,
          opacity: refreshProgress
        }}
        animate={{
          height: isRefreshing ? 60 : pullDistance
        }}
      >
        <div className="flex items-center space-x-2 text-gray-600">
          {isRefreshing ? (
            <>
              <motion.div
                className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span className="text-sm">Refreshing...</span>
            </>
          ) : (
            <>
              <motion.div
                className="w-5 h-5"
                animate={{ rotate: refreshProgress * 180 }}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </motion.div>
              <span className="text-sm">
                {refreshProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </>
          )}
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        style={{ y }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.3, bottom: 0 }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{
          y: isRefreshing ? 60 : 0
        }}
        transition={{ type: "spring", damping: 20 }}
      >
        {children}
      </motion.div>
    </div>
  );
};

// LONG PRESS CONTEXT MENU
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  destructive?: boolean;
}

export interface LongPressContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
  className?: string;
}

export const LongPressContextMenu: React.FC<LongPressContextMenuProps> = ({
  items,
  children,
  className = ""
}) => {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleLongPress = (event: CustomEvent) => {
      if (event.detail.element?.closest('[data-long-press-menu]')) {
        const rect = event.detail.element.getBoundingClientRect();
        setMenuPosition({
          x: event.detail.point.x,
          y: event.detail.point.y
        });
        setIsMenuVisible(true);
        hapticFeedback.longPress();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuVisible(false);
      }
    };

    document.addEventListener('castmatch:gesture:longPress', handleLongPress as any);
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('castmatch:gesture:longPress', handleLongPress as any);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <>
      <div className={className} data-long-press-menu>
        {children}
      </div>

      <AnimatePresence>
        {isMenuVisible && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
            style={{
              left: menuPosition.x - 100,
              top: menuPosition.y - 10
            }}
          >
            {items.map((item, index) => (
              <motion.button
                key={item.id}
                className={`w-full px-4 py-3 text-left hover:bg-gray-100 flex items-center space-x-3 ${
                  item.destructive ? 'text-red-600' : 'text-gray-700'
                } ${index !== items.length - 1 ? 'border-b border-gray-100' : ''}`}
                onClick={() => {
                  item.action();
                  setIsMenuVisible(false);
                  hapticFeedback.buttonTap();
                }}
                whileHover={{ backgroundColor: 'rgb(243 244 246)' }}
                whileTap={{ scale: 0.98 }}
              >
                {item.icon && (
                  <div className="w-5 h-5 flex-shrink-0">
                    {item.icon}
                  </div>
                )}
                <span className="text-sm font-medium">{item.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// SHAKE TO UNDO
export const useShakeToUndo = (onUndo: () => void, sensitivity: number = 15) => {
  useEffect(() => {
    let lastShakeTime = 0;
    
    const handleShake = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;

      const { x = 0, y = 0, z = 0 } = acceleration;
      const totalAcceleration = Math.sqrt(x * x + y * y + z * z);
      
      if (totalAcceleration > sensitivity && Date.now() - lastShakeTime > 1000) {
        lastShakeTime = Date.now();
        onUndo();
        hapticFeedback.undoAction();
      }
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleShake);
      return () => window.removeEventListener('devicemotion', handleShake);
    }
  }, [onUndo, sensitivity]);
};

// HAPTIC FEEDBACK ENHANCED BUTTON
export interface HapticButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  hapticType?: 'light' | 'medium' | 'heavy';
  className?: string;
}

export const HapticButton: React.FC<HapticButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  hapticType = 'light',
  className = ""
}) => {
  const handleClick = () => {
    switch (hapticType) {
      case 'light':
        hapticFeedback.buttonTap();
        break;
      case 'medium':
        hapticFeedback.menuOpen();
        break;
      case 'heavy':
        hapticFeedback.longPress();
        break;
    }
    onClick?.();
  };

  const baseClasses = "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variantClasses = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500",
    destructive: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500"
  };

  return (
    <motion.button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", damping: 15, stiffness: 300 }}
    >
      {children}
    </motion.button>
  );
};

// GESTURE-AWARE CARD STACK
export interface CardStackProps {
  cards: Array<{
    id: string;
    content: React.ReactNode;
  }>;
  onCardAction: (id: string, action: 'like' | 'pass') => void;
}

export const GestureCardStack: React.FC<CardStackProps> = ({ cards, onCardAction }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animatingCards, setAnimatingCards] = useState<Set<string>>(new Set());

  const handleCardAction = (id: string, action: 'like' | 'pass') => {
    setAnimatingCards(prev => new Set([...prev, id]));
    
    setTimeout(() => {
      onCardAction(id, action);
      setCurrentIndex(prev => Math.min(prev + 1, cards.length - 1));
      setAnimatingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }, 300);
  };

  return (
    <div className="relative w-full max-w-sm mx-auto h-96">
      {cards.slice(currentIndex, currentIndex + 3).map((card, stackIndex) => (
        <motion.div
          key={card.id}
          className="absolute inset-0"
          initial={{ 
            scale: 1 - stackIndex * 0.05,
            y: stackIndex * 8,
            zIndex: 10 - stackIndex
          }}
          animate={{ 
            scale: 1 - stackIndex * 0.05,
            y: stackIndex * 8,
            zIndex: 10 - stackIndex
          }}
          style={{
            pointerEvents: stackIndex === 0 ? 'auto' : 'none'
          }}
        >
          {stackIndex === 0 ? (
            <SwipeableTalentCard
              talent={{
                id: card.id,
                name: `Talent ${card.id}`,
                image: '/api/placeholder/400/600',
                role: 'Actor',
                location: 'Mumbai',
                experience: '5 years'
              }}
              onShortlist={(id) => handleCardAction(id, 'like')}
              onPass={(id) => handleCardAction(id, 'pass')}
              onViewProfile={(id) => console.log('View profile', id)}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 rounded-2xl shadow-lg">
              {card.content}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};