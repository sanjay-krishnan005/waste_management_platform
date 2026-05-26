import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FCM_URL = "https://fcm.googleapis.com/fcm/send";

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;
    if (!record || payload.type !== "INSERT") {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: bin } = await supabase
      .from("bins")
      .select("customer_id, organization_id")
      .eq("id", record.bin_id)
      .single();

    let query = supabase
      .from("profiles")
      .select("fcm_token")
      .not("fcm_token", "is", null);

    if (bin?.organization_id) {
      query = query.or(
        `organization_id.eq.${bin.organization_id},and(customer_id.eq.${bin.customer_id})`
      );
    }

    const { data: profiles } = await query;
    const tokens = (profiles ?? []).map((p) => p.fcm_token).filter(Boolean);

    const serverKey = Deno.env.get("FIREBASE_SERVER_KEY");
    if (!serverKey || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    for (const token of tokens) {
      await fetch(FCM_URL, {
        method: "POST",
        headers: {
          Authorization: `key=${serverKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: token,
          notification: {
            title: "Sortyx Alert",
            body: record.message,
          },
          data: { alert_id: record.id, alert_type: record.alert_type },
        }),
      });
    }

    return new Response(JSON.stringify({ sent: tokens.length }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
