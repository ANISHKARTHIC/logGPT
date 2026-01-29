"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore, useThemeStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  Moon,
  Sun,
  ChevronLeft,
  Menu,
  X,
  Cpu,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getInitials } from "@/lib/utils";

const adminNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/inventory", icon: Package, label: "Inventory" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { href: "/users", icon: Users, label: "Users" },
  { href: "/chat", icon: MessageSquare, label: "LogGPT" },
];

const studentNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/inventory", icon: Package, label: "Browse Components" },
  { href: "/transactions", icon: ArrowLeftRight, label: "My Requests" },
  { href: "/chat", icon: MessageSquare, label: "LogGPT" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = user?.role === "admin" ? adminNavItems : studentNavItems;

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const NavItem = ({ item, isActive }: { item: typeof navItems[0]; isActive: boolean }) => {
    const content = (
      <Link href={item.href}>
        <motion.div
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
            isActive
              ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <item.icon className={cn(
            "h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
            isActive && "text-primary-foreground"
          )} />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="whitespace-nowrap"
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 lg:hidden bg-card shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col",
          "bg-gradient-to-b from-card via-card to-card/95",
          "border-r border-border/50",
          "shadow-2xl shadow-black/5",
          "transition-transform duration-300 lg:relative lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/50">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.5 }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30"
            >
              <Cpu className="h-5 w-5 text-primary-foreground" />
            </motion.div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col"
                >
                  <span className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    LogGPT
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    IoT Manager
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>

          {/* Mobile Close / Desktop Collapse */}
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex hover:bg-accent"
            >
              <motion.div
                animate={{ rotate: collapsed ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronLeft className="h-4 w-4" />
              </motion.div>
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-6">
          <div className="space-y-1.5">
            {navItems.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                isActive={pathname === item.href}
              />
            ))}
          </div>
        </nav>

        {/* Theme Toggle */}
        <div className="px-3 pb-2">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant="ghost"
              onClick={toggleTheme}
              className={cn(
                "w-full justify-start gap-3 px-3 py-3 rounded-xl",
                collapsed && "justify-center px-0"
              )}
            >
              <div className="relative h-5 w-5">
                <Sun className={cn(
                  "h-5 w-5 absolute transition-all",
                  theme === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0"
                )} />
                <Moon className={cn(
                  "h-5 w-5 absolute transition-all",
                  theme === "dark" ? "-rotate-90 scale-0" : "rotate-0 scale-100"
                )} />
              </div>
              {!collapsed && (
                <span className="text-sm">
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </span>
              )}
            </Button>
          </motion.div>
        </div>

        {/* User Section */}
        <div className="border-t border-border/50 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 px-3 py-6 rounded-xl hover:bg-accent",
                  collapsed && "justify-center px-0"
                )}
              >
                <div className="relative">
                  <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                      {user ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 ring-2 ring-card" />
                </div>
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-start text-left"
                    >
                      <span className="text-sm font-semibold truncate max-w-[140px]">
                        {user?.name}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                        <span className={cn(
                          "inline-block h-1.5 w-1.5 rounded-full",
                          user?.role === "admin" ? "bg-purple-500" : "bg-blue-500"
                        )} />
                        {user?.role}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
