import { createClient }     from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

export default async function AdminUtilisateursPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab = rawTab ?? "Clients";

  const supabase = await createClient();

  /* ── Clients ── */
  const { data: clientProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, created_at, is_archived")
    .eq("role", "client")
    .order("created_at", { ascending: false });

  const clientIds = (clientProfiles ?? []).map((p) => p.id);

  // Orders per client
  type OrderRow = { client_id: string; total_amount: number; quantity: number; is_donation: boolean; created_at: string };
  const { data: clientOrders } = clientIds.length > 0
    ? await supabase
        .from("orders")
        .select("client_id, total_amount, quantity, is_donation, created_at")
        .in("client_id", clientIds)
        .in("status", ["paid", "ready_for_pickup", "picked_up"])
    : { data: [] as OrderRow[] };

  // Fetch banned users via admin API
  const adminClient = createAdminClient();
  const { data: authListData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const bannedUserIds = new Set(
    (authListData?.users ?? [])
      .filter((u) => u.banned_until && new Date(u.banned_until) > new Date())
      .map((u) => u.id)
  );

  const ordersByClient: Record<string, OrderRow[]> = {};
  (clientOrders ?? []).forEach((o) => {
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

  /* ── Commerçants ── */
  const { data: commerces } = await supabase
    .from("commerces")
    .select(`
      id, name, commerce_type, hashgakha, status,
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
      lastActivity:  timeSince(profile?.created_at ?? null),
      status:        c.status === "validated" ? "actif" : c.status === "archived" ? "archivé" : c.status === "suspended" ? "suspendu" : "en attente",
    };
  });

  /* ── Associations ── */
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
        <h1 className="text-xl font-bold text-gray-900">Utilisateurs</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gestion des clients, commerçants et associations</p>
      </div>
      <AdminUsersClient
        tab={tab}
        clients={clients}
        commercants={commercants}
        assos={assos}
      />
    </div>
  );
}
