"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Lock, Mail, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // First time seed states
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if database already has an admin
    fetch("/api/seed")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setHasAdmin(data.hasAdmin);
        }
      })
      .catch(() => setHasAdmin(true));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/tasks");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeAdmin = async () => {
    setSeeding(true);
    setSeedMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to initialize Admin");
      }

      setSeedMessage("Root Admin created! Auto-filled credentials below.");
      setEmail(data.adminEmail || "admin@tasktracker.local");
      setPassword("AdminPassword123!");
      setHasAdmin(true);
    } catch (err: any) {
      setError(err.message || "Initialization error");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 px-6 py-8 text-white text-center">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3 backdrop-blur-xs">
            <CheckSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">TaskTracker</h1>
          <p className="text-indigo-100 text-sm mt-1">
            Hierarchical Precedence & Organization Management
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {/* First-time setup banner */}
          {hasAdmin === false && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm">
              <div className="flex items-center space-x-2 font-semibold text-amber-800 mb-1">
                <Sparkles className="w-4 h-4" />
                <span>First Time Setup</span>
              </div>
              <p className="text-xs text-amber-700 mb-3">
                No organization accounts exist in the database yet. Click below to initialize the root Administrator (Level 100).
              </p>
              <button
                type="button"
                onClick={handleInitializeAdmin}
                disabled={seeding}
                className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition shadow-xs disabled:opacity-50"
              >
                {seeding ? "Creating Admin..." : "Initialize Root Admin Account"}
              </button>
            </div>
          )}

          {seedMessage && (
            <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{seedMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@admin"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm rounded-lg shadow-sm transition-all duration-150 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Sign In to Dashboard</span>
              )}
            </button>
          </form>

          {/* Helper hint */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Only the organization Admin can create new accounts.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Precedence rule: You can only assign tasks to team members with lower levels than yours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
