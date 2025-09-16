import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ROLE-CHANGE-EMAIL] ${step}${detailsStr}`);
};

interface RoleChangeRequest {
  id: string;
  target_user_id: string;
  new_role: string;
  requested_by: string;
  requester_email: string;
  target_email: string;
  status: string;
  created_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY is not set");
    logStep("Resend key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { requestId } = await req.json();
    if (!requestId) throw new Error("Request ID is required");
    logStep("Request ID received", { requestId });

    // Get the role change request details
    const { data: request, error: requestError } = await supabaseClient
      .from('role_change_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      throw new Error(`Failed to fetch role change request: ${requestError?.message}`);
    }
    logStep("Role change request fetched", request);

    // Get requester details
    const { data: requesterProfile, error: requesterError } = await supabaseClient
      .rpc('get_safe_profile', { target_user_id: request.requested_by })
      .single();

    if (requesterError) {
      throw new Error(`Failed to fetch requester profile: ${requesterError.message}`);
    }
    logStep("Requester profile fetched", requesterProfile);

    // Get target user details
    const { data: targetProfile, error: targetError } = await supabaseClient
      .rpc('get_safe_profile', { target_user_id: request.target_user_id })
      .single();

    if (targetError) {
      throw new Error(`Failed to fetch target profile: ${targetError.message}`);
    }
    logStep("Target profile fetched", targetProfile);

    const resend = new Resend(resendKey);

    // Create approval URL with the request ID
    const origin = req.headers.get("origin") || "https://wzsezrnkwcofobvsezgb.supabase.co";
    const approvalUrl = `${origin}/admin/approve-role-change/${requestId}`;

    // Send email to both authorized emails
    const authorizedEmails = ['taywil0809@outlook.com', 'keswyn@outlook.com'];
    
    const emailPromises = authorizedEmails.map(async (email) => {
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            Role Change Request
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #495057; margin-top: 0;">Request Details</h3>
            <p><strong>Request ID:</strong> ${request.id}</p>
            <p><strong>Submitted:</strong> ${new Date(request.created_at).toLocaleString()}</p>
          </div>

          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1976d2; margin-top: 0;">👤 Requested By</h3>
            <p><strong>Name:</strong> ${requesterProfile?.full_name || 'Unknown'}</p>
            <p><strong>Email:</strong> ${request.requester_email}</p>
            <p><strong>Current Role:</strong> <span style="background-color: #1976d2; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${requesterProfile?.role || 'Unknown'}</span></p>
          </div>

          <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #f57c00; margin-top: 0;">🎯 Target User</h3>
            <p><strong>Name:</strong> ${targetProfile?.full_name || 'Unknown'}</p>
            <p><strong>Email:</strong> ${request.target_email}</p>
            <p><strong>Current Role:</strong> <span style="background-color: #f57c00; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${targetProfile?.role || 'Unknown'}</span></p>
            <p><strong>Requested New Role:</strong> <span style="background-color: #4caf50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${request.new_role}</span></p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${approvalUrl}" 
               style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Review & Approve Request
            </a>
          </div>

          <div style="background-color: #f1f3f5; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px; color: #6c757d;">
            <p><strong>Note:</strong> This email was sent to you because you are authorized to approve role changes. If you did not expect this request, please contact the system administrator.</p>
            <p><strong>Security:</strong> Only click the approval link if you recognize and approve of this role change request.</p>
          </div>
        </div>
      `;

      return resend.emails.send({
        from: "Learning Platform <onboarding@resend.dev>",
        to: [email],
        subject: `Role Change Request: ${targetProfile?.full_name || request.target_email} → ${request.new_role}`,
        html: emailContent,
      });
    });

    const results = await Promise.all(emailPromises);
    logStep("Emails sent successfully", { results });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Role change request emails sent successfully",
      emailsSent: results.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in send-role-change-email", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});