"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Package,
  ArrowLeftRight,
  Clock,
  AlertTriangle,
  Users,
  TrendingUp,
  Activity,
  ChevronRight,
  Sparkles,
  Zap,
  BarChart3,
  CircleDot,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/lib/store";
import { dashboardApi } from "@/lib/api";
import { AdminDashboardStats, StudentDashboardStats, ActivityItem } from "@/lib/types";
import { formatRelativeTime, cn } from "@/lib/utils";
import Link from "next/link";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<AdminDashboardStats | StudentDashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsData = await dashboardApi.getStats();
        setStats(statsData);

        if (user?.role === "admin") {
          const activityData = await dashboardApi.getRecentActivity();
          setActivity(activityData.activity);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.role]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-8"
    >
      {/* Header with greeting */}
      <motion.div variants={itemVariants} className="relative">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Welcome back, {user?.name?.split(" ")[0]}!
            </h1>
            <motion.span 
              animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
              className="text-3xl md:text-4xl"
            >
              👋
            </motion.span>
          </div>
          <p className="text-muted-foreground text-lg">
            Here's what's happening with your components today.
          </p>
        </div>
        
        {/* Decorative gradient blob */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      </motion.div>

      {/* Stats Grid */}
      {user?.role === "admin" ? (
        <AdminDashboard stats={stats as AdminDashboardStats} activity={activity} />
      ) : (
        <StudentDashboard stats={stats as StudentDashboardStats} />
      )}
    </motion.div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  gradient,
  subtitle,
  highlight,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  gradient: string;
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className={cn(
        "relative overflow-hidden group transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1",
        highlight && "ring-2 ring-yellow-500/50 dark:ring-yellow-400/30"
      )}>
        {/* Background gradient */}
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br",
          gradient
        )} />
        
        <CardContent className="relative p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold tracking-tight">{value}</p>
              </div>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className={cn(
              "rounded-xl p-3 transition-transform duration-300 group-hover:scale-110 bg-gradient-to-br",
              gradient
            )}>
              <Icon className={cn("h-5 w-5", color)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AdminDashboard({
  stats,
  activity,
}: {
  stats: AdminDashboardStats;
  activity: ActivityItem[];
}) {
  const statCards = [
    {
      title: "Total Components",
      value: stats?.total_components || 0,
      icon: Package,
      color: "text-blue-600 dark:text-blue-400",
      gradient: "from-blue-500/10 to-cyan-500/10",
    },
    {
      title: "Active Transactions",
      value: stats?.active_transactions || 0,
      icon: ArrowLeftRight,
      color: "text-emerald-600 dark:text-emerald-400",
      gradient: "from-emerald-500/10 to-green-500/10",
    },
    {
      title: "Pending Requests",
      value: stats?.pending_requests || 0,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      gradient: "from-amber-500/10 to-yellow-500/10",
      highlight: (stats?.pending_requests || 0) > 0,
    },
    {
      title: "Overdue Items",
      value: stats?.overdue_count || 0,
      icon: AlertTriangle,
      color: "text-rose-600 dark:text-rose-400",
      gradient: "from-rose-500/10 to-red-500/10",
      highlight: (stats?.overdue_count || 0) > 0,
    },
    {
      title: "Total Users",
      value: stats?.total_users || 0,
      icon: Users,
      color: "text-violet-600 dark:text-violet-400",
      gradient: "from-blue-700/10 to-blue-600/10",
    },
    {
      title: "This Week",
      value: stats?.recent_transactions || 0,
      icon: TrendingUp,
      color: "text-cyan-600 dark:text-cyan-400",
      gradient: "from-cyan-500/10 to-teal-500/10",
      subtitle: "transactions",
    },
  ];

  return (
    <>
      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        {statCards.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <Card className="h-full border-0 shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                Recent Activity
              </CardTitle>
              <Link href="/transactions">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                  View all
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activity.length > 0 ? (
                  activity.slice(0, 5).map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-accent/50 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <CircleDot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">
                            <span className="text-muted-foreground">{item.user}</span>{" "}
                            {item.action}{" "}
                            <span className="text-primary font-semibold">{item.component}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(item.timestamp)}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={item.status} />
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Activity className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Components */}
        <motion.div variants={itemVariants}>
          <Card className="h-full border-0 shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                </div>
                Most Borrowed
              </CardTitle>
              <Link href="/inventory">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                  View inventory
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.top_components?.length > 0 ? (
                  stats.top_components.map((component, index) => (
                    <motion.div
                      key={component.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-accent/50 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm",
                          index === 0 && "bg-gradient-to-br from-yellow-400 to-orange-500 text-white",
                          index === 1 && "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800",
                          index === 2 && "bg-gradient-to-br from-amber-600 to-amber-700 text-white",
                          index > 2 && "bg-primary/10 text-primary"
                        )}>
                          {index + 1}
                        </div>
                        <span className="font-medium">{component.name}</span>
                      </div>
                      <Badge variant="secondary" className="font-semibold">
                        {component.count} issued
                      </Badge>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <BarChart3 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg bg-gradient-to-r from-card via-card to-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/inventory">
                <Button className="gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                  <Package className="h-4 w-4" />
                  Add Component
                </Button>
              </Link>
              <Link href="/transactions?status=pending">
                <Button variant="outline" className="gap-2 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/50 transition-all">
                  <Clock className="h-4 w-4" />
                  Review Pending
                  {(stats?.pending_requests || 0) > 0 && (
                    <Badge className="ml-1 h-5 px-1.5 bg-amber-500 hover:bg-amber-500">
                      {stats?.pending_requests}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Link href="/transactions?overdue=true">
                <Button variant="outline" className="gap-2 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/50 transition-all">
                  <AlertTriangle className="h-4 w-4" />
                  Handle Overdue
                  {(stats?.overdue_count || 0) > 0 && (
                    <Badge className="ml-1 h-5 px-1.5 bg-rose-500 hover:bg-rose-500">
                      {stats?.overdue_count}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Link href="/chat">
                <Button variant="secondary" className="gap-2 bg-gradient-to-r from-blue-700/10 to-blue-600/10 hover:from-blue-700/20 hover:to-blue-600/20 border border-blue-700/20">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  Ask LogGPT
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}

function StudentDashboard({ stats }: { stats: StudentDashboardStats }) {
  const statCards = [
    {
      title: "Active Issues",
      value: stats?.active_issues || 0,
      icon: Package,
      color: "text-emerald-600 dark:text-emerald-400",
      gradient: "from-emerald-500/10 to-green-500/10",
    },
    {
      title: "Pending Requests",
      value: stats?.pending_requests || 0,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      gradient: "from-amber-500/10 to-yellow-500/10",
    },
    {
      title: "Overdue Items",
      value: stats?.overdue_count || 0,
      icon: AlertTriangle,
      color: "text-rose-600 dark:text-rose-400",
      gradient: "from-rose-500/10 to-red-500/10",
      highlight: (stats?.overdue_count || 0) > 0,
    },
    {
      title: "Total Returns",
      value: stats?.total_returns || 0,
      icon: ArrowLeftRight,
      color: "text-blue-600 dark:text-blue-400",
      gradient: "from-blue-500/10 to-cyan-500/10",
    },
  ];

  return (
    <>
      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        className="grid gap-4 grid-cols-2 lg:grid-cols-4"
      >
        {statCards.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </motion.div>

      {/* Recent Transactions & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="h-full border-0 shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                My Recent Transactions
              </CardTitle>
              <Link href="/transactions">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                  View all
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.recent_transactions?.length > 0 ? (
                  stats.recent_transactions.map((tx, index) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-accent/50 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-medium">{tx.component}</p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {tx.quantity} • {formatRelativeTime(tx.date)}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={tx.status} />
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Activity className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No recent transactions</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full border-0 shadow-lg bg-gradient-to-br from-card via-card to-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/inventory" className="block">
                <Button className="w-full justify-start gap-3 h-14 text-base shadow-lg shadow-primary/20 hover:shadow-xl transition-all">
                  <div className="p-2 rounded-lg bg-white/20">
                    <Package className="h-5 w-5" />
                  </div>
                  Browse Components
                </Button>
              </Link>
              <Link href="/transactions" className="block">
                <Button variant="outline" className="w-full justify-start gap-3 h-14 text-base hover:bg-accent transition-all">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ArrowLeftRight className="h-5 w-5 text-primary" />
                  </div>
                  My Requests
                </Button>
              </Link>
              <Link href="/chat" className="block">
                <Button variant="secondary" className="w-full justify-start gap-3 h-14 text-base bg-gradient-to-r from-blue-700/10 to-blue-600/10 hover:from-blue-700/20 hover:to-blue-600/20 border border-blue-700/20 transition-all">
                  <div className="p-2 rounded-lg bg-violet-500/20">
                    <Sparkles className="h-5 w-5 text-violet-500" />
                  </div>
                  Ask LogGPT
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; dot: string }> = {
    pending: { 
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", 
      dot: "bg-amber-500" 
    },
    approved: { 
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", 
      dot: "bg-blue-500" 
    },
    issued: { 
      className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", 
      dot: "bg-emerald-500" 
    },
    returned: { 
      className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20", 
      dot: "bg-gray-500" 
    },
    overdue: { 
      className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", 
      dot: "bg-rose-500" 
    },
    rejected: { 
      className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", 
      dot: "bg-rose-500" 
    },
  };

  const { className, dot } = config[status] || config.pending;

  return (
    <Badge variant="outline" className={cn("capitalize gap-1.5 font-medium border", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {status}
    </Badge>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
