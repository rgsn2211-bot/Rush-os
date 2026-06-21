"use client";

import { User } from "lucide-react";
import { Logo } from "./logo";

export function WorkerHeader() {
  return (
    <header className="bg-navy flex items-center justify-between px-[22px] py-3.5">
      <Logo light />
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-[13.5px] font-semibold text-white">Worker</div>
          <div className="text-[11.5px] text-white/60">Tablet</div>
        </div>
        <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/14">
          <User size={20} className="text-white" />
        </div>
      </div>
    </header>
  );
}
