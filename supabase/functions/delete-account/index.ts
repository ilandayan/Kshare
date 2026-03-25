import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Edge Function: delete-account
 *
 * Deletes the authenticated user's account and all associated data.
 * Called from the mobile app with the user's JWT token.
 *
 * Flow:
 * 1. Verify JWT → extract user ID
 * 2. Delete user data (favorites, push_tokens, orders, etc.)
 * 3. Delete auth user via admin API
 */
Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userToken = authHeader.replace("Bearer ", "");

  // Create a client with the user's JWT to verify identity
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${userToken}` } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = user.id;

  // Create admin client for data deletion
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Delete user data in order (respecting foreign key constraints)
    // 1. Push tokens
    await adminClient.from("push_tokens").delete().eq("profile_id", userId);

    // 2. Favorites
    await adminClient.from("favorites").delete().eq("client_id", userId);

    // 3. Order-related data (ratings, reports)
    const { data: userOrders } = await adminClient
      .from("orders")
      .select("id")
      .eq("client_id", userId);

    if (userOrders && userOrders.length > 0) {
      const orderIds = userOrders.map((o: { id: string }) => o.id);
      await adminClient.from("order_ratings").delete().in("order_id", orderIds);
    }

    // 4. Orders (soft delete — mark as deleted to preserve commerce history)
    await adminClient
      .from("orders")
      .update({ client_id: null })
      .eq("client_id", userId);

    // 5. Profile
    await adminClient.from("profiles").delete().eq("id", userId);

    // 6. Delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("[delete-account] Failed to delete auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete account" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[delete-account] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
