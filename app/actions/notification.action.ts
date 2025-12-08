'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import NotificationService from '@/lib/services/notifactionService';
import prisma from '@/lib/prisma';

/**
 * Check if user is logging in for the first time and send welcome notification
 */
export async function checkAndSendWelcomeNotification(userId: string): Promise<void> {
  try {
    // Check if user already has a welcome notification
    // We'll check by looking for notifications with the welcome title
    const welcomeNotification = await prisma.notification.findFirst({
      where: {
        userId: BigInt(userId),
        title: {
          contains: 'Welcome to B Master'
        }
      }
    });

    // If welcome notification already exists, don't send again
    if (welcomeNotification) {
      return;
    }

    // Check if user has previous sessions (more reliable way to detect first login)
    // Count all sessions for this user
    const allSessions = await prisma.session.findMany({
      where: {
        userId: BigInt(userId)
      },
      orderBy: {
        expires: 'desc'
      }
    });

    // If this is the first or second session (current + maybe one expired), it's likely first login
    // Also check if user has any other notifications
    const totalNotifications = await prisma.notification.count({
      where: {
        userId: BigInt(userId)
      }
    });

    // If no notifications and minimal sessions, send welcome notification
    if (totalNotifications === 0 && allSessions.length <= 2) {
      await NotificationService.createNotification({
        userId,
        title: '🎉 Welcome to B Master!',
        message: 'Welcome to our platform! Please complete your profile and explore our plans to get started.',
        type: 'welcome_notification',
        relatedId: null,
        relatedType: null,
        data: {
          isWelcome: true,
          message: 'Welcome to B Master! Complete your profile and see our plans.'
        }
      });
    }
  } catch (error) {
    console.error('Error sending welcome notification:', error);
    // Don't throw - this shouldn't block login
  }
}

/**
 * Get user notifications with pagination
 */
export async function getUserNotifications(options: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized'
      };
    }

    const result = await NotificationService.getUserNotifications(
      session.user.id,
      options
    );

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return {
      success: false,
      error: 'Failed to get notifications'
    };
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized',
        count: 0
      };
    }

    const count = await NotificationService.getUnreadCount(session.user.id);

    return {
      success: true,
      count
    };
  } catch (error) {
    console.error('Error getting unread count:', error);
    return {
      success: false,
      error: 'Failed to get unread count',
      count: 0
    };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized'
      };
    }

    await NotificationService.markAsRead(notificationId, session.user.id);

    return {
      success: true
    };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return {
      success: false,
      error: 'Failed to mark notification as read'
    };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized'
      };
    }

    await NotificationService.markAllAsRead(session.user.id);

    return {
      success: true
    };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return {
      success: false,
      error: 'Failed to mark all notifications as read'
    };
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized'
      };
    }

    await NotificationService.deleteNotification(notificationId, session.user.id);

    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return {
      success: false,
      error: 'Failed to delete notification'
    };
  }
}

