import { google } from 'googleapis';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { refreshGoogleToken } from './refresh-token';

interface CreateEventParams {
  summary: string;
  description?: string;
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
  attendeeEmail: string;
  attendeeName: string;
  timezone: string;
  organizerEmail?: string;
}

interface EventResponse {
  eventId: string;
  meetLink?: string;
  htmlLink: string;
}

export async function createCalendarEvent(
  connectorId: number,
  params: CreateEventParams
): Promise<EventResponse> {
  try {
    // Get connector from database
    const connector = await prisma.connector.findUnique({
      where: { id: connectorId }
    });

    if (!connector || connector.provider !== 'GOOGLE') {
      throw new Error('Invalid Google connector');
    }

    if (connector.status !== 'ACTIVE') {
      throw new Error('Google connector is not active');
    }

    // Check if token is expired and refresh if needed
    let accessToken = decrypt(connector.accessToken);

    if (connector.tokenExpiry < new Date()) {
      console.log('Token expired, refreshing...');
      accessToken = await refreshGoogleToken(connectorId);
    }

    // Initialize Google Calendar API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Create the event
    const event = {
      summary: params.summary,
      description: params.description,
      start: {
        dateTime: params.startTime,
        timeZone: params.timezone,
      },
      end: {
        dateTime: params.endTime,
        timeZone: params.timezone,
      },
      attendees: [
        {
          email: params.attendeeEmail,
          displayName: params.attendeeName,
          responseStatus: 'needsAction'
        }
      ],
      conferenceData: {
        createRequest: {
          requestId: `booking-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
      },
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      sendUpdates: 'all' // Send email invitations to attendees
    };

    console.log('Creating Google Calendar event:', {
      summary: params.summary,
      start: params.startTime,
      attendee: params.attendeeEmail
    });

    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: event,
      sendUpdates: 'all'
    });

    console.log('✅ Calendar event created:', response.data.id);

    return {
      eventId: response.data.id!,
      meetLink: response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri || undefined,
      htmlLink: response.data.htmlLink!
    };
  } catch (error: any) {
    console.error('Calendar event creation error:', error);

    // Handle specific Google API errors
    if (error.code === 401) {
      // Token invalid, mark connector as expired
      await prisma.connector.update({
        where: { id: connectorId },
        data: { status: 'EXPIRED' }
      });
      throw new Error('Google authentication expired. Please reconnect your account.');
    }

    throw new Error(`Failed to create calendar event: ${error.message}`);
  }
}

export async function cancelCalendarEvent(
  connectorId: number,
  eventId: string
): Promise<void> {
  try {
    const connector = await prisma.connector.findUnique({
      where: { id: connectorId }
    });

    if (!connector || connector.provider !== 'GOOGLE') {
      throw new Error('Invalid Google connector');
    }

    // Check if token is expired and refresh if needed
    let accessToken = decrypt(connector.accessToken);

    if (connector.tokenExpiry < new Date()) {
      accessToken = await refreshGoogleToken(connectorId);
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Cancel the event (delete it)
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
      sendUpdates: 'all' // Notify attendees
    });

    console.log('✅ Calendar event cancelled:', eventId);
  } catch (error: any) {
    console.error('Calendar event cancellation error:', error);
    throw new Error(`Failed to cancel calendar event: ${error.message}`);
  }
}
