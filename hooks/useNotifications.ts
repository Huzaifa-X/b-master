'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '@/app/actions/notification.action';
import { Notification } from '@/types/notification';

/**
 * Hook to fetch user notifications
 */
export function useUserNotifications(options: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
} = {}) {
  return useQuery({
    queryKey: ['notifications', options],
    queryFn: async () => {
      const result = await getUserNotifications(options);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch notifications');
      }
      return result.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Hook to get unread notification count
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const result = await getUnreadCount();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch unread count');
      }
      return result.count;
    },
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

/**
 * Hook to mark notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const result = await markNotificationAsRead(notificationId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to mark notification as read');
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate notifications queries to refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await markAllNotificationsAsRead();
      if (!result.success) {
        throw new Error(result.error || 'Failed to mark all notifications as read');
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate notifications queries to refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/**
 * Hook to delete notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const result = await deleteNotification(notificationId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete notification');
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate notifications queries to refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

