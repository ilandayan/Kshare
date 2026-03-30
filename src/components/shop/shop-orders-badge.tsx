"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Badge affichant le nombre de commandes en attente de retrait aujourd'hui.
 * Se rafraîchit toutes les 30 secondes et via Realtime.
 */
export function ShopOrdersBadge({ commerceId }: { commerceId: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    async function fetchCount() {
      const today = new Date().toISOString().split("T")[0];
      const { count: n } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("commerce_id", commerceId)
        .eq("status", "paid")
        .gte("pickup_date", today)
        .lte("pickup_date", today);
      setCount(n ?? 0);
    }

    fetchCount();

    // Polling toutes les 30s
    const interval = setInterval(fetchCount, 30_000);

    // Realtime
    const channel = supabase
      .channel("shop-orders-badge")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `commerce_id=eq.${commerceId}`,
        },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [commerceId]);

  if (count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none px-1">
      {count > 99 ? "99+" : count}
    </span>
  );
}
