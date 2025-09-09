import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    logStep("User authenticated", { userId: user.id, email: user.email });

    const { tier, billingCycle } = await req.json();
    logStep("Request data", { tier, billingCycle });
    
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2023-10-16" 
    });
    logStep("Stripe initialized");
    
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
    logStep("Customer lookup", { customerId });

    // Map tiers to Stripe Price IDs
    // Note: You provided Product IDs, but we need Price IDs here
    // Go to Stripe Dashboard → Products → Click on each product → Copy the Price ID (starts with "price_")
    const priceMap = {
      premium_student: {
        monthly: "price_YOUR_MONTHLY_STUDENT_PRICE_ID", // From product: prod_T188QtahKlxRgZ
        annual: "price_YOUR_ANNUAL_STUDENT_PRICE_ID"    // From product: prod_T183aTwVkFja9c
      },
      premium_teacher: {
        monthly: "price_YOUR_MONTHLY_TEACHER_PRICE_ID", // From product: prod_T18CHWJC0EhQWR  
        annual: "price_YOUR_ANNUAL_TEACHER_PRICE_ID"    // From product: prod_T188L675XzFhOx
      }
    };

    const selectedTier = priceMap[tier as keyof typeof priceMap];
    if (!selectedTier) {
      throw new Error(`Invalid subscription tier: ${tier}`);
    }

    const priceId = selectedTier[billingCycle as keyof typeof selectedTier];
    if (!priceId) {
      throw new Error(`Invalid billing cycle: ${billingCycle} for tier: ${tier}`);
    }

    logStep("Price mapping", { tier, billingCycle, priceId });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId, // Use the actual Stripe Price ID
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/subscription?success=true&tier=${tier}&billing=${billingCycle}`,
      cancel_url: `${req.headers.get("origin")}/subscription?cancelled=true`,
      metadata: {
        user_id: user.id,
        tier: tier,
        billing_cycle: billingCycle
      }
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});