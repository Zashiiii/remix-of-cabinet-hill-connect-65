import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegistrationNotificationRequest {
  residentName: string;
  email: string;
  contactNumber: string;
  address: string;
  birthDate: string;
  submittedAt: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: RegistrationNotificationRequest = await req.json();
    console.log("Received registration notification request:", data);

    const { residentName, email, contactNumber, address, birthDate, submittedAt } = data;

    // Admin notification email - using default onboarding@resend.dev for testing
    // In production, replace with actual admin email
    const adminEmail = "onboarding@resend.dev"; // Replace with actual admin email

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a365d; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f7fafc; padding: 20px; border: 1px solid #e2e8f0; }
          .info-row { padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
          .label { font-weight: bold; color: #4a5568; }
          .footer { background-color: #edf2f7; padding: 15px; text-align: center; font-size: 12px; color: #718096; border-radius: 0 0 8px 8px; }
          .urgent-badge { background-color: #f6ad55; color: #744210; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🆕 New Registration Request</h1>
            <p style="margin: 5px 0 0 0;">Resident Portal Registration</p>
          </div>
          <div class="content">
            <p><span class="urgent-badge">ACTION REQUIRED</span></p>
            <p>A new resident has submitted a registration request and is awaiting approval.</p>
            
            <h3 style="color: #2d3748; border-bottom: 2px solid #3182ce; padding-bottom: 8px;">Applicant Information</h3>
            
            <div class="info-row">
              <span class="label">Full Name:</span> ${residentName}
            </div>
            <div class="info-row">
              <span class="label">Email:</span> ${email}
            </div>
            <div class="info-row">
              <span class="label">Contact Number:</span> ${contactNumber}
            </div>
            <div class="info-row">
              <span class="label">Address:</span> ${address}
            </div>
            <div class="info-row">
              <span class="label">Birth Date:</span> ${birthDate}
            </div>
            <div class="info-row">
              <span class="label">Submitted At:</span> ${submittedAt}
            </div>

            <p style="margin-top: 20px;">Please review this registration in the admin dashboard and approve or reject accordingly.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from the Barangay Management System.</p>
            <p>Please do not reply to this email.</p>
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
        to: [adminEmail],
        subject: `New Resident Registration: ${residentName}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Admin notification email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-registration-notification function:", error);
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
