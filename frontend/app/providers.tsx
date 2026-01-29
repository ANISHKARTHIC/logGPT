"use client";

import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useThemeStore } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
