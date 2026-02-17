"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  Shield,
  GraduationCap,
  MoreHorizontal,
  Mail,
  Phone,
  Package,
  AlertTriangle,
  Eye,
  UserCog,
  Ban,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";

// Mock data since we don't have a users endpoint yet
interface UserData {
  id: string;
  name: string;
  email: string;
  role: "admin" | "student";
  department?: string;
  phone?: string;
  created_at: string;
  is_active: boolean;
  active_issues: number;
  total_transactions: number;
  overdue_items: number;
}

const mockUsers: UserData[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@university.edu",
    role: "student",
    department: "Computer Science",
    phone: "+1 234 567 8900",
    created_at: "2024-01-15T10:00:00Z",
    is_active: true,
    active_issues: 3,
    total_transactions: 12,
    overdue_items: 1,
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane.smith@university.edu",
    role: "student",
    department: "Electronics",
    phone: "+1 234 567 8901",
    created_at: "2024-01-20T10:00:00Z",
    is_active: true,
    active_issues: 2,
    total_transactions: 8,
    overdue_items: 0,
  },
  {
    id: "3",
    name: "Admin User",
    email: "admin@university.edu",
    role: "admin",
    department: "IT Department",
    phone: "+1 234 567 8902",
    created_at: "2024-01-01T10:00:00Z",
    is_active: true,
    active_issues: 0,
    total_transactions: 0,
    overdue_items: 0,
  },
  {
    id: "4",
    name: "Bob Wilson",
    email: "bob.wilson@university.edu",
    role: "student",
    department: "Mechanical Engineering",
    created_at: "2024-02-01T10:00:00Z",
    is_active: true,
    active_issues: 5,
    total_transactions: 15,
    overdue_items: 2,
  },
  {
    id: "5",
    name: "Alice Brown",
    email: "alice.brown@university.edu",
    role: "student",
    department: "Computer Science",
    created_at: "2024-02-10T10:00:00Z",
    is_active: false,
    active_issues: 0,
    total_transactions: 3,
    overdue_items: 0,
  },
];

export default function UsersPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    // Redirect non-admins
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }

    // Simulate API call
    const fetchUsers = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setUsers(mockUsers);
      setIsLoading(false);
    };

    fetchUsers();
  }, [isAdmin, router]);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;
  const usersWithOverdue = users.filter((u) => u.overdue_items > 0).length;
  const totalActiveIssues = users.reduce((sum, u) => sum + u.active_issues, 0);

  const handleViewUser = (u: UserData) => {
    setSelectedUser(u);
    setShowUserModal(true);
  };

  const handleToggleStatus = (u: UserData) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === u.id ? { ...user, is_active: !user.is_active } : user
      )
    );
    toast({
      title: u.is_active ? "User deactivated" : "User activated",
      description: `${u.name}'s account has been ${
        u.is_active ? "deactivated" : "activated"
      }.`,
    });
  };

  const handleChangeRole = (u: UserData) => {
    const newRole = u.role === "admin" ? "student" : "admin";
    setUsers((prev) =>
      prev.map((user) =>
        user.id === u.id ? { ...user, role: newRole } : user
      )
    );
    toast({
      title: "Role updated",
      description: `${u.name} is now a${newRole === "admin" ? "n" : ""} ${newRole}.`,
    });
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="mt-1 text-muted-foreground">
          Manage user accounts and permissions
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={totalUsers}
          icon={Users}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <StatsCard
          title="Active Users"
          value={activeUsers}
          icon={GraduationCap}
          color="text-green-500"
          bgColor="bg-green-500/10"
        />
        <StatsCard
          title="Active Issues"
          value={totalActiveIssues}
          icon={Package}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatsCard
          title="Users with Overdue"
          value={usersWithOverdue}
          icon={AlertTriangle}
          color="text-red-500"
          bgColor="bg-red-500/10"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
            <SelectItem value="student">Students</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      {isLoading ? (
        <UsersSkeleton />
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No users found</h3>
            <p className="mt-1 text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredUsers.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              onView={() => handleViewUser(u)}
              onToggleStatus={() => handleToggleStatus(u)}
              onChangeRole={() => handleChangeRole(u)}
            />
          ))}
        </div>
      )}

      {/* User Details Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Viewing profile for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white",
                    selectedUser.role === "admin"
                      ? "bg-blue-700"
                      : "bg-blue-600"
                  )}
                >
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        selectedUser.role === "admin"
                          ? "border-blue-300 bg-blue-100 text-blue-700"
                          : "border-blue-500/20 bg-blue-500/10 text-blue-500"
                      )}
                    >
                      {selectedUser.role === "admin" ? (
                        <Shield className="mr-1 h-3 w-3" />
                      ) : (
                        <GraduationCap className="mr-1 h-3 w-3" />
                      )}
                      {selectedUser.role}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        selectedUser.is_active
                          ? "border-green-500/20 bg-green-500/10 text-green-500"
                          : "border-red-500/20 bg-red-500/10 text-red-500"
                      )}
                    >
                      {selectedUser.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 rounded-lg bg-muted p-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedUser.email}</span>
                </div>
                {selectedUser.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedUser.phone}</span>
                  </div>
                )}
                {selectedUser.department && (
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedUser.department}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-blue-500">
                    {selectedUser.active_issues}
                  </p>
                  <p className="text-xs text-muted-foreground">Active Issues</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-green-500">
                    {selectedUser.total_transactions}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total Transactions
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      selectedUser.overdue_items > 0
                        ? "text-red-500"
                        : "text-gray-500"
                    )}
                  >
                    {selectedUser.overdue_items}
                  </p>
                  <p className="text-xs text-muted-foreground">Overdue Items</p>
                </div>
              </div>

              {/* Member Since */}
              <p className="text-center text-sm text-muted-foreground">
                Member since {formatDate(selectedUser.created_at)}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  title: string;
  value: number;
  icon: any;
  color: string;
  bgColor: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={cn("rounded-lg p-2", bgColor)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UserCard({
  user,
  onView,
  onToggleStatus,
  onChangeRole,
}: {
  user: UserData;
  onView: () => void;
  onToggleStatus: () => void;
  onChangeRole: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "overflow-hidden transition-all hover:shadow-md",
          !user.is_active && "opacity-60"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white",
                  user.role === "admin" ? "bg-blue-700" : "bg-blue-600"
                )}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold">{user.name}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onChangeRole}>
                  <UserCog className="mr-2 h-4 w-4" />
                  Make {user.role === "admin" ? "Student" : "Admin"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onToggleStatus}
                  className={user.is_active ? "text-red-500" : "text-green-500"}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  {user.is_active ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "capitalize",
                user.role === "admin"
                  ? "border-blue-600/20 bg-blue-600/10 text-blue-600"
                  : "border-blue-500/20 bg-blue-500/10 text-blue-500"
              )}
            >
              {user.role === "admin" ? (
                <Shield className="mr-1 h-3 w-3" />
              ) : (
                <GraduationCap className="mr-1 h-3 w-3" />
              )}
              {user.role}
            </Badge>
            {user.department && (
              <Badge variant="secondary">{user.department}</Badge>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-blue-500">
                {user.active_issues}
              </p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-green-500">
                {user.total_transactions}
              </p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <p
                className={cn(
                  "text-lg font-semibold",
                  user.overdue_items > 0 ? "text-red-500" : "text-gray-400"
                )}
              >
                {user.overdue_items}
              </p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function UsersSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
