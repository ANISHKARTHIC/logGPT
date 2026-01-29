"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { motion } from "framer-motion";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-gradient-to-br from-background via-background to-background/95 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen p-6 lg:p-8"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </AuthGuard>
  );
}
