export type NotificationType =
  | 'assistant_created'
  | 'assistant_purchased'
  | 'assistant_sold'
  | 'assistant_shared'
  | 'assistant_refund'
  | 'assistant_refund_seller'
  | 'comment_added'
  | 'subscription_purchased'
  | 'artifact_created'
  | 'artifact_permission_granted'
  | 'artifact_permission_removed'
  | 'artifact_updated'
  | 'welcome_notification'
  | 'notification'
  | 'chat_message'
  | 'group_message'
  | 'artifact_deleted'
  | 'news_feed_post';

export interface NotificationData {
  [key: string]: any;
}

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedId?: string | null;
  relatedType?: string | null;
  data?: NotificationData | null;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedId: string | null;
  relatedType: string | null;
  isRead: boolean;
  data: NotificationData | null;
  createdAt: Date;
  readAt?: Date | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface PusherNotificationPayload {
  notification: Notification;
  timestamp: string;
}

export interface PusherNotificationReadPayload {
  notificationId: string;
  userId: string;
  timestamp: string;
}

export interface PusherNotificationDeletedPayload {
  notificationId: string;
  userId: string;
  timestamp: string;
}

export interface PusherNotificationsAllReadPayload {
  userId: string;
  timestamp: string;
}