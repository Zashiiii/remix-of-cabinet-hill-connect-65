import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  recipientEmail: string;
  residentName: string;
  certificateType: string;
  status: string;
  controlNumber: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== Send Notification Email Function Started ===");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: NotificationRequest = await req.json();
    console.log("Request body:", JSON.stringify(body));

    const { recipientEmail, residentName, certificateType, status, controlNumber, notes } = body;

    if (!recipientEmail || !residentName || !certificateType || !status || !controlNumber) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const isApproved = status.toLowerCase() === "approved";
    const statusText = isApproved ? "APPROVED" : "REJECTED";
    const statusColor = isApproved ? "#22c55e" : "#ef4444";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #1a1a1a; margin: 0; font-size: 24px;">Barangay Certificate Request Update</h1>
            </div>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
              Dear <strong>${residentName}</strong>,
            </p>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
              Your certificate request has been processed. Here are the details:
            </p>
            
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Control Number:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 600;">${controlNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Certificate Type:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">${certificateType}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Status:</td>
                  <td style="padding: 8px 0;">
                    <span style="background-color: ${statusColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                      ${statusText}
                    </span>
                  </td>
                </tr>
                ${notes ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Notes:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">${notes}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            ${isApproved ? `
            <div style="background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #166534; font-size: 14px;">
                <strong>Next Steps:</strong> Please visit the Barangay Hall during office hours to claim your certificate. Don't forget to bring a valid ID.
              </p>
            </div>
            ` : `
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #991b1b; font-size: 14px;">
                <strong>What to do:</strong> Please review the notes above and visit the Barangay Hall for assistance if you have questions about the rejection.
              </p>
            </div>
            `}
            
            <p style="color: #4a4a4a; font-size: 14px; line-height: 1.5; margin-top: 24px;">
              Thank you for using our online services.
            </p>
            
            <p style="color: #4a4a4a; font-size: 14px; line-height: 1.5;">
              Best regards,<br>
              <strong>Barangay Office</strong>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log("Sending email to:", recipientEmail);
    
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Barangay Office <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: `Certificate Request ${statusText} - ${controlNumber}`,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailData);
      return new Response(
        JSON.stringify({ error: emailData.message || "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, data: emailData }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending notification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
