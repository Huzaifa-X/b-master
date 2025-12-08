import Pusher from 'pusher';

// Validate environment variables
const requiredEnvVars = {
  PUSHER_APP_ID: process.env.PUSHER_APP_ID,
  PUSHER_KEY: process.env.PUSHER_KEY,
  PUSHER_SECRET: process.env.PUSHER_SECRET,
  PUSHER_CLUSTER: process.env.PUSHER_CLUSTER
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('Missing Pusher environment variables:', missingVars);
  console.error('Please add these to your .env.local file');
}

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true
});

/**
 * Send notification to a specific user's private channel
 * @param userId - The user ID to send the notification to
 * @param eventName - The event name
 * @param data - The notification data
 */
export const sendNotification = async (userId: string, eventName: string, data: any): Promise<void> => {
  try {
    if (!process.env.PUSHER_SECRET) {
      console.warn('Pusher not configured - skipping real-time notification');
      return;
    }

    // Use private channel format: private-user-{userId}
    const channelName = `private-user-${userId}`;
    await pusher.trigger(channelName, eventName, data);
    console.log(`Notification sent to user ${userId}: ${eventName}`);
  } catch (error) {
    console.error('Pusher error:', error);
    console.warn('Real-time notification failed, but saved to database');
  }
};

/**
 * Get the notification channel name for a user
 */
export const getUserNotificationChannel = (userId: string): string => {
  return `private-user-${userId}`;
};

export default pusher;