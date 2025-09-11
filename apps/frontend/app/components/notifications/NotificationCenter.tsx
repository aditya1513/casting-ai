/**
 * Notification Center Component
 * Real-time notifications display with WebSocket integration
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Calendar,
  MessageCircle,
  User,
  Star,
  Film,
  Clock,
  Settings,
  Filter,
  Search,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  type: 'application' | 'audition' | 'message' | 'system' | 'callback' | 'project' | 'reminder';
  title: string;
  message: string;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  actionUrl?: string;
  imageUrl?: string;
  data?: any;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick?: (notification: Notification) => void;
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
}

const typeIcons = {
  application: User,
  audition: Calendar,
  message: MessageCircle,
  system: Settings,
  callback: Star,
  project: Film,
  reminder: Clock,
};

const typeColors = {
  application: 'bg-blue-500',
  audition: 'bg-green-500',
  message: 'bg-purple-500',
  system: 'bg-gray-500',
  callback: 'bg-yellow-500',
  project: 'bg-indigo-500',
  reminder: 'bg-orange-500',
};

const priorityBorderColors = {
  low: 'border-gray-200',
  normal: 'border-gray-300',
  high: 'border-orange-300',
  urgent: 'border-red-400',
};

export default function NotificationCenter({
  isOpen,
  onClose,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch notifications from API
  useEffect(() => {
    if (isOpen) {
      const fetchNotifications = async () => {
        try {
          const response = await fetch('/api/notifications');
          if (response.ok) {
            const data = await response.json();
            setNotifications(data.notifications || []);
          }
        } catch (error) {
          console.error('Failed to fetch notifications:', error);
          // Keep empty array on error
        } finally {
          setLoading(false);
        }
      };

      fetchNotifications();
    }
  }, [isOpen]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.isRead) return false;
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
    if (
      searchQuery &&
      !notification.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !notification.message.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        const response = await fetch(`/api/notifications/${notification.id}/read`, {
          method: 'POST',
        });

        if (response.ok) {
          if (onMarkAsRead) {
            onMarkAsRead(notification.id);
          }
          setNotifications(prev =>
            prev.map(n => (n.id === notification.id ? { ...n, isRead: true } : n))
          );
        }
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    if (onNotificationClick) {
      onNotificationClick(notification);
    }

    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });

      if (response.ok) {
        if (onMarkAllAsRead) {
          onMarkAllAsRead();
        }
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black bg-opacity-25"
          onClick={onClose}
        />

        {/* Notification Panel */}
        <motion.div
          ref={panelRef}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-2">
              <select
                value={filter}
                onChange={e => setFilter(e.target.value as 'all' | 'unread')}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
              </select>

              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Types</option>
                <option value="audition">Auditions</option>
                <option value="application">Applications</option>
                <option value="message">Messages</option>
                <option value="callback">Callbacks</option>
                <option value="project">Projects</option>
              </select>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium ml-auto"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex space-x-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  {searchQuery || filter === 'unread'
                    ? 'No matching notifications'
                    : 'No notifications yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredNotifications.map(notification => {
                  const IconComponent = typeIcons[notification.type];
                  const iconColorClass = typeColors[notification.type];
                  const borderColorClass = priorityBorderColors[notification.priority];

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors relative ${
                        !notification.isRead ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {/* Priority indicator */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          notification.priority === 'urgent'
                            ? 'bg-red-500'
                            : notification.priority === 'high'
                              ? 'bg-orange-500'
                              : notification.priority === 'normal'
                                ? 'bg-blue-500'
                                : 'bg-gray-300'
                        }`}
                      />

                      <div className="flex space-x-3 ml-3">
                        {/* Icon */}
                        <div
                          className={`flex-shrink-0 w-10 h-10 ${iconColorClass} rounded-full flex items-center justify-center`}
                        >
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p
                                className={`text-sm font-medium text-gray-900 ${
                                  !notification.isRead ? 'font-semibold' : ''
                                }`}
                              >
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                {formatDistanceToNow(new Date(notification.createdAt), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>

                            {/* Read indicator */}
                            {!notification.isRead && (
                              <div className="flex-shrink-0 ml-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              </div>
                            )}
                          </div>

                          {/* Action buttons for unread urgent notifications */}
                          {!notification.isRead && notification.priority === 'urgent' && (
                            <div className="flex space-x-2 mt-3">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleNotificationClick(notification);
                                }}
                                className="text-xs bg-teal-600 text-white px-3 py-1 rounded-full hover:bg-teal-700 transition-colors"
                              >
                                View
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  if (onMarkAsRead) {
                                    onMarkAsRead(notification.id);
                                    setNotifications(prev =>
                                      prev.map(n =>
                                        n.id === notification.id ? { ...n, isRead: true } : n
                                      )
                                    );
                                  }
                                }}
                                className="text-xs border border-gray-300 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-50 transition-colors"
                              >
                                Mark Read
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={() => (window.location.href = '/notifications')}
              className="w-full text-center text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              View All Notifications
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
