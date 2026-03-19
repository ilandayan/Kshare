import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface NotificationPayload {
  profileId: string;
  title: string;
  body: string;
  type: string;
  orderId?: string;
  data?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  // Verify the request is authorized (service role key or shared secret)
  const authHeader = req.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Only accept service role key as Bearer token (internal server-to-server calls)
  const token = authHeader.replace("Bearer ", "");
  if (token !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Forbidden — service role required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const payload: NotificationPayload = await req.json();
    const { profileId, title, body, type, orderId, data } = payload;

    if (!profileId || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: profileId, title, body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if user has push notifications enabled (skip for transactional like order updates)
    const isTransactional = ["order_paid", "order_ready", "order_picked_up", "order_no_show"].includes(type);
    if (!isTransactional) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("notif_push")
        .eq("id", profileId)
        .single();

      if (profile?.notif_push === false) {
        return new Response(
          JSON.stringify({ sent: 0, message: "User has push notifications disabled" }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch active push tokens for this user
    const { data: tokens, error: tokenError } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("profile_id", profileId)
      .eq("active", true);

    if (tokenError || !tokens || tokens.length === 0) {
      // Log but don't fail — user might not have push enabled
      await logNotification(supabase, {
        profileId,
        orderId,
        type,
        title,
        body,
        status: "failed",
        errorMessage: tokenError?.message ?? "No active push tokens",
      });

      return new Response(
        JSON.stringify({ sent: 0, message: "No active push tokens" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Build Expo push messages
    const messages = tokens.map((t: { token: string }) => ({
      to: t.token,
      sound: "default",
      title,
      body,
      data: { orderId, type, ...data },
      channelId: "default",
    }));

    // Send via Expo Push API
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    // Deactivate tokens that got DeviceNotRegistered errors
    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        const ticket = result.data[i];
        if (ticket.details?.error === "DeviceNotRegistered") {
          await supabase
            .from("push_tokens")
            .update({ active: false })
            .eq("token", tokens[i].token);
        }
      }
    }

    // Log the notification
    await logNotification(supabase, {
      profileId,
      orderId,
      type,
      title,
      body,
      status: response.ok ? "sent" : "failed",
      errorMessage: response.ok ? undefined : JSON.stringify(result),
    });

    return new Response(
      JSON.stringify({ sent: tokens.length, result }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function logNotification(
  supabase: ReturnType<typeof createClient>,
  params: {
    profileId: string;
    orderId?: string;
    type: string;
    title: string;
    body: string;
    status: string;
    errorMessage?: string;
  }
) {
  await supabase.from("notification_logs").insert({
    profile_id: params.profileId,
    order_id: params.orderId ?? null,
    type: params.type,
    title: params.title,
    body: params.body,
    status: params.status,
    error_message: params.errorMessage ?? null,
  });
}
