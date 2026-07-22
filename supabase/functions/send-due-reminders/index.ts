import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import webpush from 'https://esm.sh/web-push@3.6.7'

const VAPID_PUBLIC_KEY = "BH-uiaZXOxtpYiydH9LHpPpc_8H_eGWePFk7nGOmGp-D4n8FizuiuhyPMNDwaJuGtv0nrrawXkzzEj4QaNUl1t8";
// The private key will be injected securely via Supabase Secrets
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';

if (VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@classyerp.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

serve(async (req) => {
  try {
    if (!VAPID_PRIVATE_KEY) {
      throw new Error("VAPID_PRIVATE_KEY is not set in Supabase Secrets.");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create Supabase client with Service Role Key to bypass RLS (since this is a server function)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get active push subscriptions from database
    const { data: subscriptions, error: subError } = await supabase
      .from('erp_push_subscriptions')
      .select('subscription');
      
    if (subError) throw subError;
    
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active push subscriptions found. Make sure you enable them in the app." }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Find orders due today
    const today = new Date().toISOString().split('T')[0];
    
    const { data: orders, error: orderError } = await supabase
      .from('erp_orders')
      .select('id, data');

    if (orderError) throw orderError;

    // Check JSON 'data' field to see if deliveryDate matches today
    const dueOrders = orders.filter(order => {
       const orderData = order.data;
       if (!orderData || !orderData.deliveryDate) return false;
       return orderData.deliveryDate.startsWith(today) && orderData.status !== 'Delivered';
    });

    if (dueOrders.length === 0) {
        return new Response(
            JSON.stringify({ message: "Checked, but no active orders due today." }),
            { headers: { "Content-Type": "application/json" } }
        );
    }

    // 3. Send Push Notification Payload
    let successCount = 0;
    const payload = JSON.stringify({
      title: 'Delivery Alert - ClassyERP',
      body: `You have ${dueOrders.length} order(s) due for delivery today!`,
      url: '/', // Click goes to home
      tag: 'due-orders' // Prevents duplicate spam
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        successCount++;
      } catch (err) {
        console.error("Failed to send push to a subscription:", err);
      }
    }

    return new Response(
      JSON.stringify({ message: `Successfully sent ${successCount} notifications for ${dueOrders.length} due orders.` }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
})
