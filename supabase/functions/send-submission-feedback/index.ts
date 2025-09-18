import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SubmissionFeedbackRequest {
  studentEmail: string;
  studentName: string;
  stepTitle: string;
  courseTitle: string;
  grade: string;
  feedback: string;
  status: 'approved' | 'rejected';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      studentEmail, 
      studentName, 
      stepTitle, 
      courseTitle, 
      grade, 
      feedback, 
      status 
    }: SubmissionFeedbackRequest = await req.json();

    console.log("Sending feedback email to:", studentEmail);

    const gradeText = grade === 'U' ? 'Ungraded' : `${grade}/9`;
    const statusColor = status === 'approved' ? '#10B981' : '#EF4444';
    const statusIcon = status === 'approved' ? '✅' : '❌';

    const emailResponse = await resend.emails.send({
      from: "Course Platform <onboarding@resend.dev>",
      to: [studentEmail],
      subject: `${statusIcon} Your submission has been ${status}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 24px;">Submission Feedback</h1>
          </div>
          
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Hi ${studentName},</h2>
            <p style="color: #6b7280; margin: 0 0 15px 0; line-height: 1.5;">
              Your submission for "<strong>${stepTitle}</strong>" in the course "<strong>${courseTitle}</strong>" has been reviewed.
            </p>
          </div>

          <div style="border-left: 4px solid ${statusColor}; padding-left: 20px; margin-bottom: 20px;">
            <h3 style="color: ${statusColor}; margin: 0 0 10px 0; font-size: 16px;">
              Status: ${status.charAt(0).toUpperCase() + status.slice(1)} ${statusIcon}
            </h3>
            <p style="color: #374151; margin: 0 0 10px 0;">
              <strong>Grade:</strong> ${gradeText}
            </p>
          </div>

          ${feedback ? `
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h4 style="color: #374151; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">Feedback:</h4>
            <p style="color: #6b7280; margin: 0; line-height: 1.5; white-space: pre-wrap;">${feedback}</p>
          </div>
          ` : ''}

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">
              This is an automated message from your course platform.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-submission-feedback function:", error);
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