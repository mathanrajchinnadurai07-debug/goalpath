"use client";

import React, { useEffect, useState } from "react";
import {
  Shield,
  Users,
  Activity,
  AlertTriangle,
  Lock,
  Search,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  EyeOff,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function AdminPage() {
  const { user, t } = useApp();

  const [metrics, setMetrics] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "logs" | "flags">("users");

  const fetchAdminData = async () => {
    try {
      const [overviewRes, usersRes, logsRes, flagsRes] = await Promise.all([
        fetch("/api/v1/admin/overview"),
        fetch(`/api/v1/admin/users?search=${encodeURIComponent(search)}`),
        fetch("/api/v1/admin/audit-logs"),
        fetch("/api/v1/admin/feature-flags"),
      ]);

      const oData = await overviewRes.json();
      const uData = await usersRes.json();
      const lData = await logsRes.json();
      const fData = await flagsRes.json();

      setMetrics(oData.metrics);
      if (uData.users) setUsersList(uData.users);
      if (lData.logs) setAuditLogs(lData.logs);
      if (fData.flags) setFlags(fData.flags);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchAdminData();
    } else {
      setLoading(false);
    }
  }, [user, search]);

  const handleToggleSuspend = async (targetUserId: string, currentSuspended: boolean) => {
    const res = await fetch("/api/v1/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: targetUserId, isSuspended: !currentSuspended }),
    });
    if (res.ok) {
      fetchAdminData();
    }
  };

  const handleToggleFlag = async (key: string, currentEnabled: boolean) => {
    const res = await fetch("/api/v1/admin/feature-flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, isEnabled: !currentEnabled }),
    });
    if (res.ok) {
      fetchAdminData();
    }
  };

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-16 bg-card rounded-3xl border border-destructive/30 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-xs text-muted-foreground">
          The Admin Console requires role elevated privileges. Use the top demo bar to switch to &quot;Admin&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 text-xs font-bold mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Role-Protected Admin Console</span>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">{t.admin.title}</h1>
          <p className="text-sm text-muted-foreground">{t.admin.subtitle}</p>
        </div>

        {/* Zero-Knowledge & Anti-Impersonation Security Pill */}
        <div className="p-3 bg-secondary/70 rounded-2xl border border-border text-xs flex items-center gap-2 self-start md:self-auto">
          <EyeOff className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-semibold text-foreground">
            Zero-Knowledge: Private user goals and journals are strictly masked from admin access. Impersonation is blocked.
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase">{t.admin.users}</span>
          <div className="text-2xl font-black text-foreground mt-1">{metrics?.totalUsers ?? 0}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Total accounts</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase">{t.admin.activeToday}</span>
          <div className="text-2xl font-black text-foreground mt-1">{metrics?.activeToday ?? 0}</div>
          <div className="text-[11px] text-emerald-500 font-semibold mt-0.5">Active sessions</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase">{t.admin.errorRate}</span>
          <div className="text-2xl font-black text-emerald-500 mt-1">{metrics?.systemErrorRate ?? "0.00%"}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Uptime: {metrics?.uptime ?? "99.99%"}</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Audit Events</span>
          <div className="text-2xl font-black text-foreground mt-1">{metrics?.totalAuditLogs ?? 0}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Tamper-evident logs</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTab === "users" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Governance ({usersList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTab === "logs" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{t.admin.auditLogs} ({auditLogs.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("flags")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTab === "flags" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>{t.admin.featureFlags} ({flags.length})</span>
        </button>
      </div>

      {/* Tab: USERS GOVERNANCE */}
      {activeTab === "users" && (
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-bold text-sm text-foreground">Registered Member Accounts</h3>
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-input bg-background"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">2FA</th>
                  <th className="py-2.5 px-3">Total Goals</th>
                  <th className="py-2.5 px-3">Total Habits</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-secondary/40 transition">
                    <td className="py-3 px-3">
                      <div className="font-bold text-foreground">{u.name}</div>
                      <div className="text-[11px] text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-secondary">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {u.twoFactorEnabled ? (
                        <span className="text-emerald-500 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Disabled</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold">{u._count?.goals ?? 0}</td>
                    <td className="py-3 px-3 font-semibold">{u._count?.habits ?? 0}</td>
                    <td className="py-3 px-3">
                      {u.isSuspended ? (
                        <span className="text-rose-500 font-bold px-2 py-0.5 rounded bg-rose-500/10">Suspended</span>
                      ) : (
                        <span className="text-emerald-500 font-bold px-2 py-0.5 rounded bg-emerald-500/10">Active</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {u.id !== user.id && (
                        <button
                          onClick={() => handleToggleSuspend(u.id, u.isSuspended)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                            u.isSuspended
                              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                              : "bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white"
                          }`}
                        >
                          {u.isSuspended ? "Reactivate" : "Suspend"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: AUDIT LOGS */}
      {activeTab === "logs" && (
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-foreground">Tamper-Evident Security Audit Logs</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold">
                  <th className="py-2 px-2">Timestamp</th>
                  <th className="py-2 px-2">Actor</th>
                  <th className="py-2 px-2">Action</th>
                  <th className="py-2 px-2">Resource</th>
                  <th className="py-2 px-2">Details</th>
                  <th className="py-2 px-2">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/40">
                    <td className="py-2 px-2 text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 font-bold text-foreground">{log.actorEmail}</td>
                    <td className="py-2 px-2 text-primary font-bold">{log.action}</td>
                    <td className="py-2 px-2">{log.resource}</td>
                    <td className="py-2 px-2 text-muted-foreground max-w-xs truncate">{log.details || "-"}</td>
                    <td className="py-2 px-2 text-muted-foreground">{log.ipAddress || "127.0.0.1"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: FEATURE FLAGS */}
      {activeTab === "flags" && (
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-foreground">Dynamic Feature Switches</h3>
          <div className="space-y-3">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="p-4 rounded-2xl bg-secondary/40 border border-border flex items-center justify-between"
              >
                <div>
                  <div className="font-mono font-bold text-xs text-foreground">{flag.key}</div>
                  <div className="text-xs text-muted-foreground">{flag.description}</div>
                </div>
                <button
                  onClick={() => handleToggleFlag(flag.key, flag.isEnabled)}
                  className={`p-1 rounded-full transition ${flag.isEnabled ? "text-primary" : "text-muted-foreground"}`}
                >
                  {flag.isEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
