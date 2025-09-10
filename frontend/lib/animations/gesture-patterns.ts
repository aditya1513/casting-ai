/**
 * Gesture Pattern Recognition and Handling for CastMatch
 * Implements touch, mouse, and keyboard interactions
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { PanInfo, useAnimation } from 'framer-motion';

// Gesture types
export enum GestureType {
  SWIPE_LEFT = 'swipe_left',
  SWIPE_RIGHT = 'swipe_right',
  SWIPE_UP = 'swipe_up',
  SWIPE_DOWN = 'swipe_down',
  PINCH_IN = 'pinch_in',
  PINCH_OUT = 'pinch_out',
  LONG_PRESS = 'long_press',
  DOUBLE_TAP = 'double_tap',
  ROTATE = 'rotate'
}

// Gesture configuration
export const GESTURE_CONFIG = {
  swipeThreshold: 50,
  swipeVelocityThreshold: 500,
  longPressDelay: 500,
  doubleTapDelay: 300,
  pinchThreshold: 0.2,
  rotateThreshold: 15
};

// Keyboard shortcuts configuration
export const KEYBOARD_SHORTCUTS = {
  // Navigation
  'cmd+k': { action: 'openSearch', description: 'Open search' },
  'cmd+/': { action: 'openShortcuts', description: 'Show shortcuts' },
  'cmd+,': { action: 'openSettings', description: 'Open settings' },
  'cmd+b': { action: 'toggleSidebar', description: 'Toggle sidebar' },
  
  // Actions
  'cmd+enter': { action: 'send', description: 'Send message' },
  'cmd+shift+enter': { action: 'sendWithAttachment', description: 'Send with attachment' },
  'esc': { action: 'cancel', description: 'Cancel/Close' },
  'cmd+z': { action: 'undo', description: 'Undo' },
  'cmd+shift+z': { action: 'redo', description: 'Redo' },
  
  // Navigation with arrows
  'arrowup': { action: 'navigateUp', description: 'Navigate up' },
  'arrowdown': { action: 'navigateDown', description: 'Navigate down' },
  'arrowleft': { action: 'navigateLeft', description: 'Navigate left' },
  'arrowright': { action: 'navigateRight', description: 'Navigate right' },
  
  // Talent cards
  'space': { action: 'selectTalent', description: 'Select talent' },
  'cmd+a': { action: 'selectAll', description: 'Select all' },
  'cmd+d': { action: 'deselectAll', description: 'Deselect all' },
  'f': { action: 'favorite', description: 'Add to favorites' },
  'm': { action: 'message', description: 'Send message' },
  's': { action: 'schedule', description: 'Schedule meeting' }
};

// Custom hook for swipe gestures
export const useSwipeGesture = (
  onSwipe: (direction: GestureType) => void,
  threshold = GESTURE_CONFIG.swipeThreshold
) => {
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);

  const handleDragStart = (e: any, info: PanInfo) => {
    setStartX(info.point.x);
    setStartY(info.point.y);
  };

  const handleDragEnd = (e: any, info: PanInfo) => {
    const deltaX = info.point.x - startX;
    const deltaY = info.point.y - startY;
    const velocity = Math.sqrt(info.velocity.x ** 2 + info.velocity.y ** 2);

    if (velocity > GESTURE_CONFIG.swipeVelocityThreshold || 
        Math.abs(deltaX) > threshold || 
        Math.abs(deltaY) > threshold) {
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0) {
          onSwipe(GestureType.SWIPE_RIGHT);
        } else {
          onSwipe(GestureType.SWIPE_LEFT);
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          onSwipe(GestureType.SWIPE_DOWN);
        } else {
          onSwipe(GestureType.SWIPE_UP);
        }
      }
    }
  };

  return {
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    drag: true,
    dragConstraints: { left: 0, right: 0, top: 0, bottom: 0 },
    dragElastic: 0.2
  };
};

// Custom hook for pinch gestures
export const usePinchGesture = (
  onPinch: (scale: number) => void
) => {
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let touches: TouchList;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        touches = e.touches;
        const distance = Math.hypot(
          touches[0].clientX - touches[1].clientX,
          touches[0].clientY - touches[1].clientY
        );
        setInitialDistance(distance);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance) {
        const currentDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const scale = currentDistance / initialDistance;
        onPinch(scale);
      }
    };

    const handleTouchEnd = () => {
      setInitialDistance(null);
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [initialDistance, onPinch]);

  return elementRef;
};

// Custom hook for long press
export const useLongPress = (
  onLongPress: () => void,
  delay = GESTURE_CONFIG.longPressDelay
) => {
  const [pressing, setPressing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handlePressStart = useCallback(() => {
    setPressing(true);
    timeoutRef.current = setTimeout(() => {
      onLongPress();
      setPressing(false);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, delay);
  }, [onLongPress, delay]);

  const handlePressEnd = useCallback(() => {
    setPressing(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    onMouseDown: handlePressStart,
    onMouseUp: handlePressEnd,
    onMouseLeave: handlePressEnd,
    onTouchStart: handlePressStart,
    onTouchEnd: handlePressEnd,
    isPressing: pressing
  };
};

// Custom hook for double tap
export const useDoubleTap = (
  onDoubleTap: () => void,
  delay = GESTURE_CONFIG.doubleTapDelay
) => {
  const [lastTap, setLastTap] = useState(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap < delay) {
      onDoubleTap();
      setLastTap(0);
    } else {
      setLastTap(now);
    }
  }, [lastTap, onDoubleTap, delay]);

  return {
    onClick: handleTap
  };
};

// Custom hook for keyboard shortcuts
export const useKeyboardShortcuts = (
  shortcuts: Record<string, () => void>,
  enabled = true
) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Build key combination string
      const keys: string[] = [];
      if (e.metaKey || e.ctrlKey) keys.push('cmd');
      if (e.shiftKey) keys.push('shift');
      if (e.altKey) keys.push('alt');
      keys.push(e.key.toLowerCase());
      
      const combination = keys.join('+');
      
      // Check if shortcut exists
      if (shortcuts[combination]) {
        e.preventDefault();
        shortcuts[combination]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
};

// Mouse parallax effect hook
export const useParallax = (strength = 10) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!elementRef.current) return;
      
      const rect = elementRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const x = (e.clientX - centerX) / (rect.width / 2) * strength;
      const y = (e.clientY - centerY) / (rect.height / 2) * strength;
      
      setPosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [strength]);

  return { ref: elementRef, x: position.x, y: position.y };
};

// Drag to reorder hook
export const useDragToReorder = <T extends { id: string }>(
  items: T[],
  onReorder: (items: T[]) => void
) => {
  const [draggedItem, setDraggedItem] = useState<T | null>(null);
  const [draggedOverItem, setDraggedOverItem] = useState<T | null>(null);

  const handleDragStart = (item: T) => {
    setDraggedItem(item);
  };

  const handleDragOver = (item: T) => {
    if (!draggedItem || draggedItem.id === item.id) return;
    setDraggedOverItem(item);
  };

  const handleDragEnd = () => {
    if (!draggedItem || !draggedOverItem) {
      setDraggedItem(null);
      setDraggedOverItem(null);
      return;
    }

    const draggedIndex = items.findIndex(item => item.id === draggedItem.id);
    const draggedOverIndex = items.findIndex(item => item.id === draggedOverItem.id);

    const newItems = [...items];
    newItems.splice(draggedIndex, 1);
    newItems.splice(draggedOverIndex, 0, draggedItem);

    onReorder(newItems);
    setDraggedItem(null);
    setDraggedOverItem(null);
  };

  return {
    draggedItem,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  };
};

// Gesture feedback animations
export const gestureFeedback = {
  tap: {
    scale: 0.95,
    transition: { duration: 0.1 }
  },
  hover: {
    scale: 1.05,
    transition: { duration: 0.2 }
  },
  drag: {
    scale: 1.1,
    rotate: 5,
    transition: { duration: 0.2 }
  },
  swipe: {
    x: [0, 50, 0],
    transition: { duration: 0.3 }
  },
  shake: {
    x: [-10, 10, -10, 10, 0],
    transition: { duration: 0.4 }
  },
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 0.3, repeat: 2 }
  }
};