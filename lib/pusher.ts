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
  } catch (error: any) {
    // Detect clock-skew 401 specifically and give an actionable message
    const body: string = error?.body ?? error?.message ?? '';
    if (error?.status === 401 && body.includes('Timestamp expired')) {
      const match = body.match(/Given timestamp \((.+?)\).*server time \((.+?)\)/);
      const hint = match
        ? `Server clock is off by ~${Math.round((new Date(match[1]).getTime() - new Date(match[2]).getTime()) / 60000)} minutes.`
        : 'Server clock is out of sync with Pusher.';
      console.warn(
        `[Pusher] Clock skew detected – ${hint}\n` +
        `  Fix on Docker/WSL2 : wsl --shutdown  (then restart)\n` +
        `  Fix on bare Linux   : sudo ntpdate -u pool.ntp.org\n` +
        `  Fix on Windows      : Settings → Time & Language → Sync now\n` +
        `  Notification was saved to DB and will appear on next page load.`
      );
      return;
    }
    console.error('[Pusher] Failed to send real-time notification:', error);
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