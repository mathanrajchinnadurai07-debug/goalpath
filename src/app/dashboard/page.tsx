"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Target,
  Calendar,
  Activity,
  Heart,
  TrendingUp,
  CheckCircle2,
  Clock,
  Flame,
  ArrowRight,
  Sparkles,
  Trophy,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function DashboardPage() {
  const { user, t } = useApp();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/analytics")
      .then((res) => res.json())
      .then((data) => {
        setAnalytics(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner & Daily Motivation */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-semibold text-indigo-200">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Daily North Star Mindset</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name || "Achiever"}!
            </h1>
            <p className="text-indigo-100/90 text-sm italic font-light">
              &ldquo;Small disciplines repeated with consistency every day lead to great achievements gained slowly over time.&rdquo;
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/goals"
              className="px-4 py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-xs shadow hover:bg-indigo-50 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Goal</span>
            </Link>
            <Link
              href="/planner"
              className="px-4 py-2.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold text-xs border border-white/20 transition flex items-center gap-1.5"
            >
              <Clock className="w-4 h-4" />
              <span>Start Focus</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today Tasks */}
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today&apos;s Execution</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {analytics?.summary?.todayCompletionRate ?? 0}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {analytics?.summary?.todayCompletedTasks ?? 0} of {analytics?.summary?.todayTotalTasks ?? 0} tasks done
          </div>
        </div>

        {/* Total Goals */}
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Goals</span>
            <Target className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {analytics?.summary?.totalGoals ?? 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {analytics?.summary?.completedGoals ?? 0} completed successfully
          </div>
        </div>

        {/* Habit Consistency */}
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Habits</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {analytics?.summary?.totalHabits ?? 0}
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
            Continuous daily streaks
          </div>
        </div>

        {/* XP & Level */}
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Level & XP</span>
            <Trophy className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-foreground">
            Level {analytics?.summary?.currentLevel ?? 1}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {analytics?.summary?.totalXP ?? 0} XP earned
          </div>
        </div>
      </div>

      {/* Goals Health & Upcoming Deadlines Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Deadlines Column (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-base text-foreground">Upcoming Milestone Deadlines</h2>
                <p className="text-xs text-muted-foreground">High-priority targets scheduled for fulfillment</p>
              </div>
            </div>
            <Link href="/goals" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 pt-2">
            {analytics?.upcomingDeadlines && analytics.upcomingDeadlines.length > 0 ? (
              analytics.upcomingDeadlines.map((g: any) => {
                const daysLeft = Math.ceil(
                  (new Date(g.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
                );
                return (
                  <div
                    key={g.id}
                    className="p-4 rounded-2xl border border-border hover:border-primary/50 transition flex items-center justify-between bg-secondary/30"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                          {g.category}
                        </span>
                        <span className="font-semibold text-sm text-foreground">{g.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{daysLeft > 0 ? `${daysLeft} days remaining` : "Due today"}</span>
                        <span>•</span>
                        <span
                          className={`font-semibold ${
                            g.health === "ON_TRACK"
                              ? "text-emerald-700 dark:text-emerald-400"
                              : g.health === "AT_RISK"
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-rose-700 dark:text-rose-400"
                          }`}
                        >
                          {g.health.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-sm text-foreground">{g.progressPercent}%</div>
                      <div className="w-20 bg-secondary rounded-full h-1.5 mt-1 overflow-hidden">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${g.progressPercent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No active deadlines. <Link href="/goals" className="text-primary font-semibold hover:underline">Create a new goal</Link>.
              </div>
            )}
          </div>
        </div>

        {/* Goal Health & Badges Column */}
        <div className="space-y-6">
          {/* Health Index Card */}
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
            <h2 className="font-bold text-base text-foreground">Goal Health Status</h2>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">On Track</span>
                <span className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                  {analytics?.healthCounts?.ON_TRACK ?? 0} Goals
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">At Risk</span>
                <span className="font-bold text-sm text-amber-800 dark:text-amber-300">
                  {analytics?.healthCounts?.AT_RISK ?? 0} Goals
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">Behind Schedule</span>
                <span className="font-bold text-sm text-rose-800 dark:text-rose-300">
                  {analytics?.healthCounts?.BEHIND ?? 0} Goals
                </span>
              </div>
            </div>
          </div>

          {/* Quick Gratitude Reminder Card */}
          <div className="p-6 rounded-3xl bg-pink-500/5 border border-pink-500/20 space-y-3">
            <div className="flex items-center gap-2 text-pink-700 dark:text-pink-400 font-bold text-xs uppercase tracking-wider">
              <Heart className="w-4 h-4 fill-pink-600" />
              <span>Gratitude Network</span>
            </div>
            <p className="text-xs text-foreground font-medium">
              Achieving goals is never a solo journey. Have you sent a quick appreciation note to a mentor or colleague this week?
            </p>
            <Link
              href="/gratitude"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-700 dark:text-pink-400 hover:text-pink-800"
            >
              <span>Say Thank You</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
