"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Sparkles,
  Trophy,
  Brain,
  CheckCircle2,
  Calendar,
  Zap,
  ArrowRight,
  Flame,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useApp } from "@/context/AppContext";

export default function AnalyticsPage() {
  const { user, t } = useApp();

  const [analytics, setAnalytics] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Wizard Modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewType, setReviewType] = useState<"WEEKLY" | "MONTHLY">("WEEKLY");
  const [wins, setWins] = useState("");
  const [blockers, setBlockers] = useState("");
  const [lessons, setLessons] = useState("");
  const [adjustments, setAdjustments] = useState("");

  // AI Strategic Coach Modal (Opt-in)
  const [isCoachModalOpen, setIsCoachModalOpen] = useState(false);
  const [coachConsent, setCoachConsent] = useState(false);
  const [coachAction, setCoachAction] = useState<"ANALYZE_WEEK" | "DECONSTRUCT_GOAL">("ANALYZE_WEEK");
  const [coachGoalInput, setCoachGoalInput] = useState("");
  const [coachResponse, setCoachResponse] = useState<any>(null);
  const [coachLoading, setCoachLoading] = useState(false);

  const fetchAll = async () => {
    try {
      const [analyticsRes, reviewsRes] = await Promise.all([
        fetch("/api/v1/analytics"),
        fetch("/api/v1/reviews"),
      ]);
      const aData = await analyticsRes.json();
      const rData = await reviewsRes.json();

      setAnalytics(aData);
      if (rData.reviews) setReviews(rData.reviews);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wins.trim() || !blockers.trim() || !lessons.trim() || !adjustments.trim()) return;

    const res = await fetch("/api/v1/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: reviewType,
        wins: wins.trim(),
        blockers: blockers.trim(),
        lessons: lessons.trim(),
        adjustments: adjustments.trim(),
      }),
    });

    if (res.ok) {
      setIsReviewModalOpen(false);
      setWins("");
      setBlockers("");
      setLessons("");
      setAdjustments("");
      confetti({ particleCount: 50, spread: 60 });
      fetchAll();
    }
  };

  const handleInvokeCoach = async () => {
    if (!coachConsent) return;
    setCoachLoading(true);

    try {
      const res = await fetch("/api/v1/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: coachAction,
          goalTitle: coachGoalInput.trim() || undefined,
          userConsent: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCoachResponse(data);
        confetti({ particleCount: 40, spread: 50 });
      }
    } finally {
      setCoachLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">{t.analytics.title}</h1>
          <p className="text-sm text-muted-foreground">{t.analytics.subtitle}</p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setIsCoachModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Brain className="w-4 h-4" />
            <span>{t.analytics.aiCoach}</span>
          </button>

          <button
            onClick={() => setIsReviewModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-sm transition flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.analytics.weeklyReview}</span>
          </button>
        </div>
      </div>

      {/* Gamification XP Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-card border border-border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-black text-xl shrink-0">
            L{analytics?.summary?.currentLevel ?? 1}
          </div>
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {t.analytics.xpLevel}
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Level {analytics?.summary?.currentLevel ?? 1} Master Achiever
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {analytics?.summary?.totalXP ?? 0} XP Total • Next Level at {analytics?.summary?.nextLevelXP ?? 500} XP
            </p>
          </div>
        </div>

        {/* Badges preview */}
        <div className="flex items-center gap-2">
          {analytics?.badges?.map((b: any) => (
            <div
              key={b.id}
              title={`${b.badgeName} (+${b.xpReward} XP)`}
              className="p-2.5 rounded-xl bg-secondary/60 border border-border flex items-center gap-2 text-xs font-bold text-foreground"
            >
              <Trophy className="w-4 h-4 text-purple-500" />
              <span>{b.badgeName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Productivity Charts & Category Velocity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Focus Minutes Distribution */}
        <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
          <h3 className="font-bold text-base text-foreground">Weekly Deep Work Focus Minutes</h3>
          <div className="flex items-end justify-between gap-2 h-44 pt-4 border-b border-border pb-2">
            {analytics?.weeklyFocus?.map((item: any) => {
              const heightPct = Math.min(100, Math.max(10, (item.minutes / 180) * 100));
              return (
                <div key={item.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="text-[10px] font-bold text-muted-foreground">{item.minutes}m</div>
                  <div
                    className="w-full bg-primary/80 hover:bg-primary rounded-t-lg transition-all duration-300"
                    style={{ height: `${heightPct}%` }}
                  />
                  <div className="text-xs font-semibold text-muted-foreground">{item.day}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Velocity Progress */}
        <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
          <h3 className="font-bold text-base text-foreground">Category Progress Velocity</h3>
          <div className="space-y-3 pt-2">
            {analytics?.categoryDistribution?.map((cat: any) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-foreground">{cat.name}</span>
                  <span className="text-muted-foreground">{cat.value}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, cat.value)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Historical Reviews & Retrospectives List */}
      <div className="p-6 md:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        <h3 className="font-bold text-lg text-foreground">Retrospective Reviews &amp; Lessons</h3>

        <div className="space-y-4 pt-2">
          {reviews.length > 0 ? (
            reviews.map((rev) => (
              <div key={rev.id} className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-500">
                    {rev.type} RETROSPECTIVE
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="font-bold text-emerald-500 block mb-0.5">Wins:</span>
                    <p className="text-foreground font-medium">{rev.wins}</p>
                  </div>
                  <div>
                    <span className="font-bold text-amber-500 block mb-0.5">Blockers:</span>
                    <p className="text-foreground font-medium">{rev.blockers}</p>
                  </div>
                  <div>
                    <span className="font-bold text-indigo-500 block mb-0.5">Greatest Lesson:</span>
                    <p className="text-foreground font-medium">{rev.lessons}</p>
                  </div>
                  <div>
                    <span className="font-bold text-purple-500 block mb-0.5">Next Adjustments:</span>
                    <p className="text-foreground font-medium">{rev.adjustments}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground py-4 text-center">
              No retrospective reviews conducted yet. Launch your first review above!
            </div>
          )}
        </div>
      </div>

      {/* Review Wizard Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-card p-6 md:p-8 rounded-3xl border border-border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground">Weekly / Monthly Retrospective Wizard</h3>
                <p className="text-xs text-muted-foreground">Self-reflection creates compounding improvement</p>
              </div>
              <button onClick={() => setIsReviewModalOpen(false)} className="p-1 rounded hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="space-y-3 pt-2">
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setReviewType("WEEKLY")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    reviewType === "WEEKLY" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  Weekly Review
                </button>
                <button
                  type="button"
                  onClick={() => setReviewType("MONTHLY")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    reviewType === "MONTHLY" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  Monthly Retrospective
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">{t.analytics.wins}</label>
                <textarea
                  rows={2}
                  required
                  value={wins}
                  onChange={(e) => setWins(e.target.value)}
                  placeholder="e.g. Shipped authentication and completed all 4 daily deep work blocks."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">{t.analytics.blockers}</label>
                <textarea
                  rows={2}
                  required
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="e.g. Midday context switching between emails and deep work."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">{t.analytics.lessons}</label>
                <textarea
                  rows={2}
                  required
                  value={lessons}
                  onChange={(e) => setLessons(e.target.value)}
                  placeholder="e.g. Guard morning blocks with airplane mode on phone."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  What strategic adjustments will you make next week?
                </label>
                <textarea
                  rows={2}
                  required
                  value={adjustments}
                  onChange={(e) => setAdjustments(e.target.value)}
                  placeholder="e.g. Schedule calendar blocks for all Q2 tasks on Sunday evening."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="w-1/3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Retrospective</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Coach Modal (Opt-in) */}
      {isCoachModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-card p-6 md:p-8 rounded-3xl border border-border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">GoalPath AI Strategic Coach</h3>
                  <p className="text-[11px] text-muted-foreground">Privacy-Preserving &amp; Opt-In</p>
                </div>
              </div>
              <button onClick={() => setIsCoachModalOpen(false)} className="p-1 rounded hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Privacy opt-in confirmation checkbox */}
            <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border text-xs text-foreground space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={coachConsent}
                  onChange={(e) => setCoachConsent(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600"
                />
                <span className="font-medium">
                  I give explicit opt-in consent for the AI Coach to analyze my schedule and goals. Zero sensitive
                  personal data is ever retained or used for public training.
                </span>
              </label>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCoachAction("ANALYZE_WEEK")}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold ${
                    coachAction === "ANALYZE_WEEK" ? "bg-purple-600 text-white" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  Analyze My Week
                </button>
                <button
                  type="button"
                  onClick={() => setCoachAction("DECONSTRUCT_GOAL")}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold ${
                    coachAction === "DECONSTRUCT_GOAL" ? "bg-purple-600 text-white" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  Deconstruct Goal
                </button>
              </div>

              {coachAction === "DECONSTRUCT_GOAL" && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Goal to Deconstruct</label>
                  <input
                    type="text"
                    value={coachGoalInput}
                    onChange={(e) => setCoachGoalInput(e.target.value)}
                    placeholder="e.g. Master High-Throughput Distributed Systems"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleInvokeCoach}
                disabled={!coachConsent || coachLoading}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <span>{coachLoading ? "Generating Strategic Advice..." : "Consult AI Coach"}</span>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Coach Results display */}
            {coachResponse && (
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-3 pt-3">
                <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>Coach Insights:</span>
                </div>

                {coachResponse.insights && (
                  <ul className="space-y-1.5 text-foreground">
                    {coachResponse.insights.map((ins: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        <span>{ins}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {coachResponse.milestones && (
                  <div className="space-y-2">
                    {coachResponse.milestones.map((m: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-card border border-border">
                        <div className="font-bold text-foreground">{m.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Steps: {m.actionSteps.join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
