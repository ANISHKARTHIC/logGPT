"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  User,
  Bell,
  Moon,
  Sun,
  Shield,
  LogOut,
  Save,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore, useThemeStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { toast } = useToast();
  const router = useRouter();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    requests: true,
    overdue: true,
  });

  const handleSaveProfile = () => {
    toast({
      title: "Profile updated",
      description: "Your profile has been saved successfully.",
    });
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Sun className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{user?.name}</h3>
                  <p className="text-muted-foreground capitalize">{user?.role}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleSaveProfile}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how LogGPT looks on your device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Theme</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { value: "light" as const, label: "Light", icon: Sun },
                    { value: "dark" as const, label: "Dark", icon: Moon },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
                        theme === option.value
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted hover:border-muted-foreground/20"
                      )}
                    >
                      <option.icon className="h-6 w-6" />
                      <span className="font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications for important updates
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, email: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications in your browser
                    </p>
                  </div>
                  <Switch
                    checked={notifications.push}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, push: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Request Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when your requests are approved or rejected
                    </p>
                  </div>
                  <Switch
                    checked={notifications.requests}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, requests: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Overdue Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive reminders for items that are due or overdue
                    </p>
                  </div>
                  <Switch
                    checked={notifications.overdue}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, overdue: checked }))
                    }
                  />
                </div>
              </div>

              <Button onClick={handleSaveProfile}>
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password regularly for better security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" />
                </div>
                <Button>Update Password</Button>
              </CardContent>
            </Card>

            <Card className="border-red-500/20">
              <CardHeader>
                <CardTitle className="text-red-500">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible and destructive actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                  <div className="space-y-0.5">
                    <p className="font-medium">Sign out of all devices</p>
                    <p className="text-sm text-muted-foreground">
                      This will sign you out from all devices
                    </p>
                  </div>
                  <Button variant="outline" className="text-red-500">
                    Sign out all
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                  <div className="space-y-0.5">
                    <p className="font-medium">Log out</p>
                    <p className="text-sm text-muted-foreground">
                      Sign out of your current session
                    </p>
                  </div>
                  <Button variant="destructive" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
