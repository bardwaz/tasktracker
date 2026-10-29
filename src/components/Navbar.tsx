"use client";

import { useState } from "react";
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
  Phone,
} from "lucide-react";

interface NavbarProps {
  user: ISafeUser;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

        {/* Desktop Profile & Logout */}
        <div className="hidden md:flex items-center space-x-4">
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

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center space-x-2">
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
