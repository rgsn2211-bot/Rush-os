"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "./logo";

export function WorkerHeader() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-navy flex items-center justify-between px-[22px] py-3.5">
      <Logo light />
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-[13.5px] font-semibold text-white">Worker</div>
          <div className="text-[11.5px] text-white/60">Tablet</div>
        </div>
        <button
          onClick={handleSignOut}
          title="Sign out"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/14 hover:bg-white/22 transition-colors"
        >
          <LogOut size={18} className="text-white/70" />
        </button>
      </div>
    </header>
  );
}
