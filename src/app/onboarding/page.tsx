"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Target, Sparkles, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshUser } = useApp();

  const [step, setStep] = useState(1);
  const [mainGoal, setMainGoal] = useState("");
  const [whyItMatters, setWhyItMatters] = useState("");
  const [category, setCategory] = useState("Career");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [loading, setLoading] = useState(false);

  const categories = [
    { id: "Business", label: "Business & Venture", color: "border-indigo-500" },
    { id: "Study", label: "Study & Academics", color: "border-purple-500" },
    { id: "Career", label: "Career & Tech", color: "border-blue-500" },
    { id: "Health", label: "Health & Fitness", color: "border-emerald-500" },
    { id: "Finance", label: "Finance & Wealth", color: "border-amber-500" },
    { id: "Personal", label: "Personal Growth", color: "border-pink-500" },
  ];

  const handleFinish = async () => {
    setLoading(true);
    try {
      if (mainGoal.trim()) {
        await fetch("/api/v1/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: mainGoal.trim(),
            whyItMatters: whyItMatters.trim() || "My primary North Star goal chosen during onboarding.",
            category,
            priority: "HIGH",
            deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        });
      }

      await refreshUser();
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-8 px-4">
      <div className="max-w-xl w-full bg-card p-8 rounded-3xl border border-border shadow-sm space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pb-2 border-b border-border">
          <span>Step {step} of 3</span>
          <div className="flex gap-1.5">
            <div className={`w-8 h-1.5 rounded-full ${step >= 1 ? "bg-primary" : "bg-secondary"}`} />
            <div className={`w-8 h-1.5 rounded-full ${step >= 2 ? "bg-primary" : "bg-secondary"}`} />
            <div className={`w-8 h-1.5 rounded-full ${step >= 3 ? "bg-primary" : "bg-secondary"}`} />
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">What is your primary North Star goal?</h2>
            <p className="text-sm text-muted-foreground">
              What single objective, if achieved in the next 90 days, would create the greatest impact in your life?
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Goal Title</label>
                <input
                  type="text"
                  value={mainGoal}
                  onChange={(e) => setMainGoal(e.target.value)}
                  placeholder="e.g. Master Full-Stack Architecture & Ship GoalPath"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Why does this matter deeply to you?</label>
                <textarea
                  rows={3}
                  value={whyItMatters}
                  onChange={(e) => setWhyItMatters(e.target.value)}
                  placeholder="e.g. It creates autonomy, solves real user friction, and establishes my career independence."
                  className="w-full px-4 py-2 text-sm rounded-xl border border-input bg-background text-foreground"
                />
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!mainGoal.trim()}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow hover:bg-primary-hover transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>Continue to Categories</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Select your primary category</h2>
            <p className="text-sm text-muted-foreground">
              Categorizing your goals enables sharp analytics, balanced time-blocking, and clear retrospective reviews.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-3.5 rounded-xl border text-left transition ${
                    category === cat.id
                      ? "border-primary bg-primary/10 font-bold text-foreground"
                      : "border-border hover:bg-secondary text-muted-foreground"
                  }`}
                >
                  <div className="text-sm">{cat.label}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 py-2.5 rounded-xl border border-border text-foreground text-sm font-semibold hover:bg-secondary"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="w-2/3 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover flex items-center justify-center gap-2"
              >
                <span>Continue to Daily Routine</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Set your core deep work hours</h2>
            <p className="text-sm text-muted-foreground">
              GoalPath will align your daily timeline view and time-blocking suggestions with these hours.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Work Start Time</label>
                <input
                  type="time"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Work End Time</label>
                <input
                  type="time"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-secondary/60 border border-border text-xs text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Ready to Launch Workspace</span>
              </div>
              <p>Your goal, categories, and routine preferences have been configured.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(2)}
                className="w-1/3 py-2.5 rounded-xl border border-border text-foreground text-sm font-semibold hover:bg-secondary"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={loading}
                className="w-2/3 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover flex items-center justify-center gap-2"
              >
                <span>{loading ? "Preparing Workspace..." : "Complete & Open GoalPath"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
