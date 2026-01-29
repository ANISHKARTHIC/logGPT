"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bot, Eye, EyeOff, Loader2, ArrowLeft, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
        variant: "default",
      });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-primary/90 via-primary to-purple-700 p-12 lg:flex"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Bot className="h-7 w-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">LogGPT</span>
        </div>

        <div className="space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold leading-tight text-white"
          >
            Manage your hardware
            <br />
            components with AI
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-white/80"
          >
            Track inventory, manage issues and returns, and get instant answers
            with our AI-powered assistant.
          </motion.p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-10 w-10 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur"
                />
              ))}
            </div>
            <span className="text-sm text-white/80">
              Join 500+ students and admins
            </span>
          </div>
        </div>
      </motion.div>

      {/* Right side - Login form */}
      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Bot className="h-7 w-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">LogGPT</span>
          </div>

          {/* Return to Kiosk button */}
          <Link
            href="/kiosk"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <Boxes className="h-4 w-4" />
            Return to Kiosk
          </Link>

          <Card className="border-0 shadow-2xl lg:border">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="h-11 w-full text-base"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link
                    href="/register"
                    className="font-medium text-primary hover:underline"
                  >
                    Sign up
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
