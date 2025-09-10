import { motion, PanInfo, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { SPRING_CONFIGS, GESTURE_THRESHOLDS } from '../core/spring-configs';

/**
 * Mobile-First Touch Gesture Components
 * Optimized for touch devices with natural gesture patterns
 */

// Pull-to-refresh component
export const PullToRefresh: React.FC<{
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}> = ({ onRefresh, children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const controls = useAnimation();
  
  const pullDistance = useTransform(y, [0, 100], [0, 100]);
  const pullOpacity = useTransform(y, [0, 50], [0, 1]);
  const iconRotation = useTransform(y, [0, 100], [0, 180]);
  
  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 80 && !isRefreshing) {
      setIsRefreshing(true);
      await controls.start({ y: 60 });
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        await controls.start({ y: 0 });
      }
    } else {
      controls.start({ y: 0 });
    }
  };
  
  return (
    <motion.div
      className="relative overflow-hidden"
      drag="y"
      dragConstraints={{ top: 0, bottom: 100 }}
      dragElastic={0.5}
      onDragEnd={handleDragEnd}
      animate={controls}
      style={{ y }}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex justify-center py-4"
        style={{ opacity: pullOpacity, y: -60 }}
      >
        <motion.div
          className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center"
          animate={{ rotate: isRefreshing ? 360 : iconRotation }}
          transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </motion.div>
      </motion.div>
      
      {children}
    </motion.div>
  );
};

// Swipeable tabs with gesture navigation
export const SwipeableTabs: React.FC<{
  tabs: Array<{ id: string; label: string; content: React.ReactNode }>;
  defaultTab?: string;
}> = ({ tabs, defaultTab }) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0].id);
  const [direction, setDirection] = useState(0);
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
  
  const handleSwipe = (newDirection: number) => {
    const newIndex = activeIndex + newDirection;
    if (newIndex >= 0 && newIndex < tabs.length) {
      setDirection(newDirection);
      setActiveTab(tabs[newIndex].id);
    }
  };
  
  return (
    <div className="w-full">
      {/* Tab headers */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab, index) => (
          <motion.button
            key={tab.id}
            className="flex-1 py-3 px-4 text-center relative"
            onClick={() => {
              setDirection(index > activeIndex ? 1 : -1);
              setActiveTab(tab.id);
            }}
            whileTap={{ scale: 0.95 }}
          >
            <span className={activeTab === tab.id ? 'text-cyan-600 font-medium' : 'text-gray-600'}>
              {tab.label}
            </span>
            
            {activeTab === tab.id && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"
                layoutId="activeTab"
                transition={SPRING_CONFIGS.gentle}
              />
            )}
          </motion.button>
        ))}
      </div>
      
      {/* Tab content with swipe gestures */}
      <motion.div
        className="relative overflow-hidden"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, { offset, velocity }) => {
          const swipeThreshold = 50;
          if (offset.x > swipeThreshold && velocity.x > 0) {
            handleSwipe(-1);
          } else if (offset.x < -swipeThreshold && velocity.x < 0) {
            handleSwipe(1);
          }
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            initial={{ x: direction > 0 ? '100%' : '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? '-100%' : '100%', opacity: 0 }}
            transition={SPRING_CONFIGS.standard}
            className="p-4"
          >
            {tabs.find(tab => tab.id === activeTab)?.content}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// Pinch-to-zoom image viewer
export const PinchZoomImage: React.FC<{
  src: string;
  alt: string;
}> = ({ src, alt }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastDistance = useRef(0);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    let touches: TouchList;
    
    const handleTouchStart = (e: TouchEvent) => {
      touches = e.touches;
      if (touches.length === 2) {
        const distance = Math.hypot(
          touches[0].clientX - touches[1].clientX,
          touches[0].clientY - touches[1].clientY
        );
        lastDistance.current = distance;
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        
        if (lastDistance.current > 0) {
          const delta = distance - lastDistance.current;
          setScale(prev => Math.min(Math.max(prev + delta * 0.01, 1), 3));
        }
        
        lastDistance.current = distance;
      }
    };
    
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);
  
  return (
    <div ref={containerRef} className="relative overflow-hidden touch-none">
      <motion.img
        src={src}
        alt={alt}
        className="w-full h-full object-contain"
        drag={scale > 1}
        dragConstraints={{
          left: -(scale - 1) * 150,
          right: (scale - 1) * 150,
          top: -(scale - 1) * 150,
          bottom: (scale - 1) * 150,
        }}
        dragElastic={0.1}
        animate={{ scale }}
        transition={SPRING_CONFIGS.gentle}
        onDoubleClick={() => setScale(scale === 1 ? 2 : 1)}
      />
      
      {/* Zoom indicator */}
      {scale > 1 && (
        <motion.div
          className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {Math.round(scale * 100)}%
        </motion.div>
      )}
    </div>
  );
};

// Bottom sheet with drag dismiss
export const BottomSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
}> = ({ isOpen, onClose, children, snapPoints = [0.5, 0.9] }) => {
  const [currentSnap, setCurrentSnap] = useState(0);
  const y = useMotionValue(0);
  const controls = useAnimation();
  
  const height = typeof window !== 'undefined' ? window.innerHeight : 800;
  const snapHeights = snapPoints.map(point => height * (1 - point));
  
  useEffect(() => {
    if (isOpen) {
      controls.start({ y: snapHeights[0] });
    } else {
      controls.start({ y: height });
    }
  }, [isOpen, controls, snapHeights, height]);
  
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.y;
    const currentY = y.get();
    
    if (velocity > 500 || currentY > height * 0.75) {
      onClose();
      controls.start({ y: height });
    } else {
      // Find nearest snap point
      const nearestSnap = snapHeights.reduce((prev, curr) => 
        Math.abs(curr - currentY) < Math.abs(prev - currentY) ? curr : prev
      );
      controls.start({ y: nearestSnap });
      setCurrentSnap(snapHeights.indexOf(nearestSnap));
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50"
            initial={{ y: height }}
            animate={controls}
            exit={{ y: height }}
            drag="y"
            dragConstraints={{ top: snapHeights[snapHeights.length - 1], bottom: height }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ y, height }}
            transition={SPRING_CONFIGS.standard}
          >
            {/* Drag handle */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>
            
            {/* Content */}
            <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: height * 0.85 }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Long press context menu
export const LongPressMenu: React.FC<{
  children: React.ReactNode;
  options: Array<{ label: string; icon?: React.ReactNode; action: () => void }>;
}> = ({ children, options }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<NodeJS.Timeout>();
  
  const handlePressStart = (e: React.TouchEvent | React.MouseEvent) => {
    const touch = 'touches' in e ? e.touches[0] : e;
    setMenuPosition({ x: touch.clientX, y: touch.clientY });
    
    longPressTimer.current = setTimeout(() => {
      setShowMenu(true);
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, GESTURE_THRESHOLDS.press.duration);
  };
  
  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };
  
  return (
    <>
      <div
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
      >
        {children}
      </div>
      
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
            />
            
            {/* Menu */}
            <motion.div
              className="fixed bg-white rounded-xl shadow-2xl z-50 py-2 min-w-[200px]"
              style={{
                left: menuPosition.x,
                top: menuPosition.y,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={SPRING_CONFIGS.bouncy}
            >
              {options.map((option, index) => (
                <motion.button
                  key={option.label}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    option.action();
                    setShowMenu(false);
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, ...SPRING_CONFIGS.gentle }}
                  whileHover={{ x: 4 }}
                >
                  {option.icon && <span className="text-gray-600">{option.icon}</span>}
                  <span>{option.label}</span>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};