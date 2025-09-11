import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/remix';
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

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { getToken, userId } = useAuth();

  // Initialize socket connection
  useEffect(() => {
    if (!userId) return;

    const initSocket = async () => {
      try {
        const token = await getToken();
        const socketInstance = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001', {
          auth: {
            token: token || '',
          },
          transports: ['websocket'],
        });

        socketInstance.on('connect', () => {
          console.log('Connected to notification service');
          setIsConnected(true);

          // Join user-specific room for notifications
          socketInstance.emit('join_notifications', { userId });
        });

        socketInstance.on('disconnect', () => {
          console.log('Disconnected from notification service');
          setIsConnected(false);
        });

        // Listen for new notifications
        socketInstance.on('new_notification', (notification: Notification) => {
          setNotifications(prev => [notification, ...prev]);

          // Show toast for urgent notifications
          if (notification.priority === 'urgent') {
            toast.error(notification.title, {
              description: notification.message,
              action: notification.actionUrl
                ? {
                    label: 'View',
                    onClick: () => (window.location.href = notification.actionUrl!),
                  }
                : undefined,
            });
          } else if (notification.priority === 'high') {
            toast.warning(notification.title, {
              description: notification.message,
            });
          } else {
            toast.info(notification.title, {
              description: notification.message,
            });
          }
        });

        // Listen for notification updates
        socketInstance.on('notification_updated', (updatedNotification: Notification) => {
          setNotifications(prev =>
            prev.map(n => (n.id === updatedNotification.id ? updatedNotification : n))
          );
        });

        // Listen for notification deletions
        socketInstance.on('notification_deleted', (notificationId: string) => {
          setNotifications(prev => prev.filter(n => n.id !== notificationId));
        });

        setSocket(socketInstance);

        return () => {
          socketInstance.disconnect();
        };
      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    };

    initSocket();
  }, [userId, getToken]);

  // Fetch initial notifications
  const refreshNotifications = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/notifications', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [getToken]);

  // Initial fetch
  useEffect(() => {
    if (userId) {
      refreshNotifications();
    }
  }, [userId, refreshNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const token = await getToken();
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          setNotifications(prev =>
            prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
          );
        }
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    },
    [getToken]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [getToken]);

  // Delete notification
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        const token = await getToken();
        const response = await fetch(`/api/notifications/${notificationId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          setNotifications(prev => prev.filter(n => n.id !== notificationId));
          toast.success('Notification deleted');
        }
      } catch (error) {
        console.error('Failed to delete notification:', error);
      }
    },
    [getToken]
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  };
}
