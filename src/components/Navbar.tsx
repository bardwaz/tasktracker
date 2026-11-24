"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ISafeUser } from "@/types";
import {
  CheckSquare,
  Users,
  LogOut,
  Layers,
  Menu,
  X,
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showPWANotification,
  registerServiceWorker,
} from "@/lib/notifications";

interface NavbarProps {
  user: ISafeUser;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    registerServiceWorker();
    if (isNotificationSupported()) {
      setNotificationPermission(getNotificationPermission());
    }
  }, []);

  const handleToggleNotifications = async () => {
    if (!isNotificationSupported()) {
      alert("Push notifications are not supported on this browser.");
      return;
    }

    if (notificationPermission !== "granted") {
      const perm = await requestNotificationPermission();
      setNotificationPermission(perm);
      if (perm === "granted") {
        showPWANotification("🔔 TaskTracker Notifications Enabled!", {
          body: "You will now receive lock screen and desktop alerts for new tasks and team comments.",
        });
      }
    } else {
      setShowNotificationMenu(!showNotificationMenu);
    }
  };

  const handleSendTestNotification = async () => {
    setTestSent(true);
    await showPWANotification("📋 TaskTracker Test Alert", {
      body: `Hi ${user.name}! PWA push notification is working perfectly on your device.`,
    });
    setTimeout(() => setTestSent(false), 3000);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const isAdmin = user.role === "ADMIN";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-6">
          <Link
            href="/tasks"
            className="flex items-center space-x-2 text-indigo-600 font-bold text-xl tracking-tight"
          >
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <CheckSquare className="w-5 h-5" />
            </div>
            <span>TaskTracker</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/tasks"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === "/tasks"
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Task View
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                  pathname === "/admin"
                    ? "bg-purple-50 text-purple-700 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Users className="w-4 h-4 text-purple-600" />
                <span>Admin View</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Desktop Profile & Notification Controls */}
        <div className="hidden md:flex items-center space-x-3">
          {/* PWA Notification Bell */}
          <div className="relative">
            <button
              onClick={handleToggleNotifications}
              className={`relative p-2 rounded-lg transition-colors border ${
                notificationPermission === "granted"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : notificationPermission === "denied"
                  ? "bg-slate-100 text-slate-400 border-slate-200"
                  : "bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 animate-pulse"
              }`}
              title={
                notificationPermission === "granted"
                  ? "PWA Notifications Active (Click to manage)"
                  : notificationPermission === "denied"
                  ? "Notifications Blocked in Browser Settings"
                  : "Enable PWA Notifications"
              }
            >
              {notificationPermission === "granted" ? (
                <BellRing className="w-4 h-4" />
              ) : notificationPermission === "denied" ? (
                <BellOff className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}

              {notificationPermission === "default" && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
              )}
            </button>

            {/* Notification Menu Popup */}
            {showNotificationMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-1.5">
                    <BellRing className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">PWA Notifications</span>
                  </div>
                  <button
                    onClick={() => setShowNotificationMenu(false)}
                    className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                  >
                    &times;
                  </button>
                </div>

                <div className="my-3 text-xs text-slate-600">
                  <div className="flex items-center space-x-1.5 font-medium text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Native alerts active for new task assignments & comments.</span>
                  </div>
                </div>

                <button
                  onClick={handleSendTestNotification}
                  disabled={testSent}
                  className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{testSent ? "Test Alert Sent!" : "Send Test Notification"}</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3 text-right">
            <div>
              <div className="text-sm font-semibold text-slate-800 leading-tight">
                {user.name}
              </div>
              <div className="text-xs text-slate-500">{user.title || user.email}</div>
            </div>

            {/* Level Badge */}
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center space-x-1 shadow-xs ${
                isAdmin
                  ? "bg-purple-100 text-purple-800 border-purple-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
              title={`Precedence Level: ${user.level} (Can assign tasks to any level < ${user.level})`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Level {user.level}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log out"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Header Controls */}
        <div className="flex md:hidden items-center space-x-2">
          {/* Mobile Notification Button */}
          <button
            onClick={handleToggleNotifications}
            className={`p-1.5 rounded-lg border text-xs ${
              notificationPermission === "granted"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-indigo-50 text-indigo-600 border-indigo-200"
            }`}
            title="PWA Notifications"
          >
            {notificationPermission === "granted" ? (
              <BellRing className="w-4 h-4" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
          </button>

          {/* Quick Level Badge on Mobile */}
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
              isAdmin
                ? "bg-purple-100 text-purple-800 border-purple-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            L{user.level}
          </span>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg">
          {/* User Info Card on Mobile */}
          <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
            <div>
              <div className="text-sm font-bold text-slate-900">{user.name}</div>
              <div className="text-xs text-slate-500">{user.email}</div>
              {user.title && <div className="text-[11px] text-indigo-600 font-medium">{user.title}</div>}
            </div>
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                isAdmin
                  ? "bg-purple-100 text-purple-800 border-purple-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              Level {user.level}
            </div>
          </div>

          {/* PWA Notification Option in Mobile Menu */}
          <div className="p-2.5 bg-indigo-50/60 rounded-lg border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-medium text-slate-700">
              <BellRing className="w-4 h-4 text-indigo-600" />
              <span>PWA Notifications: {notificationPermission === "granted" ? "Active" : "Disabled"}</span>
            </div>
            {notificationPermission !== "granted" ? (
              <button
                onClick={handleToggleNotifications}
                className="px-2.5 py-1 bg-indigo-600 text-white rounded text-[11px] font-semibold"
              >
                Enable
              </button>
            ) : (
              <button
                onClick={handleSendTestNotification}
                className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-semibold"
              >
                Test Alert
              </button>
            )}
          </div>

          {/* Navigation links */}
          <div className="space-y-1">
            <Link
              href="/tasks"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                pathname === "/tasks"
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <CheckSquare className="w-4 h-4 text-indigo-600" />
              <span>Task View</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                  pathname === "/admin"
                    ? "bg-purple-50 text-purple-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Users className="w-4 h-4 text-purple-600" />
                <span>Admin View (Precedence)</span>
              </Link>
            )}
          </div>

          {/* Mobile Logout */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
