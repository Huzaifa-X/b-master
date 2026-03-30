import { sendNotification } from '@/lib/pusher';
import prisma from '@/lib/prisma';
import {
  CreateNotificationParams,
  Notification,
  PusherNotificationPayload,
  PusherNotificationReadPayload,
  PusherNotificationsAllReadPayload,
  PusherNotificationDeletedPayload
} from '@/types/notification';

class NotificationService {
  /**
   * Convert BigInt to string safely
   */
  private bigIntToString(value: bigint | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    return value.toString();
  }

  /**
   * Create and send a notification
   */
  async createNotification({
    userId,
    title,
    message,
    type,
    relatedId = null,
    relatedType = null,
    data = null
  }: CreateNotificationParams): Promise<Notification> {
    try {
      // 1. Save to database first
      const notification = await prisma.notification.create({
        data: {
          userId: BigInt(userId),
          title,
          message,
          type,
          relatedId: relatedId ? parseInt(relatedId, 10) : null,
          relatedType,
          data: data as any,
          isRead: false
        }
      });

      // 2. Get user info
      const user = await prisma.user.findUnique({
        where: { id: BigInt(userId) },
        select: { id: true, name: true, email: true }
      });

      // 3. Prepare notification data
      const notificationData: Notification = {
        id: notification.id.toString(),
        userId: this.bigIntToString(notification.userId)!,
        title: notification.title || '',
        message: notification.message || '',
        type: notification.type as any,
        relatedId: notification.relatedId?.toString() || null,
        relatedType: notification.relatedType,
        isRead: notification.isRead,
        data: notification.data as any,
        createdAt: notification.createdAt,
        user: user ? {
          id: this.bigIntToString(user.id)!,
          name: user.name || '',
          email: user.email
        } : null
      };

      // 4. Send real-time notification via Pusher to the specific user
      const payload: PusherNotificationPayload = {
        notification: notificationData,
        timestamp: new Date().toISOString()
      };

      await sendNotification(userId, 'notification', payload);

      return notificationData;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    try {
      const notification = await prisma.notification.findFirst({
        where: { 
          id: parseInt(notificationId, 10), 
          userId: BigInt(userId) 
        }
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      if (!notification.isRead) {
        await prisma.notification.update({
          where: { id: parseInt(notificationId, 10) },
          data: { isRead: true, readAt: new Date() }
        });

        // Send real-time update
        const payload: PusherNotificationReadPayload = {
          notificationId,
          userId,
          timestamp: new Date().toISOString()
        };

        await sendNotification(userId, 'notification-read', payload);
      }

      // Convert Prisma notification to TypeScript Notification type
      const user = await prisma.user.findUnique({
        where: { id: notification.userId },
        select: { id: true, name: true, email: true }
      });

      return {
        id: notification.id.toString(),
        userId: this.bigIntToString(notification.userId)!,
        title: notification.title || '',
        message: notification.message || '',
        type: notification.type as any,
        relatedId: notification.relatedId?.toString() || null,
        relatedType: notification.relatedType,
        isRead: notification.isRead,
        data: notification.data as any,
        createdAt: notification.createdAt,
        readAt: notification.readAt,
        user: user ? {
          id: this.bigIntToString(user.id)!,
          name: user.name || '',
          email: user.email
        } : null
      };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: { userId: BigInt(userId), isRead: false },
        data: { isRead: true, readAt: new Date() }
      });

      const payload: PusherNotificationsAllReadPayload = {
        userId,
        timestamp: new Date().toISOString()
      };

      await sendNotification(userId, 'notifications-all-read', payload);

      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notification = await prisma.notification.findFirst({
        where: { 
          id: parseInt(notificationId, 10), 
          userId: BigInt(userId) 
        }
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      await prisma.notification.delete({
        where: { id: parseInt(notificationId, 10) }
      });

      const payload: PusherNotificationDeletedPayload = {
        notificationId,
        userId,
        timestamp: new Date().toISOString()
      };

      await sendNotification(userId, 'notification-deleted', payload);

      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw new Error('Failed to delete notification');
    }
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await prisma.notification.count({
        where: { userId: BigInt(userId), isRead: false }
      });

      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw new Error('Failed to get unread count');
    }
  }

  /**
   * Get notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
  ) {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = options;
      const offset = (page - 1) * limit;

      const where = {
        userId: BigInt(userId),
        ...(unreadOnly && { isRead: false })
      };

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }),
        prisma.notification.count({ where })
      ]);

      // Convert Prisma notifications to TypeScript Notification type
      const records: Notification[] = notifications.map((notification) => ({
        id: notification.id.toString(),
        userId: this.bigIntToString(notification.userId)!,
        title: notification.title || '',
        message: notification.message || '',
        type: notification.type as any,
        relatedId: notification.relatedId?.toString() || null,
        relatedType: notification.relatedType,
        isRead: notification.isRead,
        data: notification.data as any,
        createdAt: notification.createdAt,
        readAt: notification.readAt,
        user: notification.user ? {
          id: this.bigIntToString(notification.user.id)!,
          name: notification.user.name || '',
          email: notification.user.email
        } : null
      }));

      return {
        records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw new Error('Failed to get user notifications');
    }
  }

  // ===== SPECIFIC NOTIFICATION TRIGGERS =====

  /**
   * 1. Assistant created notification
   */
  async notifyAssistantCreated(assistantId: string, creatorId: string): Promise<void> {
    try {
      const assistant = await prisma.assistant.findUnique({
        where: { id: BigInt(assistantId) }
      });

      if (!assistant) return;

      await this.createNotification({
        userId: creatorId,
        title: '🎉 Assistant Created Successfully!',
        message: `Your assistant "${assistant.name}" has been created and is now available.`,
        type: 'assistant_created',
        relatedId: assistantId,
        relatedType: 'assistant',
        data: {
          assistantName: assistant.name,
          image: assistant.image,
          assistantPrice: assistant.price.toString(),
          isPublic: assistant.public
        }
      });
    } catch (error) {
      console.error('Error notifying assistant created:', error);
    }
  }

  /**
   * 2a. Assistant purchased notification (to buyer)
   */
  async notifyAssistantPurchased(
    assistantId: string,
    buyerId: string,
    sellerId: string
  ): Promise<void> {
    try {
      const assistant = await prisma.assistant.findUnique({
        where: { id: BigInt(assistantId) },
        include: {
          owner: {
            select: { name: true, image: true }
          }
        }
      });

      if (!assistant) return;

      await this.createNotification({
        userId: buyerId,
        title: '🛒 Assistant Purchase Successful!',
        message: `You have successfully purchased "${assistant.name}" by ${assistant.owner?.name || 'Unknown'}. You can now start using it!`,
        type: 'assistant_purchased',
        relatedId: assistantId,
        relatedType: 'assistant',
        data: {
          assistantName: assistant.name,
          sellerName: assistant.owner?.name,
          image: assistant.image,
          price: assistant.price.toString()
        }
      });
    } catch (error) {
      console.error('Error notifying assistant purchased:', error);
    }
  }

  /**
   * 2b. Assistant sold notification (to seller)
   */
  async notifyAssistantSold(
    assistantId: string,
    buyerId: string,
    sellerId: string
  ): Promise<void> {
    try {
      const [assistant, buyer] = await Promise.all([
        prisma.assistant.findUnique({
          where: { id: BigInt(assistantId) }
        }),
        prisma.user.findUnique({
          where: { id: BigInt(buyerId) },
          select: { name: true, image: true }
        })
      ]);

      if (!assistant || !buyer) return;

      await this.createNotification({
        userId: sellerId,
        title: '💰 Your Assistant Was Sold!',
        message: `Great news! ${buyer.name} has purchased your assistant "${assistant.name}". You've earned $${assistant.price}!`,
        type: 'assistant_sold',
        relatedId: assistantId,
        relatedType: 'assistant',
        data: {
          assistantName: assistant.name,
          buyerName: buyer.name,
          image: assistant.image,
          price: assistant.price.toString(),
          earnings: assistant.price.toString()
        }
      });
    } catch (error) {
      console.error('Error notifying assistant sold:', error);
    }
  }

  /**
   * 3. Assistant shared notification
   */
  async notifyAssistantShared(
    assistantId: string,
    sharedUserId: string,
    sharerId: string
  ): Promise<void> {
    try {
      const [assistant, sharer] = await Promise.all([
        prisma.assistant.findUnique({
          where: { id: BigInt(assistantId) }
        }),
        prisma.user.findUnique({
          where: { id: BigInt(sharerId) },
          select: { name: true, image: true }
        })
      ]);

      if (!assistant || !sharer) return;

      await this.createNotification({
        userId: sharedUserId,
        title: '🤝 Assistant Shared With You!',
        message: `${sharer.name} has shared their assistant "${assistant.name}" with you. You can now access it with the permissions granted.`,
        type: 'assistant_shared',
        relatedId: assistantId,
        relatedType: 'assistant',
        data: {
          assistantName: assistant.name,
          sharerName: sharer.name,
          image: sharer.image,
          assistantId: assistantId
        }
      });
    } catch (error) {
      console.error('Error notifying assistant shared:', error);
    }
  }

  /**
   * 4. Artifact permission granted notification
   */
  async notifyArtifactPermissionGranted(
    userId: string,
    artifactId: string,
    assistantId: string,
    granterId: string,
    accessLevel: string
  ): Promise<void> {
    try {
      const [artifact, granter] = await Promise.all([
        prisma.assistantArtifact.findUnique({
          where: { id: parseInt(artifactId, 10) },
          select: { id: true, name: true }
        }),
        prisma.user.findUnique({
          where: { id: BigInt(granterId) },
          select: { id: true, name: true, image: true }
        })
      ]);

      if (!artifact || !granter) {
        console.error('Artifact or granter not found for notification');
        return;
      }

      const accessText = accessLevel === 'admin' ? 'admin access' : 
                        accessLevel === 'editor' ? 'edit access' : 'view access';

      await this.createNotification({
        userId,
        title: "🔐 Artifact Access Granted!",
        message: `${granter.name} has granted you ${accessText} to the artifact "${artifact.name}".`,
        type: 'artifact_permission_granted',
        relatedId: artifactId,
        relatedType: 'artifact',
        data: {
          artifactName: artifact.name,
          granterName: granter.name,
          image: granter.image,
          artifactId: artifactId,
          assistantId: assistantId,
          accessLevel: accessLevel
        }
      });
    } catch (error) {
      console.error('Error notifying artifact permission granted:', error);
    }
  }

  /**
   * 5. Artifact permission removed notification
   */
  async notifyArtifactPermissionRemoved(
    userId: string,
    artifactId: string,
    assistantId: string,
    removerId: string
  ): Promise<void> {
    try {
      const [artifact, remover] = await Promise.all([
        prisma.assistantArtifact.findUnique({
          where: { id: parseInt(artifactId, 10) },
          select: { id: true, name: true }
        }),
        prisma.user.findUnique({
          where: { id: BigInt(removerId) },
          select: { id: true, name: true, image: true }
        })
      ]);

      if (!artifact || !remover) {
        console.error('Artifact or remover not found for notification');
        return;
      }

      await this.createNotification({
        userId,
        title: "🚫 Artifact Access Removed",
        message: `${remover.name} has removed your access to the artifact "${artifact.name}".`,
        type: 'artifact_permission_removed',
        relatedId: artifactId,
        relatedType: 'artifact',
        data: {
          artifactName: artifact.name,
          removerName: remover.name,
          image: remover.image,
          artifactId: artifactId,
          assistantId: assistantId
        }
      });
    } catch (error) {
      console.error('Error notifying artifact permission removed:', error);
    }
  }

  /**
   * 6. Artifact created notification
   */
  async notifyArtifactCreated(
    artifactId: string,
    assistantId: string,
    creatorId: string,
    userIdsToNotify: string[] // Users with artifact permissions to notify
  ): Promise<void> {
    try {
      const [artifact, creator, assistant] = await Promise.all([
        prisma.assistantArtifact.findUnique({
          where: { id: parseInt(artifactId, 10) },
          select: { id: true, name: true, category: true }
        }),
        prisma.user.findUnique({
          where: { id: BigInt(creatorId) },
          select: { id: true, name: true, image: true }
        }),
        prisma.assistant.findUnique({
          where: { id: BigInt(assistantId) },
          select: { id: true, name: true }
        })
      ]);

      if (!artifact || !creator || !assistant) {
        console.error('Artifact, creator, or assistant not found for notification');
        return;
      }

      const isDeployedProject = artifact.category === 'Deployed Project';

      // Notify the creator
      await this.createNotification({
        userId: creatorId,
        title: isDeployedProject ? "🚀 Application Created Successfully!" : "✨ Artifact Created Successfully!",
        message: isDeployedProject 
          ? `Your application "${artifact.name}" has been successfully created and recorded. You can view it along with your artifacts.`
          : `Your artifact "${artifact.name}" has been created for the assistant "${assistant.name}".`,
        type: 'artifact_created',
        relatedId: artifactId,
        relatedType: 'artifact',
        data: {
          artifactName: artifact.name,
          artifactCategory: artifact.category,
          assistantName: assistant.name,
          assistantId: assistantId,
          artifactId: artifactId
        }
      });

      // Notify all users with artifact permissions (excluding creator)
      const uniqueUserIds = [...new Set(userIdsToNotify)].filter(id => id !== creatorId);
      
      for (const userId of uniqueUserIds) {
        await this.createNotification({
          userId,
          title: isDeployedProject ? "🆕 New Application Available!" : "🆕 New Artifact Available!",
          message: isDeployedProject
            ? `${creator.name} has launched a new application "${artifact.name}" for the assistant "${assistant.name}".`
            : `${creator.name} has created a new artifact "${artifact.name}" for the assistant "${assistant.name}".`,
          type: 'artifact_created',
          relatedId: artifactId,
          relatedType: 'artifact',
          data: {
            artifactName: artifact.name,
            artifactCategory: artifact.category,
            creatorName: creator.name,
            assistantName: assistant.name,
            assistantId: assistantId,
            artifactId: artifactId
          }
        }).catch((error) => {
          console.error(`Error notifying user ${userId} about artifact creation:`, error);
        });
      }
    } catch (error) {
      console.error('Error notifying artifact created:', error);
    }
  }
}

export default new NotificationService();