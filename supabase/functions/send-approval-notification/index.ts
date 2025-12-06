import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalNotificationRequest {
  recipientEmail: string;
  residentName: string;
  status: "approved" | "rejected";
  rejectionReason?: string;
  approvedBy?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ApprovalNotificationRequest = await req.json();
    console.log("Received approval notification request:", data);

    const { recipientEmail, residentName, status, rejectionReason, approvedBy } = data;

    if (!recipientEmail || !residentName || !status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const isApproved = status === "approved";
    const subject = isApproved 
      ? "Your Registration Has Been Approved!" 
      : "Registration Status Update";

    const emailHtml = isApproved ? `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f0fdf4; padding: 20px; border: 1px solid #bbf7d0; }
          .footer { background-color: #edf2f7; padding: 15px; text-align: center; font-size: 12px; color: #718096; border-radius: 0 0 8px 8px; }
          .success-badge { background-color: #16a34a; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">✅ Registration Approved!</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${residentName}</strong>,</p>
            <p><span class="success-badge">APPROVED</span></p>
            <p>Great news! Your resident registration has been approved by the Barangay administration.</p>
            <p>You can now log in to the Resident Portal using your registered email and password to access barangay services online.</p>
            <h3 style="color: #16a34a;">What you can do now:</h3>
            <ul>
              <li>Request certificates online</li>
              <li>Track your certificate requests</li>
              <li>View announcements</li>
              <li>Access your profile</li>
            </ul>
            ${approvedBy ? `<p><em>Approved by: ${approvedBy}</em></p>` : ''}
          </div>
          <div class="footer">
            <p>This is an automated notification from the Barangay Management System.</p>
          </div>
        </div>
      </body>
      </html>
    ` : `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #fef2f2; padding: 20px; border: 1px solid #fecaca; }
          .footer { background-color: #edf2f7; padding: 15px; text-align: center; font-size: 12px; color: #718096; border-radius: 0 0 8px 8px; }
          .rejected-badge { background-color: #dc2626; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Registration Status Update</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${residentName}</strong>,</p>
            <p><span class="rejected-badge">REJECTED</span></p>
            <p>We regret to inform you that your resident registration could not be approved at this time.</p>
            ${rejectionReason ? `
              <div style="background-color: #fee2e2; padding: 15px; border-radius: 6px; margin: 15px 0;">
                <strong>Reason:</strong><br/>
                ${rejectionReason}
              </div>
            ` : ''}
            <p>If you believe this was an error or would like to provide additional information, please visit the Barangay office during office hours.</p>
            <p>You may also submit a new registration with the correct or updated information.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from the Barangay Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Barangay System <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: subject,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Approval notification email sent:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-approval-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
