"use client";

import React, { useEffect, useState } from "react";
import {
  Settings,
  Shield,
  Download,
  Trash2,
  KeyRound,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Sun,
  Moon,
  Copy,
  Check,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function SettingsPage() {
  const { user, t, language, setLanguage, theme, setTheme, refreshUser, logout } = useApp();

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // 2FA state
  const [twoFactorData, setTwoFactorData] = useState<any>(null);
  const [totpInputCode, setTotpInputCode] = useState("");
  const [twoFactorBackupCodes, setTwoFactorBackupCodes] = useState<string[]>([]);
  const [twoFactorMsg, setTwoFactorMsg] = useState<string | null>(null);
  const [is2FASetupOpen, setIs2FASetupOpen] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionMsg, setSessionMsg] = useState<string | null>(null);

  // Account Deletion state
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setTimezone(user.timezone || "UTC");
    }
    fetchSessions();
  }, [user]);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/v1/user/sessions");
      const data = await res.json();
      if (data.sessions) setSessions(data.sessions);
    } catch {}
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);

    const res = await fetch("/api/v1/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, timezone, language, theme }),
    });

    if (res.ok) {
      setProfileMsg("Profile preferences saved successfully.");
      await refreshUser();
      setTimeout(() => setProfileMsg(null), 3000);
    }
  };

  const start2FASetup = async () => {
    const res = await fetch("/api/v1/auth/2fa");
    const data = await res.json();
    setTwoFactorData(data);
    setIs2FASetupOpen(true);
    setTwoFactorMsg(null);
  };

  const verify2FA = async () => {
    if (!twoFactorData || !totpInputCode.trim()) return;

    const res = await fetch("/api/v1/auth/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: twoFactorData.secret,
        code: totpInputCode.trim(),
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setTwoFactorBackupCodes(data.backupCodes || []);
      setTwoFactorMsg("Two-Factor Authentication is now enabled!");
      await refreshUser();
    } else {
      setTwoFactorMsg(data.error || "Failed to verify code");
    }
  };

  const disable2FA = async () => {
    if (confirm("Are you sure you want to disable Two-Factor Authentication?")) {
      const res = await fetch("/api/v1/auth/2fa", { method: "DELETE" });
      if (res.ok) {
        setIs2FASetupOpen(false);
        setTwoFactorData(null);
        await refreshUser();
      }
    }
  };

  const handleRevokeSessions = async () => {
    const res = await fetch("/api/v1/user/sessions", { method: "POST" });
    if (res.ok) {
      setSessionMsg("All other sessions revoked.");
      fetchSessions();
      setTimeout(() => setSessionMsg(null), 3000);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);

    const res = await fetch("/api/v1/user/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: deletePassword,
        confirmationText: deleteConfirmation,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      alert("Your account and data have been permanently deleted.");
      window.location.href = "/";
    } else {
      setDeleteError(data.error || "Deletion failed");
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">{t.settings.title}</h1>
        <p className="text-sm text-muted-foreground">Manage profile, security defenses, sessions, and data privacy</p>
      </div>

      {/* 1. Profile Information */}
      <div className="p-6 md:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-foreground">{t.settings.profile}</h2>

        {profileMsg && <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl text-xs">{profileMsg}</div>}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Display Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Email (Permanent Identifier)</label>
              <input
                type="text"
                disabled
                value={user?.email || ""}
                className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-secondary text-muted-foreground cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">{t.settings.language}</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
              >
                <option value="en">English</option>
                <option value="ta">தமிழ் (Tamil)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">{t.settings.theme}</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System Default</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Timezone</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-sm"
          >
            Save Profile
          </button>
        </form>
      </div>

      {/* 2. Security & Two-Factor Authentication (TOTP) */}
      <div className="p-6 md:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-500" />
              <span>{t.settings.twoFactorTitle}</span>
            </h2>
            <p className="text-xs text-muted-foreground">{t.settings.twoFactorDesc}</p>
          </div>

          {user?.twoFactorEnabled ? (
            <button
              onClick={disable2FA}
              className="px-3.5 py-1.5 rounded-xl border border-destructive/30 text-destructive text-xs font-bold hover:bg-destructive/10"
            >
              Disable 2FA
            </button>
          ) : (
            <button
              onClick={start2FASetup}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-sm"
            >
              Enable 2FA
            </button>
          )}
        </div>

        {/* 2FA Setup Flow */}
        {is2FASetupOpen && !user?.twoFactorEnabled && twoFactorData && (
          <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-3 text-xs">
            <div className="font-bold text-foreground">Step 1: Add to Google Authenticator / 1Password</div>
            <p className="text-muted-foreground">
              Add the following secret key into your authenticator app:
            </p>
            <div className="p-2.5 rounded-xl bg-background border border-input font-mono font-bold text-primary select-all">
              {twoFactorData.secret}
            </div>

            <div className="font-bold text-foreground pt-2">Step 2: Enter the 6-digit confirmation code</div>
            <div className="flex gap-2 max-w-xs">
              <input
                type="text"
                maxLength={6}
                value={totpInputCode}
                onChange={(e) => setTotpInputCode(e.target.value)}
                placeholder="123456"
                className="w-32 px-3 py-1.5 text-center font-mono font-bold tracking-widest text-sm rounded-xl border border-input bg-background"
              />
              <button
                onClick={verify2FA}
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary-hover"
              >
                Verify &amp; Activate
              </button>
            </div>

            {twoFactorMsg && <div className="text-xs font-bold text-primary pt-1">{twoFactorMsg}</div>}
          </div>
        )}

        {/* Backup Codes Display */}
        {twoFactorBackupCodes.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs">
            <div className="font-bold text-amber-700 dark:text-amber-400">
              Emergency Backup Recovery Codes (Save in a secure vault!)
            </div>
            <p className="text-muted-foreground">
              Each code can be used once if you lose access to your authenticator device:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono font-bold pt-1">
              {twoFactorBackupCodes.map((c, i) => (
                <div key={i} className="p-1.5 bg-background border border-border rounded text-center">
                  {c}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Active Device Sessions */}
      <div className="p-6 md:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Laptop className="w-5 h-5 text-blue-500" />
              <span>{t.settings.sessions}</span>
            </h2>
            <p className="text-xs text-muted-foreground">Manage active authenticated browser sessions</p>
          </div>
          <button
            onClick={handleRevokeSessions}
            className="px-3.5 py-1.5 rounded-xl border border-border hover:bg-secondary text-xs font-bold text-foreground transition"
          >
            {t.settings.revokeSessions}
          </button>
        </div>

        {sessionMsg && <div className="text-xs text-emerald-500 font-semibold">{sessionMsg}</div>}

        <div className="space-y-2 pt-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="p-3.5 rounded-2xl bg-secondary/40 border border-border flex items-center justify-between text-xs"
            >
              <div className="space-y-0.5">
                <div className="font-bold text-foreground flex items-center gap-2">
                  <span>{s.userAgent?.slice(0, 50) || "Modern Web Browser"}</span>
                  {s.isCurrent && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                      Current Device
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  IP: {s.ipAddress} • Established {new Date(s.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Privacy & Data Portability (GDPR / India DPDP) */}
      <div className="p-6 md:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-500" />
            <span>GDPR &amp; India DPDP Data Portability</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Download an exhaustive, unencrypted copy of your goals, milestones, habits, gratitude notes, and timeline blocks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <a
            href="/api/v1/user/export?format=json"
            download="goalpath-data.json"
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-sm transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All Data (JSON)</span>
          </a>
          <a
            href="/api/v1/user/export?format=csv"
            download="goalpath-goals.csv"
            className="px-4 py-2 rounded-xl border border-border hover:bg-secondary text-foreground text-xs font-bold transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Export Goals (CSV)</span>
          </a>
        </div>
      </div>

      {/* 5. Account Deletion (Right to Erasure) */}
      <div className="p-6 md:p-8 rounded-3xl bg-rose-500/5 border border-rose-500/20 shadow-sm space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-rose-600 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            <span>Permanent Account Erasure</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Permanently shreds all your goals, habits, gratitude notes, and active sessions in accordance with GDPR Article 17.
          </p>
        </div>

        {deleteError && <div className="text-xs font-bold text-rose-600">{deleteError}</div>}

        <form onSubmit={handleDeleteAccount} className="space-y-3 max-w-md pt-1">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Verify Password</label>
            <input
              type="password"
              required
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Type &quot;DELETE MY ACCOUNT&quot; to confirm
            </label>
            <input
              type="text"
              required
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
              className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
            />
          </div>

          <button
            type="submit"
            disabled={deleteConfirmation !== "DELETE MY ACCOUNT" || !deletePassword}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition disabled:opacity-40"
          >
            Permanently Shred Account
          </button>
        </form>
      </div>
    </div>
  );
}
