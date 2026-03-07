import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Gift, Calendar, BarChart3, LogOut } from "lucide-react";

const navItems = [
  { href: "/asso/paniers-dons", label: "Paniers dons disponibles", icon: Gift },
  { href: "/asso/mes-reservations", label: "Mes réservations", icon: Calendar },
  { href: "/asso/reporting", label: "Reporting", icon: BarChart3 },
];

export default async function AssoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "association") redirect("/connexion");

  const { data: asso } = await supabase.from("associations").select("name, status").eq("profile_id", user.id).single();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col shrink-0">
        <div className="p-6 border-b border-sidebar-border">
          <Link href="/" className="text-xl font-bold text-primary">Kshare</Link>
          <p className="text-sm text-sidebar-foreground/70 mt-1 font-medium truncate">{asso?.name ?? "Mon association"}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <form action="/api/auth/signout" method="POST">
            <Button variant="ghost" size="sm" className="w-full justify-start" type="submit">
              <LogOut className="mr-2 h-4 w-4" /> Déconnexion
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
