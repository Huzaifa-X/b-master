'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Notification } from '@/types/notification';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  setNotifications: (notifications: Notification[]) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotificationsState] = useState<Notification[]>([]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const addNotification = useCallback((notification: Notification) => {
    setNotificationsState(prev => {
      // Check if notification already exists to prevent duplicates
      const exists = prev.some(n => n.id === notification.id);
      if (exists) {
        // Update existing notification instead of adding duplicate
        return prev.map(n => n.id === notification.id ? notification : n);
      }
      // Add new notification at the beginning
      return [notification, ...prev];
    });
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotificationsState(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotificationsState(prev =>
      prev.map(n => ({ ...n, isRead: true }))
    );
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    setNotificationsState(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const setNotifications = useCallback((notifications: Notification[]) => {
    setNotificationsState(notifications);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        setNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};