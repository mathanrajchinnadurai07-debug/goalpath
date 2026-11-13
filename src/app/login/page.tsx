"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Target, Lock, Mail, KeyRound, AlertCircle, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, totpCode }),
      });

      const rawText = await res.text();
      let data: { error?: string; requires2FA?: boolean } = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        setError(`Server error (${res.status}). Please try again in a moment.`);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      if (data.requires2FA) {
        setRequires2FA(true);
        return;
      }

      await refreshUser();
      router.push("/dashboard");
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    setError(null);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-card p-8 rounded-2xl border border-border shadow-sm">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-primary/25">
            <Target className="w-6 h-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-foreground">Sign in to GoalPath</h2>
          <p className="mt-1 text-sm text-muted-foreground">Continue mastering your time and ambitious goals</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-foreground">Password</label>
              <span className="text-xs text-primary hover:underline cursor-pointer">Forgot password?</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {requires2FA && (
            <div className="p-3 bg-secondary rounded-xl border border-border space-y-2">
              <label className="block text-xs font-semibold text-foreground flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-primary" />
                <span>Two-Factor Authenticator Code</span>
              </label>
              <input
                type="text"
                maxLength={9}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="6-digit code or backup code"
                className="w-full px-3 py-2 text-sm text-center font-mono tracking-widest rounded-lg border border-input bg-background"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">Enter code from Google Authenticator or a backup code.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow hover:bg-primary-hover transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{loading ? "Authenticating..." : requires2FA ? "Verify 2FA & Enter" : "Sign In"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast-fill Shortcuts */}
        <div className="pt-2 border-t border-border">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">
            Or quick sign-in as:
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => handleFillDemo("sarah.chen@example.com")}
              className="text-xs text-left p-2 rounded-lg bg-secondary/60 hover:bg-secondary flex justify-between"
            >
              <span className="font-medium text-foreground">Sarah Chen (Founder)</span>
              <span className="text-muted-foreground">sarah.chen@example.com</span>
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo("kavitha.raman@example.com")}
              className="text-xs text-left p-2 rounded-lg bg-secondary/60 hover:bg-secondary flex justify-between"
            >
              <span className="font-medium text-foreground">Dr. Kavitha Raman (தமிழ்)</span>
              <span className="text-muted-foreground">kavitha.raman@example.com</span>
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo("admin@goalpath.app")}
              className="text-xs text-left p-2 rounded-lg bg-secondary/60 hover:bg-secondary flex justify-between"
            >
              <span className="font-medium text-foreground">Admin Console</span>
              <span className="text-muted-foreground">admin@goalpath.app</span>
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Sign up for free
          </Link>
        </div>
      </div>
    </div>
  );
}
