"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Shield,
  MessageSquare,
  Trophy,
  Sparkles,
  ArrowRight,
  Flame,
  CheckCircle2,
  Copy,
  Check,
  X,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useApp } from "@/context/AppContext";

export default function CommunityPage() {
  const { user, t } = useApp();

  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Mentor Mode state
  const [mentorModeActive, setMentorModeActive] = useState(false);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/v1/groups");
      const data = await res.json();
      if (data.groups) setGroups(data.groups);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupDesc.trim()) return;

    const res = await fetch("/api/v1/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        isPublic: true,
      }),
    });

    if (res.ok) {
      setIsCreateModalOpen(false);
      setNewGroupName("");
      setNewGroupDesc("");
      fetchGroups();
      confetti({ particleCount: 50, spread: 60 });
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);

    const res = await fetch("/api/v1/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: inviteCodeInput.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setJoinError(data.error || "Failed to join group");
      return;
    }

    setIsJoinModalOpen(false);
    setInviteCodeInput("");
    fetchGroups();
    confetti({ particleCount: 60, spread: 70 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">{t.community.title}</h1>
          <p className="text-sm text-muted-foreground">{t.community.subtitle}</p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-semibold transition"
          >
            {t.community.joinGroup}
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{t.community.createGroup}</span>
          </button>
        </div>
      </div>

      {/* Mentor Mode Toggle Banner */}
      <div className="p-5 rounded-3xl bg-secondary/50 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground">{t.community.mentorMode}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500">
              Advisory Role
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Allows experienced leaders to review mentee milestones with permission and provide structured guidance.
          </p>
        </div>
        <button
          onClick={() => setMentorModeActive(!mentorModeActive)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            mentorModeActive
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-background border border-border text-foreground hover:bg-secondary"
          }`}
        >
          {mentorModeActive ? "Mentor Mode Active ✓" : "Enable Mentor Mode"}
        </button>
      </div>

      {/* Groups List */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Loading community groups...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-3xl border border-dashed border-border p-8 space-y-3">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">No groups joined yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Join or create a team cohort to collaborate on shared objectives and 30-day streak challenges.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-secondary"
            >
              Join with Code
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
            >
              Create Group
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    Your Role: {group.currentUserRole}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(group.inviteCode);
                        setCopiedCode(group.id);
                        setTimeout(() => setCopiedCode(null), 2000);
                      }}
                      className="hover:text-primary flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded bg-secondary"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedCode === group.id ? "Copied!" : group.inviteCode}</span>
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-lg text-foreground">{group.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{group.description}</p>

                {/* Group Objectives */}
                {group.goals && group.goals.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border space-y-1.5 text-xs">
                    <div className="font-bold text-foreground">Active Shared Objective:</div>
                    <div className="text-muted-foreground">{group.goals[0].title}</div>
                    <div className="flex justify-between font-semibold text-[11px] text-primary">
                      <span>Target: {group.goals[0].targetMetric}</span>
                      <span>Current: {group.goals[0].currentMetric}</span>
                    </div>
                  </div>
                )}

                {/* Challenges */}
                {group.challenges && group.challenges.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-xs">
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                      <Flame className="w-3.5 h-3.5" />
                      <span>{group.challenges[0].title}</span>
                    </div>
                    <div className="text-[11px] text-foreground">{group.challenges[0].description}</div>
                  </div>
                )}
              </div>

              {/* Members Avatar Row */}
              <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {group.members?.slice(0, 4).map((m: any) => (
                      <div
                        key={m.id}
                        title={m.user?.name}
                        className="w-7 h-7 rounded-full bg-primary/20 text-primary border-2 border-card flex items-center justify-center font-bold text-[10px] uppercase"
                      >
                        {m.user?.name?.slice(0, 2) || "U"}
                      </div>
                    ))}
                  </div>
                  <span className="text-muted-foreground text-[11px]">{group.members?.length || 1} members</span>
                </div>

                <span className="font-semibold text-primary text-xs hover:underline cursor-pointer">
                  Open Mastermind →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card p-6 rounded-3xl border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">Create New Mastermind Team</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 rounded hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Founders Deep Work Mastermind"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Mission / Description</label>
                <textarea
                  rows={3}
                  required
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="e.g. A mutual accountability cohort executing high-output weekly milestones."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-1/3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover"
                >
                  Create Mastermind
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Group with Code Modal */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-card p-6 rounded-3xl border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">Join with Invite Code</h3>
              <button onClick={() => setIsJoinModalOpen(false)} className="p-1 rounded hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            {joinError && <div className="text-xs text-destructive">{joinError}</div>}

            <form onSubmit={handleJoinGroup} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Invite Code</label>
                <input
                  type="text"
                  required
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  placeholder="e.g. SAAS2026"
                  className="w-full px-3 py-2 text-xs font-mono uppercase tracking-widest text-center rounded-xl border border-input bg-background"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="w-1/3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover"
                >
                  Join Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
