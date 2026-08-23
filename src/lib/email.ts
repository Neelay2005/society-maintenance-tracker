import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.EMAIL_FROM || "Society Tracker <onboarding@resend.dev>";
const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

interface SendStatusChangeEmailOptions {
  to: string;
  residentName: string;
  complaintId: string;
  title: string;
  newStatus: string;
  notes?: string | null;
}

export async function sendStatusChangeEmail({
  to,
  residentName,
  complaintId,
  title,
  newStatus,
  notes,
}: SendStatusChangeEmailOptions) {
  try {
    if (!resendApiKey || !resend) {
      console.log(`[EMAIL SIMULATOR - Status Change] To: ${to} | Complaint #${complaintId} | New Status: ${newStatus}`);
      return { success: true, simulated: true };
    }

    const complaintLink = `${appUrl}/resident/dashboard`;
    const formattedStatus = newStatus.replace("_", " ");

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px;">
        <h2 style="color: #6366f1; margin-bottom: 8px;">Complaint Status Update</h2>
        <p>Dear <strong>${residentName}</strong>,</p>
        <p>Your maintenance complaint status has been updated:</p>
        
        <div style="background-color: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #334155;">
          <p style="margin: 0 0 8px 0;"><strong>Complaint ID:</strong> #${complaintId.slice(-6).toUpperCase()}</p>
          <p style="margin: 0 0 8px 0;"><strong>Title:</strong> ${title}</p>
          <p style="margin: 0 0 8px 0;"><strong>New Status:</strong> <span style="color: #38bdf8; font-weight: bold;">${formattedStatus}</span></p>
          ${notes ? `<p style="margin: 8px 0 0 0; color: #cbd5e1;"><em>Admin Note: "${notes}"</em></p>` : ""}
        </div>

        <p>
          <a href="${complaintLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Complaint Details
          </a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;" />
        <p style="font-size: 12px; color: #64748b;">Society Maintenance Tracker System</p>
      </div>
    `;

    const response = await resend.emails.send({
      from: fromEmail,
      to,
      subject: `Complaint #${complaintId.slice(-6).toUpperCase()} Status Updated to ${formattedStatus}`,
      html: htmlContent,
    });

    console.log(`[Resend Email Sent] Status change email sent to ${to}:`, response);
    return { success: true, data: response };
  } catch (error) {
    // IMPORTANT: Email failure must NEVER throw or break DB operation
    console.error(`[Resend Email Error - Status Change] Failed to send email to ${to}:`, error);
    return { success: false, error };
  }
}

interface SendImportantNoticeEmailOptions {
  to: string;
  residentName: string;
  noticeTitle: string;
  noticeContent: string;
}

export async function sendImportantNoticeEmail({
  to,
  residentName,
  noticeTitle,
  noticeContent,
}: SendImportantNoticeEmailOptions) {
  try {
    if (!resendApiKey || !resend) {
      console.log(`[EMAIL SIMULATOR - Important Notice] To: ${to} | Notice: "${noticeTitle}"`);
      return { success: true, simulated: true };
    }

    const noticesLink = `${appUrl}/notices`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px;">
        <h2 style="color: #ef4444; margin-bottom: 8px;">🚨 Important Society Announcement</h2>
        <p>Hello <strong>${residentName}</strong>,</p>
        <p>An important notice has been posted on the society notice board:</p>
        
        <div style="background-color: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #ef4444;">
          <h3 style="margin: 0 0 8px 0; color: #f8fafc;">${noticeTitle}</h3>
          <p style="margin: 0; color: #cbd5e1; line-height: 1.5;">${noticeContent}</p>
        </div>

        <p>
          <a href="${noticesLink}" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Open Notice Board
          </a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;" />
        <p style="font-size: 12px; color: #64748b;">Society Maintenance Tracker System</p>
      </div>
    `;

    const response = await resend.emails.send({
      from: fromEmail,
      to,
      subject: `🚨 IMPORTANT NOTICE: ${noticeTitle}`,
      html: htmlContent,
    });

    console.log(`[Resend Email Sent] Notice email sent to ${to}:`, response);
    return { success: true, data: response };
  } catch (error) {
    // IMPORTANT: Email failure must NEVER throw or break DB operation
    console.error(`[Resend Email Error - Notice] Failed to send email to ${to}:`, error);
    return { success: false, error };
  }
}
