import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface TicketCreatedEmailParams {
  ticketNumber: string;
  userEmail: string;
  userName?: string;
  subject: string;
  description: string;
  priority: string;
  category?: string;
}

interface TicketStatusChangeEmailParams {
  ticketNumber: string;
  userEmail: string;
  userName?: string;
  subject: string;
  newStatus: string;
  ticketUrl: string;
}

// Send email to support team when new ticket is created
export async function sendTicketCreatedNotification(params: TicketCreatedEmailParams) {
  const {
    ticketNumber,
    userEmail,
    userName,
    subject,
    description,
    priority,
    category,
  } = params;

  const supportEmail = process.env.SUPPORT_EMAIL || 'support@example.com';
  const fromEmail = process.env.FROM_EMAIL || 'notifications@example.com';

  try {
    await resend.emails.send({
      from: fromEmail,
      to: supportEmail,
      subject: `[New Ticket] ${ticketNumber} - ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #2563eb, #4f46e5); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Support Ticket</h1>
          </div>

          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
              <h2 style="margin-top: 0; color: #111827; font-size: 18px;">Ticket Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Ticket Number:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: bold;">${ticketNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Priority:</td>
                  <td style="padding: 8px 0;">
                    <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; ${
                      priority === 'high' ? 'background: #fef2f2; color: #991b1b;' :
                      priority === 'medium' ? 'background: #fff7ed; color: #9a3412;' :
                      'background: #f0fdf4; color: #166534;'
                    }">${priority}</span>
                  </td>
                </tr>
                ${category ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Category:</td>
                  <td style="padding: 8px 0; color: #111827;">${category}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">From:</td>
                  <td style="padding: 8px 0; color: #111827;">${userName || 'Not provided'} (${userEmail})</td>
                </tr>
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
              <h3 style="margin-top: 0; color: #111827; font-size: 16px;">Subject</h3>
              <p style="margin: 0; color: #374151;">${subject}</p>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
              <h3 style="margin-top: 0; color: #111827; font-size: 16px;">Description</h3>
              <p style="margin: 0; color: #374151; white-space: pre-wrap;">${description}</p>
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/tickets"
                 style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                View in Admin Dashboard
              </a>
            </div>
          </div>

          <div style="text-align: center; padding: 16px; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">This is an automated notification from your support ticket system.</p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending ticket notification email:', error);
    return { success: false, error };
  }
}

// Send email to user when ticket status changes
export async function sendTicketStatusChangeNotification(params: TicketStatusChangeEmailParams) {
  const {
    ticketNumber,
    userEmail,
    userName,
    subject,
    newStatus,
    ticketUrl,
  } = params;

  const fromEmail = process.env.FROM_EMAIL || 'notifications@example.com';

  const statusMessages: { [key: string]: string } = {
    open: 'Your ticket has been received and is awaiting review.',
    in_progress: 'Our support team is now working on your ticket.',
    resolved: 'Your ticket has been resolved! Please review the solution.',
    closed: 'Your ticket has been closed. Thank you for contacting support.',
  };

  try {
    await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: `Ticket Update: ${ticketNumber} - ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #2563eb, #4f46e5); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Ticket Status Update</h1>
          </div>

          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">
                Hello ${userName || 'there'},
              </p>
              <p style="margin: 0 0 16px 0; color: #374151;">
                Your support ticket <strong>${ticketNumber}</strong> has been updated.
              </p>

              <div style="background: #eff6ff; padding: 16px; border-left: 4px solid #2563eb; border-radius: 4px; margin: 16px 0;">
                <p style="margin: 0; color: #1e40af; font-weight: 600;">New Status: ${newStatus.replace('_', ' ').toUpperCase()}</p>
                <p style="margin: 8px 0 0 0; color: #374151; font-size: 14px;">${statusMessages[newStatus]}</p>
              </div>

              <div style="margin-top: 16px;">
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Subject:</p>
                <p style="margin: 0; color: #111827;">${subject}</p>
              </div>
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <a href="${ticketUrl}"
                 style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                View Ticket
              </a>
            </div>

            ${newStatus === 'resolved' ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 16px; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px;">
                If this doesn't solve your issue, please reply to your ticket or create a new one.
              </p>
            </div>
            ` : ''}
          </div>

          <div style="text-align: center; padding: 16px; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">This is an automated notification. Please do not reply to this email.</p>
            <p style="margin: 8px 0 0 0;">For support questions, please visit our support portal or create a new ticket.</p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending status change email:', error);
    return { success: false, error };
  }
}

// Send confirmation email to user when ticket is created
export async function sendTicketConfirmationEmail(params: TicketCreatedEmailParams) {
  const {
    ticketNumber,
    userEmail,
    userName,
    subject,
    description,
    priority,
    category,
  } = params;

  const fromEmail = process.env.FROM_EMAIL || 'notifications@example.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const ticketUrl = `${appUrl}/tickets/${ticketNumber}`;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: `Ticket Created: ${ticketNumber} - ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #2563eb, #4f46e5); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Ticket Received</h1>
          </div>

          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">
                Hello ${userName || 'there'},
              </p>
              <p style="margin: 0 0 16px 0; color: #374151;">
                Thank you for contacting support. We've received your ticket and our team will review it shortly.
              </p>

              <div style="background: #eff6ff; padding: 16px; border-left: 4px solid #2563eb; border-radius: 4px; margin: 16px 0;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Your Ticket Number</p>
                <p style="margin: 4px 0 0 0; color: #1e40af; font-size: 20px; font-weight: 700;">${ticketNumber}</p>
              </div>

              <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Subject:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 500;">${subject}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Priority:</td>
                  <td style="padding: 8px 0; color: #111827;">${priority.charAt(0).toUpperCase() + priority.slice(1)}</td>
                </tr>
                ${category ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Category:</td>
                  <td style="padding: 8px 0; color: #111827;">${category}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #bbf7d0;">
              <p style="margin: 0 0 8px 0; color: #166534; font-weight: 600;">What happens next?</p>
              <p style="margin: 0; color: #166534; font-size: 14px;">
                Our support team will review your ticket and respond as soon as possible. You'll receive an email notification when your ticket status changes.
              </p>
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <a href="${ticketUrl}"
                 style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                View Your Ticket
              </a>
            </div>
          </div>

          <div style="text-align: center; padding: 16px; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">Need immediate help? Try our <a href="${appUrl}" style="color: #2563eb;">AI chatbot</a> for instant answers.</p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return { success: false, error };
  }
}
