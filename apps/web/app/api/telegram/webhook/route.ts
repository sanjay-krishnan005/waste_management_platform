import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = body.message;

  if (!message || !message.text || !message.chat?.id) {
    return NextResponse.json({ ok: true });
  }

  const text = message.text.trim();
  const chatId = String(message.chat.id);

  if (!text.startsWith("/start")) {
    await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text:
            "Send /start followed by your account email, e.g.\n`/start name@example.com`",
          parse_mode: "Markdown",
        }),
      }
    );
    return NextResponse.json({ ok: true });
  }

  const email = text.replace("/start", "").trim();
  if (!email) return NextResponse.json({ ok: true });

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ telegram_chat_id: chatId })
    .eq("email", email);

  if (error) {
    return NextResponse.json({ ok: true });
  }

  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "✅ Linked! You'll now receive Sortyx alerts here.",
      }),
    }
  );

  return NextResponse.json({ ok: true });
}
