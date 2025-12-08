'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePusher } from '@/hooks/usePusher';
import { useNotifications } from '@/context/notificationContext';
import {
  PusherNotificationPayload,
  PusherNotificationReadPayload,
  PusherNotificationsAllReadPayload,
  PusherNotificationDeletedPayload
} from '@/types/notification';
import { Channel } from 'pusher-js';

export default function NotificationListener() {
  const { data: session } = useSession();
  const pusher = usePusher();
  const { addNotification, markAsRead, markAllAsRead, removeNotification } = useNotifications();

  useEffect(() => {
    if (!pusher || !session?.user?.id) return;

    // Subscribe to user-specific private channel
    const channelName = `private-user-${session.user.id}`;
    const channel: Channel = pusher.subscribe(channelName);

    // Listen for new notifications
    channel.bind('notification', (data: PusherNotificationPayload) => {
      console.log('📩 New notification:', data);
      addNotification(data.notification);
      
      // Optional: Show toast notification
      // toast.success(data.notification.title);
    });

    // Listen for notification read
    channel.bind('notification-read', (data: PusherNotificationReadPayload) => {
      console.log('✅ Notification marked as read:', data);
      markAsRead(data.notificationId);
    });

    // Listen for all notifications read
    channel.bind('notifications-all-read', (data: PusherNotificationsAllReadPayload) => {
      console.log('✅ All notifications marked as read');
      markAllAsRead();
    });

    // Listen for notification deleted
    channel.bind('notification-deleted', (data: PusherNotificationDeletedPayload) => {
      console.log('🗑️ Notification deleted:', data);
      removeNotification(data.notificationId);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [pusher, session?.user?.id, addNotification, markAsRead, markAllAsRead, removeNotification]);

  return null; // This is a listener component, no UI
}