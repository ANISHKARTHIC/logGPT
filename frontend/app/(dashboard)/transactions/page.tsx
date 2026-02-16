"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Filter,
  Search,
  MoreHorizontal,
  Check,
  X,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/lib/store";
import { transactionsApi } from "@/lib/api";
import { Transaction, TransactionStatus } from "@/lib/types";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";

const statusIcons = {
  pending: Clock,
  approved: CheckCircle,
  issued: ArrowLeftRight,
  returned: RotateCcw,
  overdue: AlertTriangle,
  rejected: XCircle,
};

const statusColors: Record<TransactionStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  approved: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  issued: "bg-green-500/10 text-green-500 border-green-500/20",
  returned: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  overdue: "bg-red-500/10 text-red-500 border-red-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function TransactionsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dueDays, setDueDays] = useState(7);
  const [rejectReason, setRejectReason] = useState("");
  const [returnCondition, setReturnCondition] = useState("");

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await transactionsApi.list({
        page,
        page_size: 20,
        status: statusFilter !== "all" ? (statusFilter as TransactionStatus) : undefined,
      });
      setTransactions(data.transactions);
      setTotal(data.total);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleApprove = async () => {
    if (!selectedTransaction) return;

    try {
      await transactionsApi.approve(selectedTransaction.id, dueDays);
      toast({
        title: "Request approved",
        description: `${selectedTransaction.component_name} has been issued to ${selectedTransaction.user_name}.`,
      });
      setShowApproveModal(false);
      setSelectedTransaction(null);
      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!selectedTransaction) return;

    try {
      await transactionsApi.reject(selectedTransaction.id, rejectReason);
      toast({
        title: "Request rejected",
        description: `Request for ${selectedTransaction.component_name} has been rejected.`,
      });
      setShowRejectModal(false);
      setSelectedTransaction(null);
      setRejectReason("");
      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Rejection failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReturn = async () => {
    if (!selectedTransaction) return;

    try {
      await transactionsApi.return(selectedTransaction.id, returnCondition);
      toast({
        title: "Return recorded",
        description: `${selectedTransaction.component_name} has been returned.`,
      });
      setShowReturnModal(false);
      setSelectedTransaction(null);
      setReturnCondition("");
      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Return failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getFilteredCount = (status: TransactionStatus) => {
    return transactions.filter((t) => t.status === status).length;
  };

  const pendingCount = transactions.filter((t) => t.status === "pending").length;
  const overdueCount = transactions.filter((t) => t.status === "overdue").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          {isAdmin ? "Transaction Management" : "My Requests"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {total} total transactions
        </p>
      </div>

      {/* Stats Cards (Admin) */}
      {isAdmin && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Pending"
            value={pendingCount}
            icon={Clock}
            color="text-yellow-500"
            bgColor="bg-yellow-500/10"
          />
          <StatsCard
            title="Issued"
            value={transactions.filter((t) => t.status === "issued").length}
            icon={ArrowLeftRight}
            color="text-green-500"
            bgColor="bg-green-500/10"
          />
          <StatsCard
            title="Overdue"
            value={overdueCount}
            icon={AlertTriangle}
            color="text-red-500"
            bgColor="bg-red-500/10"
          />
          <StatsCard
            title="Returned"
            value={transactions.filter((t) => t.status === "returned").length}
            icon={RotateCcw}
            color="text-gray-500"
            bgColor="bg-gray-500/10"
          />
        </div>
      )}

      {/* Filters */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="w-full justify-start overflow-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            Pending
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="issued">Issued</TabsTrigger>
          <TabsTrigger value="overdue" className="gap-2">
            Overdue
            {overdueCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {overdueCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="returned">Returned</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Transactions List */}
      {isLoading ? (
        <TransactionsSkeleton />
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ArrowLeftRight className="h-16 w-16 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No transactions found</h3>
            <p className="mt-1 text-muted-foreground">
              {statusFilter !== "all"
                ? "Try selecting a different filter"
                : isAdmin
                ? "No requests have been made yet"
                : "You haven't made any requests yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              isAdmin={isAdmin}
              onApprove={() => {
                setSelectedTransaction(transaction);
                setShowApproveModal(true);
              }}
              onReject={() => {
                setSelectedTransaction(transaction);
                setShowRejectModal(true);
              }}
              onReturn={() => {
                setSelectedTransaction(transaction);
                setShowReturnModal(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Approve Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              Issue {selectedTransaction?.component_name} to{" "}
              {selectedTransaction?.user_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Component:</span>
                  <span className="font-medium">
                    {selectedTransaction?.component_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-medium">
                    {selectedTransaction?.quantity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requester:</span>
                  <span className="font-medium">
                    {selectedTransaction?.user_name}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDays">Return Due (Days)</Label>
              <Select
                value={dueDays.toString()}
                onValueChange={(v) => setDueDays(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days (1 week)</SelectItem>
                  <SelectItem value="14">14 days (2 weeks)</SelectItem>
                  <SelectItem value="30">30 days (1 month)</SelectItem>
                  <SelectItem value="60">60 days (2 months)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove}>
              <Check className="mr-2 h-4 w-4" />
              Approve & Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Reject {selectedTransaction?.user_name}'s request for{" "}
              {selectedTransaction?.component_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Explain why this request is being rejected..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              <X className="mr-2 h-4 w-4" />
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Modal */}
      <Dialog open={showReturnModal} onOpenChange={setShowReturnModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Return</DialogTitle>
            <DialogDescription>
              Record the return of {selectedTransaction?.component_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Component:</span>
                  <span className="font-medium">
                    {selectedTransaction?.component_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Borrowed by:</span>
                  <span className="font-medium">
                    {selectedTransaction?.user_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issued on:</span>
                  <span className="font-medium">
                    {selectedTransaction?.issue_date &&
                      formatDate(selectedTransaction.issue_date)}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="condition">Return Condition</Label>
              <Select
                value={returnCondition}
                onValueChange={setReturnCondition}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent - Like new</SelectItem>
                  <SelectItem value="good">Good - Minor wear</SelectItem>
                  <SelectItem value="fair">Fair - Visible wear</SelectItem>
                  <SelectItem value="poor">Poor - Needs repair</SelectItem>
                  <SelectItem value="damaged">Damaged - Non-functional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleReturn} disabled={!returnCondition}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Record Return
            </Button>
          </DialogFooter>
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

function TransactionCard({
  transaction,
  isAdmin,
  onApprove,
  onReject,
  onReturn,
}: {
  transaction: Transaction;
  isAdmin: boolean;
  onApprove: () => void;
  onReject: () => void;
  onReturn: () => void;
}) {
  const StatusIcon = statusIcons[transaction.status];
  const isOverdue =
    transaction.status === "issued" &&
    transaction.due_date &&
    new Date(transaction.due_date) < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "overflow-hidden transition-all hover:shadow-md",
          isOverdue && "border-red-500/50"
        )}
      >
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Left side - Info */}
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "rounded-lg border p-2",
                  statusColors[transaction.status]
                )}
              >
                <StatusIcon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold">{transaction.component_name}</h3>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>Qty: {transaction.quantity}</span>
                  <span>•</span>
                  <span>{transaction.user_name}</span>
                  <span>•</span>
                  <span>{formatRelativeTime(transaction.created_at)}</span>
                </div>
                {transaction.purpose && (
                  <p className="text-sm text-muted-foreground">
                    Purpose: {transaction.purpose}
                  </p>
                )}
                {transaction.due_date && (
                  <p
                    className={cn(
                      "text-sm",
                      isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
                    )}
                  >
                    {isOverdue ? "Overdue since" : "Due"}: {formatDate(transaction.due_date)}
                  </p>
                )}
                {transaction.admin_notes && (
                  <p className="text-sm text-muted-foreground">
                    Note: {transaction.admin_notes}
                  </p>
                )}
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("capitalize", statusColors[transaction.status])}
              >
                {transaction.status}
              </Badge>

              {isAdmin && (
                <>
                  {transaction.status === "pending" && (
                    <>
                      <Button size="sm" onClick={onApprove}>
                        <Check className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500"
                        onClick={onReject}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}
                  {(transaction.status === "issued" ||
                    transaction.status === "overdue") && (
                    <Button size="sm" variant="outline" onClick={onReturn}>
                      <RotateCcw className="mr-1 h-4 w-4" />
                      Record Return
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Timeline indicator */}
          <div
            className={cn(
              "h-1 w-full",
              transaction.status === "pending" && "bg-yellow-500",
              transaction.status === "approved" && "bg-blue-500",
              transaction.status === "issued" && !isOverdue && "bg-green-500",
              (transaction.status === "overdue" || isOverdue) && "bg-red-500",
              transaction.status === "returned" && "bg-gray-500",
              transaction.status === "rejected" && "bg-red-500"
            )}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TransactionsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
