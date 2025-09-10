import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useState, useRef } from 'react';
import { SPRING_CONFIGS } from '../core/spring-configs';

/**
 * Mumbai Casting Industry Specific Interactions
 * Designed for Bollywood workflow patterns
 */

// Talent card with swipe gestures for casting decisions
export const TalentSwipeCard: React.FC<{
  talent: {
    name: string;
    image: string;
    role: string;
    experience: string;
    languages: string[];
  };
  onAccept: () => void;
  onReject: () => void;
  onShortlist: () => void;
}> = ({ talent, onAccept, onReject, onShortlist }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  
  // Color overlays for swipe directions
  const acceptOverlay = useTransform(x, [0, 150], [0, 1]);
  const rejectOverlay = useTransform(x, [-150, 0], [1, 0]);
  
  return (
    <motion.div
      className="absolute w-full h-full"
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      onDragEnd={(e, { offset, velocity }) => {
        if (offset.x > 100) {
          onAccept();
        } else if (offset.x < -100) {
          onReject();
        }
      }}
    >
      <div className="relative w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Accept overlay (green) */}
        <motion.div
          className="absolute inset-0 bg-green-500 z-10"
          style={{ opacity: acceptOverlay }}
        />
        
        {/* Reject overlay (red) */}
        <motion.div
          className="absolute inset-0 bg-red-500 z-10"
          style={{ opacity: rejectOverlay }}
        />
        
        {/* Talent image */}
        <div className="h-2/3 relative">
          <img src={talent.image} alt={talent.name} className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
            <h3 className="text-2xl font-bold text-white">{talent.name}</h3>
            <p className="text-white/90">{talent.role}</p>
          </div>
        </div>
        
        {/* Talent details */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-600">Experience:</span>
            <span className="font-medium">{talent.experience}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {talent.languages.map(lang => (
              <span key={lang} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                {lang}
              </span>
            ))}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="absolute bottom-6 left-6 right-6 flex justify-between">
          <motion.button
            className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onReject}
          >
            ✕
          </motion.button>
          
          <motion.button
            className="w-14 h-14 bg-yellow-500 rounded-full flex items-center justify-center text-white shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onShortlist}
          >
            ★
          </motion.button>
          
          <motion.button
            className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onAccept}
          >
            ✓
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// Audition schedule timeline with drag-to-reschedule
export const AuditionTimeline: React.FC<{
  slots: Array<{
    id: string;
    time: string;
    talent: string;
    status: 'scheduled' | 'completed' | 'cancelled';
  }>;
  onReschedule: (id: string, newTime: string) => void;
}> = ({ slots, onReschedule }) => {
  const [draggedSlot, setDraggedSlot] = useState<string | null>(null);
  
  return (
    <div className="space-y-2">
      {slots.map((slot, index) => (
        <motion.div
          key={slot.id}
          className={`
            p-4 bg-white rounded-lg shadow-md cursor-move
            ${slot.status === 'completed' ? 'opacity-60' : ''}
            ${slot.status === 'cancelled' ? 'opacity-40 line-through' : ''}
          `}
          layout
          drag={slot.status === 'scheduled'}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragStart={() => setDraggedSlot(slot.id)}
          onDragEnd={() => setDraggedSlot(null)}
          whileHover={{ scale: 1.02, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
          whileDrag={{ scale: 1.05, zIndex: 1000 }}
          transition={SPRING_CONFIGS.gentle}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-lg font-medium text-orange-600">{slot.time}</div>
              <div>
                <p className="font-medium">{slot.talent}</p>
                <p className="text-sm text-gray-500 capitalize">{slot.status}</p>
              </div>
            </div>
            
            {slot.status === 'scheduled' && (
              <motion.div
                className="flex gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button className="p-2 text-green-600 hover:bg-green-50 rounded">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// Role requirement matcher with visual feedback
export const RoleRequirementMatcher: React.FC<{
  requirements: string[];
  talentSkills: string[];
}> = ({ requirements, talentSkills }) => {
  const matchedSkills = requirements.filter(req => 
    talentSkills.some(skill => skill.toLowerCase().includes(req.toLowerCase()))
  );
  
  const matchPercentage = (matchedSkills.length / requirements.length) * 100;
  
  return (
    <div className="space-y-4">
      {/* Match score */}
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            <motion.circle
              cx="40"
              cy="40"
              r="36"
              stroke={matchPercentage > 70 ? '#10b981' : matchPercentage > 40 ? '#f59e0b' : '#ef4444'}
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 36}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 36 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 36 * (1 - matchPercentage / 100) }}
              transition={SPRING_CONFIGS.standard}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold">{Math.round(matchPercentage)}%</span>
          </div>
        </div>
        
        <div>
          <p className="font-medium">Role Match Score</p>
          <p className="text-sm text-gray-600">
            {matchedSkills.length} of {requirements.length} requirements met
          </p>
        </div>
      </div>
      
      {/* Requirements list */}
      <div className="space-y-2">
        {requirements.map((req, index) => {
          const isMatched = matchedSkills.includes(req);
          
          return (
            <motion.div
              key={req}
              className={`
                flex items-center gap-3 p-3 rounded-lg
                ${isMatched ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}
                border
              `}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, ...SPRING_CONFIGS.gentle }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.05 + 0.2, ...SPRING_CONFIGS.bouncy }}
              >
                {isMatched ? (
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
                )}
              </motion.div>
              
              <span className={isMatched ? 'font-medium text-green-700' : 'text-gray-600'}>
                {req}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// Quick action fab menu for casting directors
export const CastingActionFab: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const actions = [
    { icon: '📷', label: 'Capture Headshot', color: 'bg-purple-500' },
    { icon: '🎬', label: 'Start Audition', color: 'bg-red-500' },
    { icon: '📝', label: 'Add Notes', color: 'bg-blue-500' },
    { icon: '📅', label: 'Schedule', color: 'bg-green-500' },
    { icon: '⭐', label: 'Shortlist', color: 'bg-yellow-500' },
  ];
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <div className="absolute bottom-16 right-0 space-y-3">
            {actions.map((action, index) => (
              <motion.button
                key={action.label}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-full shadow-lg
                  ${action.color} text-white whitespace-nowrap
                `}
                initial={{ opacity: 0, scale: 0, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0, x: 20 }}
                transition={{
                  delay: index * 0.05,
                  ...SPRING_CONFIGS.bouncy
                }}
                whileHover={{ scale: 1.05, x: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-xl">{action.icon}</span>
                <span className="font-medium">{action.label}</span>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>
      
      <motion.button
        className="w-14 h-14 bg-orange-500 rounded-full shadow-lg flex items-center justify-center text-white text-2xl"
        onClick={() => setIsOpen(!isOpen)}
        animate={{ rotate: isOpen ? 45 : 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={SPRING_CONFIGS.snappy}
      >
        +
      </motion.button>
    </div>
  );
};