import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ShoppingBag, BarChart3, User, LogOut } from "lucide-react";

const navItems = [
  { href: "/shop/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/shop/paniers", label: "Mes paniers", icon: ShoppingBag },
  { href: "/shop/statistiques", label: "Statistiques", icon: BarChart3 },
  { href: "/shop/profil", label: "Profil", icon: User },
];

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "commerce") redirect("/connexion");

  const { data: commerce } = await supabase.from("commerces").select("name, status").eq("profile_id", user.id).single();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col shrink-0">
        <div className="p-6 border-b border-sidebar-border">
          <Link href="/" className="text-xl font-bold text-primary">Kshare</Link>
          <p className="text-sm text-sidebar-foreground/70 mt-1 font-medium truncate">{commerce?.name ?? "Mon commerce"}</p>
          {commerce?.status === "pending" && (
            <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-0.5 rounded-full mt-1 inline-block">
              En attente de validation
            </span>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <form action="/api/auth/signout" method="POST">
            <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground" type="submit">
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </form>
        </div>
      </aside>
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
