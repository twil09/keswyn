import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TEST-ROLE-EMAIL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify the user is an owner
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Check if user is owner
    const { data: profile } = await supabaseClient
      .rpc('get_safe_profile', { target_user_id: user.id })
      .single();
    
    if (profile?.role !== 'owner') {
      throw new Error("Only owners can send test emails");
    }

    logStep("Owner verified", { email: user.email });

    const resend = new Resend(resendKey);

    // Create test role change email
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          🧪 TEST: Role Change Request
        </h2>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;"><strong>⚠️ This is a test email</strong></p>
          <p style="margin: 5px 0 0 0; color: #856404;">This email was sent to test the role change notification system.</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Request Details</h3>
          <p><strong>Request ID:</strong> test-${Date.now()}</p>
          <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1976d2; margin-top: 0;">👤 Requested By</h3>
          <p><strong>Name:</strong> Test Admin</p>
          <p><strong>Email:</strong> admin@example.com</p>
          <p><strong>Current Role:</strong> <span style="background-color: #1976d2; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">admin</span></p>
        </div>

        <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #f57c00; margin-top: 0;">🎯 Target User</h3>
          <p><strong>Name:</strong> Test Student</p>
          <p><strong>Email:</strong> student@example.com</p>
          <p><strong>Current Role:</strong> <span style="background-color: #f57c00; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">free_student</span></p>
          <p><strong>Requested New Role:</strong> <span style="background-color: #4caf50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">premium_student</span></p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="#" 
             style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Review & Approve Request (Test Link)
          </a>
        </div>

        <div style="background-color: #f1f3f5; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px; color: #6c757d;">
          <p><strong>Note:</strong> This is a test email to verify the role change notification system is working correctly.</p>
          <p><strong>Sent by:</strong> ${user.email}</p>
        </div>
      </div>
    `;

    const result = await resend.emails.send({
      from: "Learning Platform <onboarding@resend.dev>",
      to: [user.email],
      subject: "🧪 TEST: Role Change Request Notification",
      html: emailContent,
    });

    logStep("Test email sent successfully", { result });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Test role change email sent successfully",
      emailId: result.data?.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in send-test-role-email", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});