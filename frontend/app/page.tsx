"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Boxes } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to kiosk mode by default (for Raspberry Pi)
    router.replace("/kiosk");
  }, [router]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
          <Boxes className="h-7 w-7 text-white" />
        </div>
        <span className="text-3xl font-bold text-white">Components Room</span>
      </div>
      <div className="relative">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-500" />
      </div>
      <p className="text-slate-400">Loading kiosk...</p>
    </div>
  );
}
