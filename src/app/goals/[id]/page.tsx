"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Target,
  Calendar,
  CheckCircle2,
  Circle,
  Share2,
  Trash2,
  Archive,
  ArrowLeft,
  Heart,
  Sparkles,
  ShieldAlert,
  Plus,
  Check,
  Copy,
  ExternalLink,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useApp } from "@/context/AppContext";

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, t } = useApp();

  const [goal, setGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Gratitude prompt state on goal completion
  const [showGratitudePrompt, setShowGratitudePrompt] = useState(false);

  const fetchGoal = async () => {
    try {
      const res = await fetch(`/api/v1/goals/${params.id}`);
      const data = await res.json();
      if (data.goal) {
        setGoal(data.goal);
        if (data.goal.progressPercent === 100) {
          setShowGratitudePrompt(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoal();
  }, [params.id]);

  const toggleMilestone = async (milestoneId: string, currentState: boolean) => {
    const res = await fetch("/api/v1/milestones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: milestoneId,
        isCompleted: !currentState,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setGoal(data.goal);

      if (data.goal.progressPercent === 100) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        setShowGratitudePrompt(true);
      }
    }
  };

  const handleShare = async () => {
    const res = await fetch(`/api/v1/goals/${params.id}/share`, { method: "POST" });
    const data = await res.json();
    if (data.shareUrl) {
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);
      setIsShareModalOpen(true);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this goal? This action cannot be undone.")) {
      await fetch(`/api/v1/goals/${params.id}`, { method: "DELETE" });
      router.push("/goals");
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground text-sm">Loading goal details...</div>;
  }

  if (!goal) {
    return (
      <div className="text-center py-20 space-y-3">
        <h2 className="text-xl font-bold text-foreground">Goal not found</h2>
        <Link href="/goals" className="text-xs text-primary font-semibold hover:underline">
          Return to Goals
        </Link>
      </div>
    );
  }

  const parsedPlan = goal.plan
    ? {
        actionSteps: JSON.parse(goal.plan.actionSteps || "[]"),
        resourcesNeeded: JSON.parse(goal.plan.resourcesNeeded || "[]"),
        obstaclesSolutions: JSON.parse(goal.plan.obstaclesSolutions || "[]"),
        supportPeople: JSON.parse(goal.plan.supportPeople || "[]"),
      }
    : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Navigation Back Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/goals"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Goals</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-semibold transition flex items-center gap-1.5"
            title="Share Read-Only Link"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Share</span>
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-xl border border-border bg-card hover:bg-destructive/10 hover:text-destructive text-muted-foreground text-xs transition"
            title="Delete Goal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Goal Header Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
              {goal.category}
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                goal.priority === "URGENT"
                  ? "bg-rose-500/10 text-rose-500"
                  : goal.priority === "HIGH"
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {goal.priority} Priority
            </span>
          </div>

          <span
            className={`font-bold text-xs px-3 py-1 rounded-full ${
              goal.health === "ON_TRACK"
                ? "bg-emerald-500/10 text-emerald-500"
                : goal.health === "AT_RISK"
                ? "bg-amber-500/10 text-amber-500"
                : "bg-rose-500/10 text-rose-500"
            }`}
          >
            {goal.health.replace("_", " ")}
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">{goal.title}</h1>

        <div className="p-4 rounded-2xl bg-secondary/40 border border-border">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Why this matters deeply
          </span>
          <p className="text-sm text-foreground font-medium">{goal.whyItMatters}</p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-muted-foreground">Overall Goal Progress</span>
            <span className="text-foreground">{goal.progressPercent}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-500"
              style={{ width: `${goal.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Completion & Gratitude Prompt Banner */}
      {showGratitudePrompt && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-indigo-500/15 border border-pink-500/30 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-pink-500 font-bold text-sm">
            <Heart className="w-5 h-5 fill-pink-500" />
            <span>Goal Achieved! Who helped you achieve this?</span>
          </div>
          <p className="text-xs text-foreground">
            No massive victory is won alone. Take 60 seconds to express sincere gratitude to the mentors, colleagues, or
            friends who supported this journey.
          </p>
          <Link
            href="/gratitude"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-500 text-white font-bold text-xs hover:bg-pink-600 transition shadow"
          >
            <span>Say Thanks in Gratitude Hub</span>
            <Heart className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Milestones Hierarchy Section */}
      <div className="p-6 md:p-8 rounded-3xl bg-card border border-border space-y-4">
        <h2 className="text-lg font-bold text-foreground">Milestones Breakdown</h2>
        <p className="text-xs text-muted-foreground">
          Check off milestones as you achieve them. Progress and health auto-update in real time.
        </p>

        <div className="space-y-2.5 pt-2">
          {goal.milestones && goal.milestones.length > 0 ? (
            goal.milestones.map((m: any, idx: number) => (
              <div
                key={m.id}
                onClick={() => toggleMilestone(m.id, m.isCompleted)}
                className={`p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                  m.isCompleted
                    ? "bg-secondary/40 border-border text-muted-foreground line-through"
                    : "bg-background border-border hover:border-primary text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  {m.isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm font-semibold">{m.title}</span>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">Step {idx + 1}</span>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground">No milestones defined for this goal.</div>
          )}
        </div>
      </div>

      {/* "How I will achieve this" Execution Plan */}
      {parsedPlan && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Action Steps */}
          <div className="p-6 rounded-3xl bg-card border border-border space-y-3">
            <h3 className="font-bold text-sm text-foreground">Daily Execution Steps</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {parsedPlan.actionSteps.map((s: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Obstacles & Countermeasures */}
          <div className="p-6 rounded-3xl bg-card border border-border space-y-3">
            <h3 className="font-bold text-sm text-foreground">Obstacles &amp; Countermeasures</h3>
            <div className="space-y-2 text-xs">
              {parsedPlan.obstaclesSolutions.map((item: any, idx: number) => (
                <div key={idx} className="p-2.5 rounded-xl bg-secondary/50 border border-border space-y-1">
                  <div className="text-rose-500 font-semibold">⚠️ {item.obstacle}</div>
                  <div className="text-emerald-500 font-medium">🛡️ {item.solution}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Vision Board */}
      {goal.visionItems && goal.visionItems.length > 0 && (
        <div className="p-6 md:p-8 rounded-3xl bg-card border border-border space-y-4">
          <h2 className="text-lg font-bold text-foreground">Vision Board &amp; Invocations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {goal.visionItems.map((v: any) => (
              <div key={v.id} className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-2">
                <div className="text-xs font-bold text-primary">{v.targetMetric}</div>
                <div className="text-sm font-semibold text-foreground">&ldquo;{v.quote}&rdquo;</div>
                <div className="text-[11px] text-muted-foreground">{v.caption}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share Read-Only Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card p-6 rounded-3xl border border-border shadow-xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Public Read-Only Goal Link</h3>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can view this goal and its milestones without seeing your private data.
            </p>
            <div className="p-3 bg-secondary rounded-xl text-xs font-mono break-all text-foreground select-all">
              {shareUrl}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (shareUrl) {
                    navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? "Copied!" : "Copy Link"}</span>
              </button>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-foreground text-xs font-semibold hover:bg-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
