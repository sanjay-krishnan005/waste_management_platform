import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

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
      .select("device_id, customer_id, organization_id")
      .eq("id", record.bin_id)
      .single();

    if (!bin) {
      return new Response(JSON.stringify({ error: "Bin not found" }), { status: 200 });
    }

    const { data: orgAdmins } = await supabase
      .from("profiles")
      .select("email, telegram_chat_id, notify_email, notify_telegram")
      .eq("organization_id", bin.organization_id)
      .eq("role", "admin");

    const { data: customerProfile } = await supabase
      .from("profiles")
      .select("email, telegram_chat_id, notify_email, notify_telegram")
      .eq("customer_id", bin.customer_id)
      .single();

    const recipients = [...(orgAdmins ?? [])];
    if (customerProfile) recipients.push(customerProfile);

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const severity = (record.severity ?? "medium").toUpperCase();
    const alertType = (record.alert_type ?? "").replace(/_/g, " ");
    const subject = `Sortyx Alert — ${severity}: ${record.message}`;
    const telegramText = `⚠️ *${severity}* — ${record.message}`;

    const results: { channel: string; recipient: string; status: string }[] = [];

    for (const user of recipients) {
      if (user.notify_email && user.email && RESEND_API_KEY) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Sortyx <notifications@sortyx.com>",
              to: user.email,
              subject,
              text: record.message,
            }),
          });
          results.push({ channel: "email", recipient: user.email, status: res.ok ? "sent" : "failed" });
        } catch {
          results.push({ channel: "email", recipient: user.email, status: "error" });
        }
      }

      if (user.notify_telegram && user.telegram_chat_id && TELEGRAM_BOT_TOKEN) {
        try {
          const res = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: user.telegram_chat_id,
                text: telegramText,
                parse_mode: "Markdown",
              }),
            }
          );
          results.push({
            channel: "telegram",
            recipient: user.telegram_chat_id,
            status: res.ok ? "sent" : "failed",
          });
        } catch {
          results.push({ channel: "telegram", recipient: user.telegram_chat_id, status: "error" });
        }
      }
    }

    return new Response(JSON.stringify({ sent: results.length, results }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
