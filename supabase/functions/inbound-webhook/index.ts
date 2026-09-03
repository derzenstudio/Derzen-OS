import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  
  // This endpoint accepts inbound messages from WhatsApp, Airbnb, Booking, VRBO.
  // In a real implementation, we would verify the HMAC signature of the provider here.
  
  const body = await req.json();
  const provider = new URL(req.url).searchParams.get("provider") || "unknown";
  
  console.log(`Received inbound webhook from ${provider}:`, body);
  
  // Acknowledge receipt
  return new Response(JSON.stringify({ received: true }), { 
    status: 200, 
    headers: { "Content-Type": "application/json" } 
  });
});
