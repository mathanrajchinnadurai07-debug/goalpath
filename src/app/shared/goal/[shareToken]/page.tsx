"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Target, CheckCircle2, Circle, Calendar, Sparkles } from "lucide-react";

export default function SharedGoalPage() {
  const params = useParams();
  const [goal, setGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/goals/public/${params.shareToken}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.goal) setGoal(data.goal);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.shareToken]);

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground text-sm">Loading shared goal...</div>;
  }

  if (!goal) {
    return (
      <div className="text-center py-20 space-y-3 max-w-md mx-auto">
        <h2 className="text-xl font-bold text-foreground">Goal link not found</h2>
        <p className="text-xs text-muted-foreground">This goal may have been archived or the sharing link was revoked.</p>
        <Link href="/" className="inline-block px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl">
          Visit GoalPath
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="p-6 md:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
              {goal.category}
            </span>
            <span className="text-xs font-bold text-muted-foreground">{goal.priority} Priority</span>
          </div>
          <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
            {goal.health.replace("_", " ")}
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">{goal.title}</h1>
        <p className="text-sm text-muted-foreground font-medium">{goal.whyItMatters}</p>

        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-foreground">{goal.progressPercent}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${goal.progressPercent}%` }} />
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 rounded-3xl bg-card border border-border space-y-4">
        <h2 className="text-lg font-bold text-foreground">Milestones Checklist</h2>
        <div className="space-y-2 pt-1">
          {goal.milestones?.map((m: any, idx: number) => (
            <div
              key={m.id}
              className={`p-3 rounded-2xl border flex items-center justify-between text-sm ${
                m.isCompleted ? "bg-secondary/40 text-muted-foreground line-through border-border" : "border-border text-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                {m.isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="font-semibold">{m.title}</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-bold">Step {idx + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center pt-4">
        <p className="text-xs text-muted-foreground mb-2">Powered by GoalPath SaaS</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow"
        >
          <span>Create Your Free GoalPath</span>
        </Link>
      </div>
    </div>
  );
}
