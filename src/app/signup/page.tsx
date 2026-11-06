"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Target, User, Mail, Lock, AlertCircle, ArrowRight, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function SignupPage() {
  const router = useRouter();
  const { refreshUser } = useApp();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState<"en" | "ta">("en");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError("Please satisfy all password complexity criteria.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, language }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }

      await refreshUser();
      router.push("/onboarding");
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-card p-8 rounded-2xl border border-border shadow-sm">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-primary/25">
            <Target className="w-6 h-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-foreground">Create your GoalPath account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Join thousands achieving their North Star goals</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Rivera"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Password</label>
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
            {/* Password security requirements */}
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-500 font-medium" : ""}`}>
                <Check className={`w-3.5 h-3.5 ${hasMinLength ? "opacity-100" : "opacity-30"}`} />
                <span>At least 8 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUppercase ? "text-emerald-500 font-medium" : ""}`}>
                <Check className={`w-3.5 h-3.5 ${hasUppercase ? "opacity-100" : "opacity-30"}`} />
                <span>At least one uppercase letter (A-Z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-500 font-medium" : ""}`}>
                <Check className={`w-3.5 h-3.5 ${hasNumber ? "opacity-100" : "opacity-30"}`} />
                <span>At least one number (0-9)</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Preferred Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "en" | "ta")}
              className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground"
            >
              <option value="en">English</option>
              <option value="ta">தமிழ் (Tamil)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !isPasswordValid}
            className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow hover:bg-primary-hover transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{loading ? "Creating Account..." : "Create Account & Continue"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
