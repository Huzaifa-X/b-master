import { google } from 'googleapis';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { refreshGoogleToken } from './refresh-token';

interface SendEmailParams {
  to: string;
  toName: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export async function sendGmail(
  connectorId: number,
  params: SendEmailParams
): Promise<string> {
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

    // Initialize Gmail API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get sender email from connector
    const fromEmail = connector.providerEmail || 'noreply@example.com';
    const fromName = (connector.metadata as any)?.name || 'B-Master';

    // Create email message
    const emailLines = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${params.toName} <${params.to}>`,
      `Subject: ${params.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      params.htmlBody
    ];

    const email = emailLines.join('\r\n');

    // Encode email in base64url format
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log('Sending email via Gmail:', {
      to: params.to,
      subject: params.subject
    });

    // Send the email
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });

    console.log('✅ Email sent successfully:', response.data.id);

    return response.data.id!;
  } catch (error: any) {
    console.error('Gmail send error:', error);

    // Handle specific Google API errors
    if (error.code === 401) {
      // Token invalid, mark connector as expired
      await prisma.connector.update({
        where: { id: connectorId },
        data: { status: 'EXPIRED' }
      });
      throw new Error('Google authentication expired. Please reconnect your account.');
    }

    throw new Error(`Failed to send email: ${error.message}`);
  }
}

// Helper function to generate booking confirmation email HTML
export function generateBookingConfirmationEmail(params: {
  attendeeName: string;
  hostName: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
  timezone: string;
  meetLink?: string;
  eventLink?: string;
  additionalInfo?: string;
}): string {
  const startDate = new Date(params.startTime);
  const endDate = new Date(params.endTime);

  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: params.timezone
  });

  const formattedStartTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: params.timezone
  });

  const formattedEndTime = endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: params.timezone
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #333333; font-size: 28px;">Booking Confirmed! ✓</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">
                Hi ${params.attendeeName},
              </p>

              <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.5;">
                Your booking with <strong>${params.hostName}</strong> has been confirmed!
              </p>

              <!-- Event Details Box -->
              <div style="background-color: #f8f9fa; border-left: 4px solid #4CAF50; padding: 20px; margin: 0 0 30px; border-radius: 4px;">
                <h2 style="margin: 0 0 15px; color: #333333; font-size: 20px;">${params.eventTitle}</h2>

                <p style="margin: 0 0 10px; color: #555555; font-size: 15px;">
                  <strong>📅 Date:</strong> ${formattedDate}
                </p>

                <p style="margin: 0 0 10px; color: #555555; font-size: 15px;">
                  <strong>🕐 Time:</strong> ${formattedStartTime} - ${formattedEndTime} (${params.timezone})
                </p>

                ${params.meetLink ? `
                <p style="margin: 10px 0 0; color: #555555; font-size: 15px;">
                  <strong>🎥 Meeting Link:</strong><br>
                  <a href="${params.meetLink}" style="color: #1a73e8; text-decoration: none; word-break: break-all;">${params.meetLink}</a>
                </p>
                ` : ''}
              </div>

              ${params.additionalInfo ? `
              <div style="background-color: #fff8e1; border-left: 4px solid #FFC107; padding: 15px; margin: 0 0 30px; border-radius: 4px;">
                <p style="margin: 0; color: #555555; font-size: 14px; line-height: 1.5;">
                  <strong>📝 Additional Information:</strong><br>
                  ${params.additionalInfo}
                </p>
              </div>
              ` : ''}

              ${params.eventLink ? `
              <p style="margin: 0 0 20px; text-align: center;">
                <a href="${params.eventLink}" style="display: inline-block; padding: 12px 30px; background-color: #1a73e8; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold;">View in Google Calendar</a>
              </p>
              ` : ''}

              <p style="margin: 20px 0 0; color: #666666; font-size: 14px; line-height: 1.5;">
                A calendar invitation has been sent to your email. If you need to reschedule or cancel, please contact ${params.hostName} directly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                This email was sent by B-Master. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
