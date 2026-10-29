"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ISafeUser } from "@/types";
import {
  CheckSquare,
  ShieldAlert,
  Users,
  LogOut,
  Layers,
  Sparkles,
} from "lucide-react";

interface NavbarProps {
  user: ISafeUser;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

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
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-6">
          <Link href="/tasks" className="flex items-center space-x-2 text-indigo-600 font-bold text-xl tracking-tight">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <CheckSquare className="w-5 h-5" />
            </div>
            <span>TaskTracker</span>
          </Link>

          {/* Navigation Links */}
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

        {/* User Profile & Actions */}
        <div className="flex items-center space-x-4">
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
      </div>
    </header>
  );
}
