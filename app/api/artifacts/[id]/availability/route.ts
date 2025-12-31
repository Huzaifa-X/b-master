import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

interface BookingConfig {
  duration: number; // in minutes
  bufferTime?: number; // in minutes
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
}

interface BookingInstance {
  id: string;
  attendeeName: string;
  attendeeEmail: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'cancelled';
  googleEventId?: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const artifactId = parseInt(id);
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date'); // Format: YYYY-MM-DD

    if (!date) {
      return Response.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    // Fetch the booking artifact
    const artifact = await prisma.assistantArtifact.findUnique({
      where: { id: artifactId }
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

    // Parse the requested date
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' });

    // Get the schedule for the requested day
    const daySchedule = bookingConfig.availability.schedule[dayOfWeek];

    if (!daySchedule || daySchedule.length === 0) {
      return Response.json({
        date,
        availableSlots: [],
        message: 'No availability on this day'
      });
    }

    // Check if date is within allowed range
    if (bookingConfig.dateRange) {
      const rangeStart = new Date(bookingConfig.dateRange.start);
      const rangeEnd = new Date(bookingConfig.dateRange.end);

      if (requestedDate < rangeStart || requestedDate > rangeEnd) {
        return Response.json({
          date,
          availableSlots: [],
          message: 'Date is outside booking range'
        });
      }
    }

    // Generate time slots
    const slots: string[] = [];
    const duration = bookingConfig.duration;
    const bufferTime = bookingConfig.bufferTime || 0;

    for (const timeRange of daySchedule) {
      const [startHour, startMinute] = timeRange.start.split(':').map(Number);
      const [endHour, endMinute] = timeRange.end.split(':').map(Number);

      let currentTime = new Date(requestedDate);
      currentTime.setHours(startHour, startMinute, 0, 0);

      const endTime = new Date(requestedDate);
      endTime.setHours(endHour, endMinute, 0, 0);

      while (currentTime.getTime() + (duration * 60 * 1000) <= endTime.getTime()) {
        const slotStart = new Date(currentTime);
        const slotEnd = new Date(currentTime.getTime() + (duration * 60 * 1000));

        // Check if this slot is already booked
        const isBooked = bookings.some(booking => {
          if (booking.status === 'cancelled') return false;

          const bookingStart = new Date(booking.startTime);
          const bookingEnd = new Date(booking.endTime);

          // Check for overlap
          return (
            slotStart.getTime() < bookingEnd.getTime() &&
            slotEnd.getTime() > bookingStart.getTime()
          );
        });

        if (!isBooked) {
          slots.push(slotStart.toISOString());
        }

        // Move to next slot (duration + buffer time)
        currentTime = new Date(currentTime.getTime() + ((duration + bufferTime) * 60 * 1000));
      }
    }

    return Response.json({
      date,
      timezone: bookingConfig.availability.timezone,
      duration: bookingConfig.duration,
      availableSlots: slots
    });
  } catch (error) {
    console.error('Availability check error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
