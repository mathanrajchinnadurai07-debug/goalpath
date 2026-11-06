"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  Plus,
  Flame,
  Trophy,
  Check,
  Pause,
  RotateCcw,
  Sparkles,
  Calendar,
  X,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useApp } from "@/context/AppContext";

export default function HabitsPage() {
  const { user, t } = useApp();
  const [habits, setHabits] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Habit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState("DAILY");
  const [goalId, setGoalId] = useState("");
  const [color, setColor] = useState("#10b981");

  const todayStr = new Date().toISOString().split("T")[0];

  const fetchData = async () => {
    try {
      const [habitsRes, goalsRes] = await Promise.all([
        fetch("/api/v1/habits"),
        fetch("/api/v1/goals"),
      ]);
      const habitsData = await habitsRes.json();
      const goalsData = await goalsRes.json();

      if (habitsData.habits) setHabits(habitsData.habits);
      if (goalsData.goals) setGoals(goalsData.goals);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLog = async (habitId: string, status: "COMPLETED" | "SKIPPED" | "UNLOGGED") => {
    const res = await fetch("/api/v1/habits/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitId, date: todayStr, status }),
    });

    if (res.ok) {
      if (status === "COMPLETED") {
        confetti({ particleCount: 40, spread: 50 });
      }
      fetchData();
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const res = await fetch("/api/v1/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        frequency,
        goalId: goalId || null,
        color,
      }),
    });

    if (res.ok) {
      setIsModalOpen(false);
      setTitle("");
      fetchData();
    }
  };

  // Generate last 28 days for the heatmap
  const pastDays = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(Date.now() - (27 - i) * 24 * 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">{t.habits.title}</h1>
          <p className="text-sm text-muted-foreground">{t.habits.subtitle}</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-sm transition flex items-center gap-1.5 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.habits.newHabit}</span>
        </button>
      </div>

      {/* Habits List */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Loading habits...</div>
      ) : habits.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-3xl border border-dashed border-border p-8 space-y-3">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">No habits tracked yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Stack consistency streaks by adding daily micro-habits linked to your primary goals.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
          >
            Create First Habit
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {habits.map((habit) => {
            const todayLog = habit.logs?.find((l: any) => l.date === todayStr);
            const isCompletedToday = todayLog?.status === "COMPLETED";
            const isSkippedToday = todayLog?.status === "SKIPPED";

            return (
              <div
                key={habit.id}
                className="p-5 md:p-6 rounded-3xl bg-card border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Habit Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: habit.color || "#10b981" }} />
                    <h3 className="font-bold text-base text-foreground">{habit.title}</h3>
                  </div>

                  {/* Streaks summary */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Flame className="w-4 h-4 fill-amber-500" />
                      <span>{habit.streakCurrent} Day Streak</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Best: {habit.streakBest} Days</span>
                    </div>
                  </div>

                  {/* 28-day Activity Heatmap */}
                  <div className="pt-2">
                    <div className="text-[10px] text-muted-foreground font-semibold mb-1">
                      {t.habits.heatmap} (Past 4 Weeks)
                    </div>
                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                      {pastDays.map((dStr) => {
                        const log = habit.logs?.find((l: any) => l.date === dStr);
                        const isDone = log?.status === "COMPLETED";
                        const isRest = log?.status === "SKIPPED";

                        return (
                          <div
                            key={dStr}
                            title={`${dStr}: ${isDone ? "Completed" : isRest ? "Rest/Skip Day" : "Not logged"}`}
                            className={`w-3.5 h-3.5 rounded-sm transition ${
                              isDone
                                ? "bg-emerald-500 shadow-sm"
                                : isRest
                                ? "bg-amber-400"
                                : "bg-secondary"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Actions: Log Done, Rest/Skip Day */}
                <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                  <button
                    onClick={() => handleLog(habit.id, isCompletedToday ? "UNLOGGED" : "COMPLETED")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isCompletedToday
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-secondary text-foreground hover:bg-emerald-500/10 hover:text-emerald-500"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isCompletedToday ? "Completed Today ✓" : t.habits.logCompleted}</span>
                  </button>

                  <button
                    onClick={() => handleLog(habit.id, isSkippedToday ? "UNLOGGED" : "SKIPPED")}
                    title="Rest day preserves streak"
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      isSkippedToday
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{isSkippedToday ? "Rest Day 🛌" : t.habits.restDay}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Habit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card p-6 rounded-3xl border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">Track New Habit</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateHabit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Habit Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 2 Hours Deep Work Before Noon"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Link to Goal (Optional)</label>
                <select
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
                >
                  <option value="">No linked goal</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="CUSTOM">Custom Weekdays</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Color Marker</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-8 rounded-lg border border-input cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover"
                >
                  Save Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
