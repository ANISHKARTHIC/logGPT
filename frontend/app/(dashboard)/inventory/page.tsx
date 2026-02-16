"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Search,
  Plus,
  Filter,
  Grid,
  List,
  Cpu,
  Radio,
  Gauge,
  Monitor,
  Wifi,
  Zap,
  Cable,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
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
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/lib/store";
import { componentsApi, transactionsApi } from "@/lib/api";
import { Component, ComponentCategory, ComponentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const categoryIcons: Record<ComponentCategory, any> = {
  microcontroller: Cpu,
  sensor: Gauge,
  actuator: Radio,
  display: Monitor,
  communication: Wifi,
  power: Zap,
  connector: Cable,
  other: Package,
};

const categoryColors: Record<ComponentCategory, string> = {
  microcontroller: "bg-blue-500/10 text-blue-500",
  sensor: "bg-green-500/10 text-green-500",
  actuator: "bg-orange-500/10 text-orange-500",
  display: "bg-purple-500/10 text-purple-500",
  communication: "bg-cyan-500/10 text-cyan-500",
  power: "bg-yellow-500/10 text-yellow-600",
  connector: "bg-pink-500/10 text-pink-500",
  other: "bg-gray-500/10 text-gray-500",
};

export default function InventoryPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const [components, setComponents] = useState<Component[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const [requestQuantity, setRequestQuantity] = useState(1);
  const [requestPurpose, setRequestPurpose] = useState("");

  const fetchComponents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await componentsApi.list({
        page,
        page_size: 20,
        category: category !== "all" ? (category as ComponentCategory) : undefined,
        search: search || undefined,
      });
      setComponents(data.components);
      setTotal(data.total);
    } catch (error) {
      console.error("Failed to fetch components:", error);
      toast({
        title: "Error",
        description: "Failed to fetch components",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [page, category, search, toast]);

  useEffect(() => {
    const debounce = setTimeout(fetchComponents, 300);
    return () => clearTimeout(debounce);
  }, [fetchComponents]);

  const handleRequest = async () => {
    if (!selectedComponent) return;

    try {
      await transactionsApi.create({
        component_id: selectedComponent.id,
        quantity: requestQuantity,
        purpose: requestPurpose,
      });
      toast({
        title: "Request submitted",
        description: `Your request for ${selectedComponent.name} has been submitted.`,
      });
      setShowRequestModal(false);
      setSelectedComponent(null);
      setRequestQuantity(1);
      setRequestPurpose("");
    } catch (error: any) {
      toast({
        title: "Request failed",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (component: Component) => {
    if (!confirm(`Are you sure you want to delete ${component.name}?`)) return;

    try {
      await componentsApi.delete(component.id);
      toast({
        title: "Component deleted",
        description: `${component.name} has been deleted.`,
      });
      fetchComponents();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete component",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {isAdmin ? "Inventory Management" : "Browse Components"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {total} components available
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Component
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search components..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="microcontroller">Microcontroller</SelectItem>
                <SelectItem value="sensor">Sensor</SelectItem>
                <SelectItem value="actuator">Actuator</SelectItem>
                <SelectItem value="display">Display</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="power">Power</SelectItem>
                <SelectItem value="connector">Connector</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Components Grid/List */}
      {isLoading ? (
        <ComponentsSkeleton viewMode={viewMode} />
      ) : components.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No components found</h3>
            <p className="mt-1 text-muted-foreground">
              {search
                ? "Try adjusting your search or filters"
                : "Start by adding some components"}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <motion.div
          layout
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {components.map((component) => (
              <ComponentCard
                key={component.id}
                component={component}
                isAdmin={isAdmin}
                onRequest={() => {
                  setSelectedComponent(component);
                  setShowRequestModal(true);
                }}
                onEdit={() => {
                  setSelectedComponent(component);
                  setShowAddModal(true);
                }}
                onDelete={() => handleDelete(component)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {components.map((component) => (
                <ComponentListItem
                  key={component.id}
                  component={component}
                  isAdmin={isAdmin}
                  onRequest={() => {
                    setSelectedComponent(component);
                    setShowRequestModal(true);
                  }}
                  onEdit={() => {
                    setSelectedComponent(component);
                    setShowAddModal(true);
                  }}
                  onDelete={() => handleDelete(component)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Component</DialogTitle>
            <DialogDescription>
              Submit a request to borrow {selectedComponent?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Component</Label>
              <Input value={selectedComponent?.name || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Available Quantity</Label>
              <Input
                value={selectedComponent?.available_quantity || 0}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Request Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={selectedComponent?.available_quantity || 1}
                value={requestQuantity}
                onChange={(e) => setRequestQuantity(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose (Optional)</Label>
              <Textarea
                id="purpose"
                placeholder="Describe why you need this component..."
                value={requestPurpose}
                onChange={(e) => setRequestPurpose(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRequest}
              disabled={
                requestQuantity < 1 ||
                requestQuantity > (selectedComponent?.available_quantity || 0)
              }
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Modal */}
      <AddComponentModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        component={selectedComponent}
        onSuccess={() => {
          fetchComponents();
          setSelectedComponent(null);
        }}
      />
    </div>
  );
}

function ComponentCard({
  component,
  isAdmin,
  onRequest,
  onEdit,
  onDelete,
}: {
  component: Component;
  isAdmin: boolean;
  onRequest: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = categoryIcons[component.category];
  const colorClass = categoryColors[component.category];
  const availabilityPercent =
    (component.available_quantity / component.total_quantity) * 100;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group h-full overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className={cn("rounded-lg p-2", colorClass)}>
              <Icon className="h-5 w-5" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onRequest}>
                  <Eye className="mr-2 h-4 w-4" />
                  Request
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-red-500"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardTitle className="mt-3 text-lg">{component.name}</CardTitle>
          {component.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {component.description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Availability</span>
              <span className="font-medium">
                {component.available_quantity} / {component.total_quantity}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full transition-all",
                  availabilityPercent > 50
                    ? "bg-green-500"
                    : availabilityPercent > 20
                    ? "bg-yellow-500"
                    : "bg-red-500"
                )}
                style={{ width: `${availabilityPercent}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="capitalize">
                {component.category}
              </Badge>
              {component.location && (
                <Badge variant="outline">{component.location}</Badge>
              )}
            </div>
            <Button
              className="w-full"
              variant={component.available_quantity > 0 ? "default" : "secondary"}
              disabled={component.available_quantity === 0}
              onClick={onRequest}
            >
              {component.available_quantity > 0 ? "Request" : "Out of Stock"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ComponentListItem({
  component,
  isAdmin,
  onRequest,
  onEdit,
  onDelete,
}: {
  component: Component;
  isAdmin: boolean;
  onRequest: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = categoryIcons[component.category];
  const colorClass = categoryColors[component.category];

  return (
    <div className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-accent/50">
      <div className="flex items-center gap-4">
        <div className={cn("rounded-lg p-2", colorClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-medium">{component.name}</h3>
          <p className="text-sm text-muted-foreground capitalize">
            {component.category}
            {component.location && ` • ${component.location}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-medium">
            {component.available_quantity} / {component.total_quantity}
          </p>
          <p className="text-sm text-muted-foreground">available</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={component.available_quantity === 0}
            onClick={onRequest}
          >
            Request
          </Button>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-500">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}

function AddComponentModal({
  open,
  onOpenChange,
  component,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  component: Component | null;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const isEditing = !!component;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "microcontroller" as ComponentCategory,
    total_quantity: 1,
    available_quantity: 1,
    location: "",
    tags: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (component) {
      setFormData({
        name: component.name,
        description: component.description || "",
        category: component.category,
        total_quantity: component.total_quantity,
        available_quantity: component.available_quantity,
        location: component.location || "",
        tags: component.tags.join(", "),
      });
    } else {
      setFormData({
        name: "",
        description: "",
        category: "microcontroller",
        total_quantity: 1,
        available_quantity: 1,
        location: "",
        tags: "",
      });
    }
  }, [component]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = {
        ...formData,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };

      if (isEditing && component) {
        await componentsApi.update(component.id, data);
        toast({ title: "Component updated" });
      } else {
        await componentsApi.create(data);
        toast({ title: "Component created" });
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Component" : "Add Component"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value: ComponentCategory) =>
                setFormData({ ...formData, category: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="microcontroller">Microcontroller</SelectItem>
                <SelectItem value="sensor">Sensor</SelectItem>
                <SelectItem value="actuator">Actuator</SelectItem>
                <SelectItem value="display">Display</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="power">Power</SelectItem>
                <SelectItem value="connector">Connector</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total">Total Quantity</Label>
              <Input
                id="total"
                type="number"
                min={1}
                value={formData.total_quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    total_quantity: Number(e.target.value),
                  })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="available">Available</Label>
              <Input
                id="available"
                type="number"
                min={0}
                max={formData.total_quantity}
                value={formData.available_quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    available_quantity: Number(e.target.value),
                  })
                }
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Shelf A, Drawer 2"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              placeholder="e.g., arduino, wireless, iot"
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isEditing
                ? "Update"
                : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ComponentsSkeleton({ viewMode }: { viewMode: "grid" | "list" }) {
  if (viewMode === "list") {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="mt-3 h-5 w-32" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
