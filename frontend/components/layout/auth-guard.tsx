"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";

interface AuthGuardProps {
  children: React.ReactNode;
}

const publicPaths = ["/login", "/register", "/forgot-password"];

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsChecking(false);
    };
    init();
  }, [checkAuth]);

  useEffect(() => {
    if (!isChecking && !isLoading) {
      const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

      if (!isAuthenticated && !isPublicPath) {
        router.replace("/login");
      } else if (isAuthenticated && isPublicPath) {
        router.replace("/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, isChecking, pathname, router]);

  // Show loading while checking auth
  if (isChecking || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // If not authenticated and trying to access protected route, show nothing (redirect happening)
  if (!isAuthenticated && !isPublicPath) {
    return null;
  }

  // Render children directly - sidebar is handled by dashboard layout
  return <>{children}</>;
}
