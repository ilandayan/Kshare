"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, User, LogOut, ShoppingBag } from "lucide-react";
import Link from "next/link";

interface ClientUserMenuProps {
  userName: string;
  userInitial: string;
}

export function ClientUserMenu({ userName, userInitial }: ClientUserMenuProps) {
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/connexion";
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 hover:bg-gray-50 rounded-xl px-3 py-2 transition-colors"
      >
        <div className="text-right hidden sm:block">
          <div className="text-sm font-semibold text-gray-900 leading-tight">{userName}</div>
          <div className="text-xs text-gray-400">Client</div>
        </div>
        <div className="relative">
          <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {userInitial}
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-[#e2e5f0] py-1 z-20">
            <Link
              href="/client/commandes"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <ShoppingBag className="h-4 w-4 text-gray-400" />
              Mes commandes
            </Link>
            <Link
              href="/client/profil"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <User className="h-4 w-4 text-gray-400" />
              Mon profil
            </Link>
            <div className="my-1 border-t border-[#e2e5f0]" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors w-full text-left"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
        </>
      )}
    </div>
  );
}
