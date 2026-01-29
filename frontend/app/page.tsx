"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { Cpu } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsChecking(false);
    };
    init();
  }, [checkAuth]);

  useEffect(() => {
    if (!isChecking) {
      if (isAuthenticated) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [isAuthenticated, isChecking, router]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-background">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30">
          <Cpu className="h-7 w-7 text-primary-foreground" />
        </div>
        <span className="text-3xl font-bold">LogGPT</span>
      </div>
      <div className="relative">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    </div>
  );
}
