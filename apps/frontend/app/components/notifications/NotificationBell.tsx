import { useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '~/hooks/useNotifications';
import NotificationCenter from './NotificationCenter';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, isConnected, markAsRead, markAllAsRead } = useNotifications();

  const handleNotificationClick = (notification: any) => {
    // Handle notification click - could navigate to specific page
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    setIsOpen(false);
  };

  return (
    <>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        {/* Bell Icon with animation */}
        <motion.div
          animate={
            unreadCount > 0
              ? {
                  rotate: [0, -10, 10, -10, 0],
                  transition: { duration: 0.6, repeat: Infinity, repeatDelay: 3 },
                }
              : {}
          }
        >
          {unreadCount > 0 ? <BellRing className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
        </motion.div>

        {/* Unread Count Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Connection Status Indicator */}
        <div
          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
      </button>

      {/* Notification Center Panel */}
      <NotificationCenter
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />
    </>
  );
}
