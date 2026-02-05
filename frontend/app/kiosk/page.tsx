"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Search,
  ArrowRight,
  ArrowLeft,
  User,
  Hash,
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  MapPin,
  Loader2,
  Boxes,
  Activity,
  AlertTriangle,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { kioskApi, KioskComponent, BorrowedItem, KioskStats } from "@/lib/api";

type KioskMode = "home" | "borrow" | "return" | "success" | "error" | "chat";

interface CartItem {
  component: KioskComponent;
  quantity: number;
}

export default function KioskPage() {
  const router = useRouter();
  const [mode, setMode] = useState<KioskMode>("home");
  const [stats, setStats] = useState<KioskStats | null>(null);
  const [components, setComponents] = useState<KioskComponent[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Borrow flow state
  const [rollNumber, setRollNumber] = useState("");
  const [studentName, setStudentName] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  // Return flow state
  const [borrowedItems, setBorrowedItems] = useState<BorrowedItem[]>([]);

  // Result state
  const [resultMessage, setResultMessage] = useState("");
  const [resultType, setResultType] = useState<"success" | "error">("success");
  const [borrowResults, setBorrowResults] = useState<{ name: string; success: boolean; message: string }[]>([]);

  useEffect(() => {
    loadStats();
    loadCategories();
  }, []);

  useEffect(() => {
    if (mode === "borrow") {
      loadComponents();
    }
  }, [mode, selectedCategory, searchQuery]);

  const loadStats = async () => {
    try {
      const data = await kioskApi.getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await kioskApi.getCategories();
      setCategories(data.categories);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const loadComponents = async () => {
    setLoading(true);
    try {
      const data = await kioskApi.getComponents(searchQuery || undefined, selectedCategory || undefined);
      setComponents(data.components);
    } catch (error) {
      console.error("Failed to load components:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cart functions
  const addToCart = (component: KioskComponent) => {
    const existing = cart.find((item) => item.component.id === component.id);
    if (existing) {
      // Increase quantity if available
      if (existing.quantity < component.available_quantity) {
        setCart(
          cart.map((item) =>
            item.component.id === component.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      }
    } else {
      setCart([...cart, { component, quantity: 1 }]);
    }
  };

  const removeFromCart = (componentId: string) => {
    setCart(cart.filter((item) => item.component.id !== componentId));
  };

  const updateCartQuantity = (componentId: string, delta: number) => {
    setCart(
      cart.map((item) => {
        if (item.component.id === componentId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return item;
          if (newQty > item.component.available_quantity) return item;
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const isInCart = (componentId: string) => {
    return cart.some((item) => item.component.id === componentId);
  };

  const getCartQuantity = (componentId: string) => {
    const item = cart.find((item) => item.component.id === componentId);
    return item?.quantity || 0;
  };

  const handleBorrowAll = async () => {
    if (!rollNumber || !studentName || cart.length === 0) return;

    setLoading(true);
    const results: { name: string; success: boolean; message: string }[] = [];

    for (const item of cart) {
      try {
        const result = await kioskApi.borrow({
          roll_number: rollNumber,
          name: studentName,
          component_id: item.component.id,
          quantity: item.quantity,
        });
        results.push({
          name: item.component.name,
          success: true,
          message: `${item.quantity}x borrowed successfully`,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed";
        results.push({
          name: item.component.name,
          success: false,
          message: errorMessage,
        });
      }
    }

    setBorrowResults(results);
    const allSuccess = results.every((r) => r.success);
    const successCount = results.filter((r) => r.success).length;

    if (allSuccess) {
      setResultMessage(`Successfully borrowed ${cart.length} component(s)!`);
      setResultType("success");
    } else if (successCount > 0) {
      setResultMessage(`Borrowed ${successCount}/${cart.length} components. Some items failed.`);
      setResultType("success");
    } else {
      setResultMessage("Failed to borrow components.");
      setResultType("error");
    }

    setMode("success");
    loadStats();
    setLoading(false);
  };

  const handleReturn = async (transactionId: string) => {
    setLoading(true);
    try {
      const result = await kioskApi.returnItem(transactionId);
      // Refresh the borrowed items list
      await lookupStudent();
      setResultMessage(result.message);
      setResultType("success");
      // Don't go to success screen, stay on return to return more items
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to return component";
      setResultMessage(errorMessage);
      setResultType("error");
      setMode("error");
    } finally {
      setLoading(false);
    }
  };

  const lookupStudent = async () => {
    if (!rollNumber) return;

    setLoading(true);
    try {
      const data = await kioskApi.getBorrowed(rollNumber);
      setBorrowedItems(data.items);
      if (data.name) setStudentName(data.name);
    } catch (error) {
      console.error("Failed to lookup student:", error);
      setBorrowedItems([]);
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setRollNumber("");
    setStudentName("");
    setCart([]);
    setBorrowedItems([]);
    setSearchQuery("");
    setSelectedCategory("");
    setBorrowResults([]);
    setResultMessage("");
    setMode("home");
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <AnimatePresence mode="wait">
        {/* HOME SCREEN */}
        {mode === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-6xl mx-auto"
          >
            {/* Header */}
            <div className="text-center mb-12">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center gap-3 mb-4"
              >
                <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl">
                  <Boxes className="h-12 w-12" />
                </div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Components Room
                </h1>
              </motion.div>
              <p className="text-xl text-slate-400">IoT & Hardware Management Kiosk</p>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-4 gap-4 mb-12">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6 text-center">
                    <Package className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                    <div className="text-3xl font-bold">{stats.total_components}</div>
                    <div className="text-slate-400 text-sm">Total Components</div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6 text-center">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                    <div className="text-3xl font-bold">{stats.available_components}</div>
                    <div className="text-slate-400 text-sm">Available</div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6 text-center">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
                    <div className="text-3xl font-bold">{stats.active_borrows}</div>
                    <div className="text-slate-400 text-sm">Active Borrows</div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6 text-center">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                    <div className="text-3xl font-bold">{stats.overdue_items}</div>
                    <div className="text-slate-400 text-sm">Overdue</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Main Actions */}
            <div className="grid grid-cols-3 gap-8 max-w-6xl mx-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setMode("borrow")}
                className="p-12 bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl shadow-xl hover:shadow-green-500/25 transition-all"
              >
                <ArrowRight className="h-20 w-20 mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-2">Borrow Components</h2>
                <p className="text-green-200">Select multiple components</p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setMode("return")}
                className="p-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-xl hover:shadow-blue-500/25 transition-all"
              >
                <RotateCcw className="h-20 w-20 mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-2">Return Components</h2>
                <p className="text-blue-200">Return borrowed items</p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push("/kiosk/chat")}
                className="p-12 bg-gradient-to-br from-purple-600 to-pink-700 rounded-3xl shadow-xl hover:shadow-purple-500/25 transition-all"
              >
                <Brain className="h-20 w-20 mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-2">Ask GPT</h2>
                <p className="text-purple-200">Get AI assistance</p>
              </motion.button>
            </div>

            {/* Recent Activity */}
            {stats && stats.recent_activity.length > 0 && (
              <div className="mt-12 max-w-4xl mx-auto">
                <h3 className="text-xl font-semibold mb-4 text-slate-300">Recent Activity</h3>
                <div className="space-y-2">
                  {stats.recent_activity.slice(0, 5).map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-3 bg-slate-800/30 rounded-lg text-sm"
                    >
                      {activity.type === "borrow" ? (
                        <ArrowRight className="h-5 w-5 text-green-400" />
                      ) : (
                        <RotateCcw className="h-5 w-5 text-blue-400" />
                      )}
                      <span className="font-medium">{activity.student}</span>
                      <span className="text-slate-400">
                        {activity.type === "borrow" ? "borrowed" : "returned"}
                      </span>
                      <span className="text-white">{activity.component}</span>
                      <span className="text-slate-500 ml-auto text-xs">
                        {new Date(activity.time).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Link */}
            <div className="text-center mt-12">
              <a
                href="/login"
                className="text-slate-500 hover:text-slate-300 text-sm underline"
              >
                Admin Login →
              </a>
            </div>
          </motion.div>
        )}

        {/* BORROW FLOW - Multi-Component Cart */}
        {mode === "borrow" && (
          <motion.div
            key="borrow"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="max-w-7xl mx-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetState}
                  className="text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-3xl font-bold">Borrow Components</h1>
              </div>
              {/* Cart Badge */}
              <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full">
                <ShoppingCart className="h-5 w-5 text-green-400" />
                <span className="font-bold text-lg">{totalCartItems}</span>
                <span className="text-slate-400">items</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Left: Student Info & Cart */}
              <div className="space-y-4">
                {/* Student Info */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Student Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Roll Number</label>
                      <Input
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                        placeholder="e.g., 21CS001"
                        className="bg-slate-900 border-slate-600 h-10"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Name</label>
                      <Input
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="Your full name"
                        className="bg-slate-900 border-slate-600 h-10"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Cart */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-green-400" />
                      Your Cart ({cart.length} items)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cart.length === 0 ? (
                      <p className="text-slate-500 text-center py-4">
                        Click on components to add them
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {cart.map((item) => (
                          <div
                            key={item.component.id}
                            className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate text-sm">{item.component.name}</p>
                              <p className="text-xs text-slate-400">{item.component.category}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => updateCartQuantity(item.component.id, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-sm">{item.quantity}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => updateCartQuantity(item.component.id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-400 hover:text-red-300"
                                onClick={() => removeFromCart(item.component.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Borrow Button */}
                <Button
                  className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
                  disabled={!rollNumber || !studentName || cart.length === 0 || loading}
                  onClick={handleBorrowAll}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Confirm Borrow ({totalCartItems} items)
                    </>
                  )}
                </Button>
              </div>

              {/* Middle & Right: Component Search & Grid */}
              <div className="col-span-2 space-y-4">
                {/* Search & Categories */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-4">
                    <div className="flex gap-4 mb-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search components..."
                          className="bg-slate-900 border-slate-600 pl-10"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={selectedCategory === "" ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedCategory("")}
                      >
                        All
                      </Badge>
                      {categories.map((cat) => (
                        <Badge
                          key={cat}
                          variant={selectedCategory === cat ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Component Grid */}
                <div className="bg-slate-800/30 rounded-2xl p-4 max-h-[calc(100vh-280px)] overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {components.map((component) => {
                        const inCart = isInCart(component.id);
                        const cartQty = getCartQuantity(component.id);
                        return (
                          <motion.div
                            key={component.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`p-4 rounded-xl transition-all cursor-pointer ${
                              inCart
                                ? "bg-green-600/30 ring-2 ring-green-500"
                                : "bg-slate-700/50 hover:bg-slate-700"
                            }`}
                            onClick={() => addToCart(component)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm">{component.name}</h4>
                                <p className="text-xs text-slate-400">{component.category}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge
                                  variant={component.available_quantity > 0 ? "default" : "destructive"}
                                  className="text-xs"
                                >
                                  {component.available_quantity} left
                                </Badge>
                                {inCart && (
                                  <Badge variant="secondary" className="text-xs bg-green-600">
                                    {cartQty} in cart
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {component.location && (
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {component.location}
                              </p>
                            )}
                          </motion.div>
                        );
                      })}
                      {components.length === 0 && (
                        <div className="col-span-3 text-center py-12 text-slate-500">
                          No components found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* RETURN FLOW */}
        {mode === "return" && (
          <motion.div
            key="return"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-4 mb-8">
              <Button
                variant="ghost"
                size="icon"
                onClick={resetState}
                className="text-slate-400 hover:text-white"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-3xl font-bold">Return Components</h1>
            </div>

            {/* Roll Number Lookup */}
            <Card className="bg-slate-800/50 border-slate-700 mb-6">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm text-slate-400 mb-1 block">Enter Your Roll Number</label>
                    <Input
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                      placeholder="e.g., 21CS001"
                      className="bg-slate-900 border-slate-600 text-lg h-12"
                      onKeyDown={(e) => e.key === "Enter" && lookupStudent()}
                    />
                  </div>
                  <Button
                    className="h-12 mt-6 px-8"
                    onClick={lookupStudent}
                    disabled={!rollNumber || loading}
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Look Up"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Success message for returns */}
            {resultMessage && resultType === "success" && (
              <div className="mb-4 p-4 bg-green-600/20 border border-green-600/50 rounded-lg flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-green-300">{resultMessage}</span>
              </div>
            )}

            {/* Borrowed Items */}
            {rollNumber && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Hash className="h-5 w-5 text-blue-400" />
                  {studentName && <span>{studentName}</span>}
                  <span className="text-slate-400">({rollNumber})</span>
                </h2>

                {borrowedItems.length > 0 ? (
                  <div className="grid gap-4">
                    {borrowedItems.map((item) => (
                      <Card key={item.transaction_id} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">{item.component_name}</h3>
                              <p className="text-slate-400">Quantity: {item.quantity}</p>
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3" />
                                Borrowed: {new Date(item.borrowed_at).toLocaleDateString()}
                              </p>
                              {item.location && (
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  Return to: {item.location}
                                </p>
                              )}
                            </div>
                            <Button
                              onClick={() => handleReturn(item.transaction_id)}
                              disabled={loading}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Return
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-slate-800/30 border-slate-700">
                    <CardContent className="py-12 text-center">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                      <p className="text-lg">No items currently borrowed</p>
                      <p className="text-slate-400">All clear! Nothing to return.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* SUCCESS / ERROR SCREEN */}
        {(mode === "success" || mode === "error") && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="max-w-xl mx-auto flex flex-col items-center justify-center min-h-[80vh]"
          >
            <div
              className={`p-8 rounded-full mb-8 ${
                resultType === "success" ? "bg-green-600/20" : "bg-red-600/20"
              }`}
            >
              {resultType === "success" ? (
                <CheckCircle className="h-24 w-24 text-green-400" />
              ) : (
                <XCircle className="h-24 w-24 text-red-400" />
              )}
            </div>
            <h1 className="text-3xl font-bold mb-4">
              {resultType === "success" ? "Success!" : "Error"}
            </h1>
            <p className="text-xl text-slate-400 text-center mb-6">{resultMessage}</p>

            {/* Show individual results if multiple borrows */}
            {borrowResults.length > 0 && (
              <div className="w-full mb-6 space-y-2">
                {borrowResults.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      result.success ? "bg-green-600/20" : "bg-red-600/20"
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                    )}
                    <span className="font-medium">{result.name}</span>
                    <span className="text-sm text-slate-400 ml-auto">{result.message}</span>
                  </div>
                ))}
              </div>
            )}

            <Button
              size="lg"
              onClick={resetState}
              className="h-14 px-12 text-lg"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Home
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
