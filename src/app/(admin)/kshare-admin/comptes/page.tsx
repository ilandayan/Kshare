import { createClient }     from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2, Users, AlertTriangle } from "lucide-react";
import { AdminUsersClient } from "@/components/admin/admin-users-client";
import type {
  ClientRow, CommercantRow, AssoRow,
} from "@/components/admin/admin-users-client";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR");
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function timeSince(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return `Aujourd'hui`;
  if (days === 1) return "Hier";
  if (days < 7)  return `Il y a ${days} jours`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`;
  return `Il y a ${Math.floor(days / 30)} mois`;
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  validated: "bg-green-100 text-green-800",
  refused: "bg-red-100 text-red-800",
  complement_required: "bg-orange-100 text-orange-800",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "En attente", validated: "Validé", refused: "Refusé", complement_required: "Complément requis",
};

export default async function ComptesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab = rawTab ?? "Clients";

  const supabase = await createClient();

  /* ── Pending accounts ── */
  const [{ data: pendingCommerces }, { data: pendingAssos }] = await Promise.all([
    supabase.from("commerces").select("id, name, city, email, status, created_at").eq("status", "pending").order("created_at"),
    supabase.from("associations").select("id, name, city, contact, status, created_at").eq("status", "pending").order("created_at"),
  ]);

  const pendingCount = (pendingCommerces?.length ?? 0) + (pendingAssos?.length ?? 0);

  /* ── All users (from former /utilisateurs page) ── */
  const { data: clientProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, created_at, is_archived")
    .eq("role", "client")
    .order("created_at", { ascending: false });

  const clientIds = (clientProfiles ?? []).map((p) => p.id);

  type OrderRow = { client_id: string; total_amount: number; quantity: number; is_donation: boolean; created_at: string };
  const { data: clientOrders } = clientIds.length > 0
    ? await supabase
        .from("orders")
        .select("client_id, total_amount, quantity, is_donation, created_at")
        .in("client_id", clientIds)
        .in("status", ["paid", "ready_for_pickup", "picked_up"])
    : { data: [] as OrderRow[] };

  const adminClient = createAdminClient();
  const { data: authListData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const bannedUserIds = new Set(
    (authListData?.users ?? [])
      .filter((u) => u.banned_until && new Date(u.banned_until) > new Date())
      .map((u) => u.id)
  );

  const ordersByClient: Record<string, OrderRow[]> = {};
  ((clientOrders ?? []) as OrderRow[]).forEach((o) => {
    if (!ordersByClient[o.client_id]) ordersByClient[o.client_id] = [];
    ordersByClient[o.client_id]!.push(o);
  });

  const clients: ClientRow[] = (clientProfiles ?? []).map((p) => {
    const orders = ordersByClient[p.id] ?? [];
    const lastOrder = orders[0]?.created_at ?? null;
    const isBanned = bannedUserIds.has(p.id);
    return {
      id:               p.id,
      initials:         getInitials(p.full_name),
      fullName:         p.full_name ?? "—",
      city:             "—",
      email:            p.email ?? "—",
      phone:            p.phone ?? "—",
      inscriptionDate:  formatDate(p.created_at),
      basketCount:      orders.reduce((s, o) => s + (o.quantity ?? 1), 0),
      donationsAmount:  orders.filter((o) => o.is_donation).reduce((s, o) => s + (o.total_amount ?? 0), 0),
      lastActivity:     timeSince(lastOrder ?? p.created_at),
      status:           p.is_archived ? "archivé" as const : isBanned ? "suspendu" as const : "actif" as const,
    };
  });

  const { data: commerces } = await supabase
    .from("commerces")
    .select(`
      id, name, commerce_type, hashgakha, status, average_rating, total_ratings,
      profiles!commerces_profile_id_fkey(full_name, email, phone, created_at),
      baskets(id, quantity_sold)
    `)
    .order("created_at", { ascending: false });

  const commercants: CommercantRow[] = (commerces ?? []).map((c) => {
    const profile = c.profiles as { full_name: string | null; email: string | null; phone: string | null; created_at: string } | null;
    const baskets = c.baskets as { id: string; quantity_sold: number }[] | null ?? [];
    return {
      id:            c.id,
      initials:      getInitials(profile?.full_name ?? c.name),
      fullName:      profile?.full_name ?? "—",
      city:          "—",
      commerceName:  c.name,
      commerceType:  c.commerce_type ?? "Commerce",
      email:         profile?.email ?? "—",
      phone:         profile?.phone ?? "—",
      hashgakha:     c.hashgakha ?? "—",
      proposedCount: baskets.length,
      soldCount:     baskets.reduce((s, b) => s + (b.quantity_sold ?? 0), 0),
      averageRating: (c as Record<string, unknown>).average_rating as number ?? 0,
      totalRatings:  (c as Record<string, unknown>).total_ratings as number ?? 0,
      lastActivity:  timeSince(profile?.created_at ?? null),
      status:        c.status === "validated" ? "actif" : c.status === "archived" ? "archivé" : c.status === "suspended" ? "suspendu" : "en attente",
    };
  });

  const { data: assosList } = await supabase
    .from("associations")
    .select(`
      id, name, status, created_at,
      profiles!associations_profile_id_fkey(full_name, email, phone),
      orders(id, quantity, status)
    `)
    .order("created_at", { ascending: false });

  const assos: AssoRow[] = (assosList ?? []).map((a) => {
    const profile = a.profiles as { full_name: string | null; email: string | null; phone: string | null } | null;
    const orders  = a.orders  as { id: string; quantity: number; status: string }[] | null ?? [];
    const collected = orders.filter((o) => o.status === "picked_up");
    return {
      id:             a.id,
      initials:       getInitials(a.name),
      name:           a.name,
      city:           "—",
      responsable:    profile?.full_name ?? "—",
      email:          profile?.email ?? "—",
      phone:          profile?.phone ?? "—",
      inscriptionDate: formatDate(a.created_at),
      distCount:      collected.reduce((s, o) => s + (o.quantity ?? 1), 0),
      famillesCount:  Math.round(collected.reduce((s, o) => s + (o.quantity ?? 1), 0) * 2.5),
      lastActivity:   timeSince(a.created_at),
      status:         a.status === "validated" ? "actif" : a.status === "archived" ? "archivé" : a.status === "suspended" ? "suspendu" : "en attente",
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Comptes & Utilisateurs</h1>
        <p className="text-sm text-gray-400 mt-0.5">Validation des inscriptions et gestion des utilisateurs</p>
      </div>

      {/* Pending validation banner */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-900 text-sm">
              {pendingCount} inscription{pendingCount > 1 ? "s" : ""} en attente de validation
            </p>
            <div className="mt-3 space-y-2">
              {(pendingCommerces ?? []).map((c) => (
                <div key={c.id} className="flex items-center justify-between bg-white rounded-lg border border-amber-100 p-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{c.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{c.city} · {c.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[c.status] ?? ""}`}>
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/kshare-admin/comptes/${c.id}?type=commerce`}>Voir</Link>
                    </Button>
                  </div>
                </div>
              ))}
              {(pendingAssos ?? []).map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-white rounded-lg border border-amber-100 p-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{a.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{a.city} · {a.contact}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[a.status] ?? ""}`}>
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/kshare-admin/comptes/${a.id}?type=association`}>Voir</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Users tabs (Clients / Commerçants / Associations) */}
      <AdminUsersClient
        tab={tab}
        clients={clients}
        commercants={commercants}
        assos={assos}
      />
    </div>
  );
}
