import nodemailer from 'nodemailer'

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
})

interface SendOTPEmailParams {
    email: string
    name: string
    otp: string
}

export async function sendOTPEmail({ email, name, otp }: SendOTPEmailParams) {
    try {
        const info = await transporter.sendMail({
            from: `"B-Master" <${process.env.SMTP_FROM}>`,
            to: email,
            subject: 'Verify Your Email - B-Master',
            html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px 40px; text-align: center;">
                        <h1 style="margin: 0; color: #333333; font-size: 28px;">Welcome to B-Master!</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 0 40px 20px 40px;">
                        <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 24px;">
                          Hi ${name},
                        </p>
                        <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 24px;">
                          Thank you for signing up! Please verify your email address by entering the code below:
                        </p>
                      </td>
                    </tr>
                    
                    <!-- OTP Box -->
                    <tr>
                      <td style="padding: 0 40px 30px 40px;" align="center">
                        <div style="background-color: #f8f9fa; border: 2px dashed #e0e0e0; border-radius: 8px; padding: 20px; display: inline-block;">
                          <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                            Your Verification Code
                          </p>
                          <p style="margin: 0; color: #2563eb; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                            ${otp}
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Additional Info -->
                    <tr>
                      <td style="padding: 0 40px 30px 40px;">
                        <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 20px;">
                          This code will expire in <strong>10 minutes</strong>.
                        </p>
                        <p style="margin: 0; color: #666666; font-size: 14px; line-height: 20px;">
                          If you didn't request this code, please ignore this email.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
                        <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                          © ${new Date().getFullYear()} B-Master. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
        })

        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.error('Email sending error:', error)
        return { success: false, error }
    }
}

export function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
}