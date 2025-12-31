import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { createCalendarEvent } from '@/lib/google/calendar';
import { sendGmail, generateBookingConfirmationEmail } from '@/lib/google/gmail';

interface BookingConfig {
  duration: number;
  bufferTime?: number;
  availability: {
    timezone: string;
    schedule: {
      [day: string]: { start: string; end: string }[];
    };
  };
  dateRange?: {
    start: string;
    end: string;
  };
  formFields?: {
    name: string;
    type: string;
    label: string;
    required: boolean;
  }[];
  eventTitle?: string;
  eventDescription?: string;
}

interface BookingInstance {
  id: string;
  attendeeName: string;
  attendeeEmail: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'cancelled';
  googleEventId?: string;
  additionalInfo?: Record<string, any>;
  createdAt: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const artifactId = parseInt(id);
    const body = await req.json();

    const {
      startTime,
      attendeeName,
      attendeeEmail,
      additionalInfo
    } = body;

    // Validate required fields
    if (!startTime || !attendeeName || !attendeeEmail) {
      return Response.json(
        { error: 'Missing required fields: startTime, attendeeName, attendeeEmail' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(attendeeEmail)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Fetch the booking artifact with user and assistant info
    const artifact = await prisma.assistantArtifact.findUnique({
      where: { id: artifactId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assistant: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!artifact) {
      return Response.json({ error: 'Artifact not found' }, { status: 404 });
    }

    if (artifact.category !== 'booking') {
      return Response.json({ error: 'Artifact is not a booking type' }, { status: 400 });
    }

    const tools = artifact.tools as any;
    const bookingConfig = tools?.bookingConfig as BookingConfig;
    const bookings = (tools?.bookings || []) as BookingInstance[];

    if (!bookingConfig) {
      return Response.json({ error: 'Invalid booking configuration' }, { status: 400 });
    }

    // Calculate end time based on duration
    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + bookingConfig.duration * 60 * 1000);

    // Check if the slot is still available
    const isBooked = bookings.some(booking => {
      if (booking.status === 'cancelled') return false;

      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);

      return (
        startDate.getTime() < bookingEnd.getTime() &&
        endDate.getTime() > bookingStart.getTime()
      );
    });

    if (isBooked) {
      return Response.json(
        { error: 'This time slot is no longer available' },
        { status: 409 }
      );
    }

    // Find the user's Google connector
    const googleConnector = await prisma.connector.findFirst({
      where: {
        userId: artifact.userId,
        provider: 'GOOGLE',
        status: 'ACTIVE',
        deletedAt: null
      }
    });

    if (!googleConnector) {
      return Response.json(
        { error: 'Google Calendar not connected. Host needs to connect their Google account.' },
        { status: 400 }
      );
    }

    // Create the booking instance
    const bookingId = nanoid();
    const newBooking: BookingInstance = {
      id: bookingId,
      attendeeName,
      attendeeEmail,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      status: 'confirmed',
      additionalInfo,
      createdAt: new Date().toISOString()
    };

    try {
      // Create Google Calendar event
      const eventTitle = bookingConfig.eventTitle ||
        `Booking with ${artifact.user.name || 'Host'}`;
      const eventDescription = bookingConfig.eventDescription ||
        `Booked via ${artifact.assistant.name} on B-Master`;

      const calendarEvent = await createCalendarEvent(googleConnector.id, {
        summary: eventTitle,
        description: eventDescription,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        attendeeEmail,
        attendeeName,
        timezone: bookingConfig.availability.timezone,
        organizerEmail: artifact.user.email || undefined
      });

      // Add Google event ID to booking
      newBooking.googleEventId = calendarEvent.eventId;

      // Send confirmation email to attendee
      try {
        const emailHtml = generateBookingConfirmationEmail({
          attendeeName,
          hostName: artifact.user.name || 'Your Host',
          eventTitle,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          timezone: bookingConfig.availability.timezone,
          meetLink: calendarEvent.meetLink,
          eventLink: calendarEvent.htmlLink,
          additionalInfo: additionalInfo ? JSON.stringify(additionalInfo, null, 2) : undefined
        });

        await sendGmail(googleConnector.id, {
          to: attendeeEmail,
          toName: attendeeName,
          subject: `Booking Confirmed: ${eventTitle}`,
          htmlBody: emailHtml
        });

        console.log('✅ Confirmation email sent to:', attendeeEmail);
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the booking if email fails - calendar invite is enough
      }

      // Update the artifact with the new booking
      const updatedBookings = [...bookings, newBooking];

      await prisma.assistantArtifact.update({
        where: { id: artifactId },
        data: {
          tools: {
            ...tools,
            bookings: updatedBookings
          }
        }
      });

      console.log('✅ Booking created successfully:', bookingId);

      return Response.json({
        success: true,
        booking: {
          id: newBooking.id,
          startTime: newBooking.startTime,
          endTime: newBooking.endTime,
          attendeeName: newBooking.attendeeName,
          attendeeEmail: newBooking.attendeeEmail,
          status: newBooking.status,
          meetLink: calendarEvent.meetLink,
          calendarLink: calendarEvent.htmlLink
        }
      });
    } catch (error: any) {
      console.error('Booking creation error:', error);

      // Return specific error messages
      if (error.message.includes('Google authentication expired')) {
        return Response.json(
          { error: 'Host\'s Google Calendar connection has expired. Please contact the host.' },
          { status: 500 }
        );
      }

      throw error;
    }
  } catch (error) {
    console.error('Booking API error:', error);
    return Response.json(
      { error: 'Failed to create booking. Please try again.' },
      { status: 500 }
    );
  }
}
