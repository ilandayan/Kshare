"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, User, LogOut, Heart } from "lucide-react";

interface AssoUserMenuProps {
  assoName: string;
  userInitial: string;
}

export function AssoUserMenu({ assoName, userInitial }: AssoUserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/connexion?role=association");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 hover:bg-white/10 rounded-xl px-3 py-2 transition-colors"
      >
        <div className="text-right">
          <div className="text-sm font-semibold text-white leading-tight">{assoName}</div>
          <div className="text-xs text-white/60 leading-tight">Association</div>
        </div>
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
            {userInitial}
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
        </div>
        <ChevronDown className={`h-4 w-4 text-white/70 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-lg border border-[#e2e5f0] py-2 z-50">
          <button
            onClick={() => { setOpen(false); router.push("/asso/profil"); }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <User className="h-4 w-4 text-gray-400" />
            Mon profil
          </button>
          <button
            onClick={() => { setOpen(false); router.push("/asso/reporting"); }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Heart className="h-4 w-4 text-gray-400" />
            Mon impact
          </button>
          <div className="my-1 border-t border-[#e2e5f0]" />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
