"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowRight,
  CheckCircle2,
  Circle,
  Download,
  Flame,
  LayoutGrid,
  List,
  Sparkles,
  Layers,
  ArrowUpRight,
  X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function PlannerPage() {
  const { user, t } = useApp();

  const [view, setView] = useState<"timeline" | "list" | "kanban" | "eisenhower">("timeline");
  const [tasks, setTasks] = useState<any[]>([]);
  const [timeblocks, setTimeblocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick-Add Natural Language Input
  const [quickAddText, setQuickAddText] = useState("");

  // Rollover state
  const [rolloverMessage, setRolloverMessage] = useState<string | null>(null);

  // Pomodoro Focus Timer State
  const [isFocusOpen, setIsFocusOpen] = useState(false);
  const [focusDuration, setFocusDuration] = useState(25 * 60); // 25 mins in seconds
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [ambientSound, setAmbientSound] = useState<"none" | "rain" | "cafe" | "whitenoise" | "stream">("none");
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const audioSourceRef = useRef<any>(null);

  // New task modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskQuadrant, setTaskQuadrant] = useState("Q2_IMPORTANT_NOT_URGENT");
  const [taskPriority, setTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [taskEstimate, setTaskEstimate] = useState(30);

  // New timeblock state
  const [blockTitle, setBlockTitle] = useState("");
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("10:30");
  const [blockColor, setBlockColor] = useState("#4f46e5");
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  const [todayStr, setTodayStr] = useState<string>("");

  const fetchData = async (dateOverride?: string) => {
    const targetDate = dateOverride || todayStr || new Date().toISOString().split("T")[0];
    try {
      const res = await fetch(`/api/v1/tasks?date=${targetDate}&includeBlocks=true`);
      const data = await res.json();

      if (data.tasks) setTasks(data.tasks);
      if (data.blocks) setTimeblocks(data.blocks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const clientToday = new Date().toISOString().split("T")[0];
    setTodayStr(clientToday);
    fetchData(clientToday);
  }, []);

  // Pomodoro countdown effect
  useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      import("canvas-confetti").then((m) => m.default({ particleCount: 75, spread: 80 }));
      // Log session
      fetch("/api/v1/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMinutes: Math.round(focusDuration / 60),
          ambientSound,
        }),
      });
      stopAmbientSound();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // Ambient sound web audio synthesizer
  const playAmbientSound = (soundType: string) => {
    try {
      if (!audioContext) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioContext(ctx);
        startSyntheticAudio(ctx, soundType);
      } else {
        startSyntheticAudio(audioContext, soundType);
      }
    } catch {}
  };

  const startSyntheticAudio = (ctx: AudioContext, soundType: string) => {
    stopAmbientSound();
    if (soundType === "none") return;

    // Generate relaxing ambient brown/white noise buffer
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02; // Brown noise curve
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = soundType === "rain" ? "lowpass" : soundType === "stream" ? "bandpass" : "lowpass";
    filter.frequency.setValueAtTime(soundType === "rain" ? 400 : 800, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    whiteNoise.start();
    audioSourceRef.current = whiteNoise;
  };

  const stopAmbientSound = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch {}
      audioSourceRef.current = null;
    }
  };

  const handleToggleTask = async (task: any) => {
    const nextStatus = task.status === "DONE" ? "TODO" : "DONE";
    const res = await fetch("/api/v1/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, status: nextStatus }),
    });
    if (res.ok) {
      setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
      if (nextStatus === "DONE") {
        const confetti = (await import("canvas-confetti")).default;
        confetti({ particleCount: 40, spread: 50 });
      }
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddText.trim()) return;

    const text = quickAddText.trim();
    let priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" = "MEDIUM";
    let estimatedMinutes = 30;

    if (text.toLowerCase().includes("urgent") || text.toLowerCase().includes("asap")) priority = "URGENT";
    if (text.toLowerCase().includes("2 hour") || text.toLowerCase().includes("2 hours") || text.toLowerCase().includes("2h"))
      estimatedMinutes = 120;
    else if (text.toLowerCase().includes("1 hour") || text.toLowerCase().includes("1h")) estimatedMinutes = 60;

    const res = await fetch("/api/v1/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: text,
        priority,
        estimatedMinutes,
        quadrant: "Q2_IMPORTANT_NOT_URGENT",
      }),
    });

    if (res.ok) {
      setQuickAddText("");
      fetchData();
    }
  };

  const handleRollover = async () => {
    const res = await fetch("/api/v1/tasks/rollover", { method: "POST" });
    const data = await res.json();
    setRolloverMessage(data.message);
    fetchData();
    setTimeout(() => setRolloverMessage(null), 4000);
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockTitle.trim()) return;

    const res = await fetch("/api/v1/timeblocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: blockTitle.trim(),
        date: todayStr,
        startTime: blockStart,
        endTime: blockEnd,
        color: blockColor,
      }),
    });

    if (res.ok) {
      setIsBlockModalOpen(false);
      setBlockTitle("");
      fetchData();
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const hoursTimeline = [
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
    "20:00", "21:00", "22:00",
  ];

  const top3Tasks = tasks.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">{t.planner.title}</h1>
          <p className="text-sm text-muted-foreground">{t.planner.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Focus Timer Trigger Button */}
          <button
            onClick={() => setIsFocusOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Clock className="w-4 h-4" />
            <span>Focus Timer ({formatTimer(timeLeft)})</span>
          </button>

          {/* Calendar .ics Export */}
          <a
            href="/api/v1/calendar/export.ics"
            download="goalpath-schedule.ics"
            className="px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-primary" />
            <span>{t.planner.exportCalendar}</span>
          </a>

          {/* Add Block */}
          <button
            onClick={() => setIsBlockModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Time Block</span>
          </button>
        </div>
      </div>

      {/* Natural Language Quick-Add Input */}
      <form onSubmit={handleQuickAdd} className="relative">
        <Sparkles className="w-4 h-4 text-primary absolute left-4 top-3.5" />
        <input
          type="text"
          value={quickAddText}
          onChange={(e) => setQuickAddText(e.target.value)}
          placeholder='Quick Add: "Review security headers today 2pm for 1 hour" or "Study algorithms asap"...'
          className="w-full pl-11 pr-24 py-3 rounded-2xl border border-input bg-card text-foreground text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="absolute right-2 top-2 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover transition"
        >
          Add Task
        </button>
      </form>

      {/* Auto-Rollover Alert Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs gap-3">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <CalendarIcon className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{rolloverMessage || t.planner.rolloverPrompt}</span>
        </div>
        <button
          onClick={handleRollover}
          className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold shrink-0 transition"
        >
          {t.planner.rolloverAction}
        </button>
      </div>

      {/* Top 3 Priorities of the Day */}
      <div className="p-5 rounded-3xl bg-card border border-border shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
          <Flame className="w-4 h-4" />
          <span>{t.planner.top3}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {top3Tasks.length > 0 ? (
            top3Tasks.map((task, idx) => (
              <div
                key={task.id}
                onClick={() => handleToggleTask(task)}
                className={`p-3.5 rounded-2xl border transition flex items-start gap-3 cursor-pointer ${
                  task.status === "DONE"
                    ? "bg-secondary/40 border-border line-through text-muted-foreground"
                    : "bg-background border-border hover:border-primary text-foreground"
                }`}
              >
                <div className="mt-0.5">
                  {task.status === "DONE" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">
                    #{idx + 1} {task.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {task.estimatedMinutes}m est • {task.priority}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground py-2 col-span-3">
              No tasks scheduled for today. Add one above!
            </div>
          )}
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border pb-3">
        <button
          onClick={() => setView("timeline")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            view === "timeline" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{t.planner.timelineView}</span>
        </button>
        <button
          onClick={() => setView("list")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            view === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>{t.planner.listView}</span>
        </button>
        <button
          onClick={() => setView("kanban")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            view === "kanban" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Kanban Board</span>
        </button>
        <button
          onClick={() => setView("eisenhower")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            view === "eisenhower" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>{t.planner.matrixView}</span>
        </button>
      </div>

      {/* View: TIMELINE */}
      {view === "timeline" && (
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm text-foreground">
              Today&apos;s Time-Blocking Schedule{todayStr ? ` (${todayStr})` : ""}
            </h2>
            <button
              onClick={() => setIsBlockModalOpen(true)}
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Time Block
            </button>
          </div>

          <div className="divide-y divide-border/60">
            {hoursTimeline.map((hour) => {
              const matchedBlocks = timeblocks.filter((b) => b.startTime <= hour && b.endTime > hour);
              return (
                <div key={hour} className="py-2.5 flex items-start gap-4 min-h-[48px]">
                  <span className="w-12 text-xs font-mono font-medium text-muted-foreground shrink-0 mt-0.5">
                    {hour}
                  </span>
                  <div className="flex-1 flex flex-wrap gap-2">
                    {matchedBlocks.map((b) => {
                      const accessibleColorMap: Record<string, string> = {
                        "#ef4444": "#b91c1c",
                        "#10b981": "#047857",
                        "#f59e0b": "#b45309",
                        "#3b82f6": "#1d4ed8",
                        "#ec4899": "#be185d",
                      };
                      const bgColor = accessibleColorMap[(b.color || "").toLowerCase()] || b.color || "#4338ca";
                      return (
                        <div
                          key={b.id}
                          className="p-2.5 rounded-xl text-xs text-white font-medium shadow-sm flex items-center justify-between gap-3 flex-1 min-w-[200px]"
                          style={{ backgroundColor: bgColor }}
                        >
                          <div>
                            <div className="font-bold">{b.title}</div>
                            <div className="text-[10px]">
                              {b.startTime} - {b.endTime}
                            </div>
                          </div>
                          {b.isCompleted && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View: LIST */}
      {view === "list" && (
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleToggleTask(task)}
              className={`p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                task.status === "DONE"
                  ? "bg-secondary/40 border-border line-through text-muted-foreground"
                  : "bg-background border-border hover:border-primary text-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                {task.status === "DONE" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <div>
                  <div className="text-sm font-semibold">{task.title}</div>
                  <div className="text-[11px] text-muted-foreground flex gap-2 mt-0.5">
                    <span>Est: {task.estimatedMinutes}m</span>
                    <span>•</span>
                    <span>Actual: {task.actualMinutes}m</span>
                    {task.goal && <span>• Goal: {task.goal.title}</span>}
                  </div>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  task.priority === "URGENT"
                    ? "bg-rose-500/10 text-rose-500"
                    : task.priority === "HIGH"
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {task.priority}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* View: KANBAN */}
      {view === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {["TODO", "IN_PROGRESS", "DONE"].map((colStatus) => {
            const colTasks = tasks.filter((t) => t.status === colStatus);
            return (
              <div key={colStatus} className="p-5 rounded-3xl bg-card border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    {colStatus.replace("_", " ")}
                  </h3>
                  <span className="w-5 h-5 rounded-full bg-secondary text-[10px] font-bold flex items-center justify-center text-foreground">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {colTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleToggleTask(t)}
                      className="p-3 rounded-2xl bg-secondary/50 border border-border hover:border-primary cursor-pointer text-xs space-y-1.5 transition"
                    >
                      <div className="font-semibold text-foreground">{t.title}</div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{t.estimatedMinutes}m</span>
                        <span className="font-bold">{t.priority}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View: EISENHOWER MATRIX */}
      {view === "eisenhower" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Q1: Urgent & Important */}
          <div className="p-5 rounded-3xl bg-card border-2 border-rose-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">
                Q1: Urgent &amp; Important (Do First)
              </span>
            </div>
            <div className="space-y-2">
              {tasks.filter((t) => t.quadrant === "Q1_URGENT_IMPORTANT").map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleToggleTask(t)}
                  className="p-2.5 rounded-xl bg-secondary/60 hover:bg-secondary cursor-pointer text-xs font-medium"
                >
                  {t.title}
                </div>
              ))}
            </div>
          </div>

          {/* Q2: Important & Not Urgent */}
          <div className="p-5 rounded-3xl bg-card border-2 border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                Q2: Important &amp; Not Urgent (Schedule)
              </span>
            </div>
            <div className="space-y-2">
              {tasks.filter((t) => t.quadrant === "Q2_IMPORTANT_NOT_URGENT").map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleToggleTask(t)}
                  className="p-2.5 rounded-xl bg-secondary/60 hover:bg-secondary cursor-pointer text-xs font-medium"
                >
                  {t.title}
                </div>
              ))}
            </div>
          </div>

          {/* Q3: Urgent & Not Important */}
          <div className="p-5 rounded-3xl bg-card border-2 border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                Q3: Urgent &amp; Not Important (Delegate)
              </span>
            </div>
            <div className="space-y-2">
              {tasks.filter((t) => t.quadrant === "Q3_URGENT_NOT_IMPORTANT").map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleToggleTask(t)}
                  className="p-2.5 rounded-xl bg-secondary/60 hover:bg-secondary cursor-pointer text-xs font-medium"
                >
                  {t.title}
                </div>
              ))}
            </div>
          </div>

          {/* Q4: Neither */}
          <div className="p-5 rounded-3xl bg-card border-2 border-slate-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Q4: Not Urgent &amp; Not Important (Eliminate)
              </span>
            </div>
            <div className="space-y-2">
              {tasks.filter((t) => t.quadrant === "Q4_NEITHER").map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleToggleTask(t)}
                  className="p-2.5 rounded-xl bg-secondary/60 hover:bg-secondary cursor-pointer text-xs font-medium"
                >
                  {t.title}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pomodoro Focus Timer Modal */}
      {isFocusOpen && (
        <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card p-8 rounded-3xl border border-border shadow-2xl text-center space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-500">Pomodoro Deep Focus</span>
              <button onClick={() => setIsFocusOpen(false)} className="p-1 rounded-lg hover:bg-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Timer Display */}
            <div className="py-6">
              <div className="text-6xl font-black font-mono tracking-wider text-foreground">
                {formatTimer(timeLeft)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {isRunning ? "Lock in. Cognitive flow state activated." : "Ready to focus?"}
              </p>
            </div>

            {/* Timer Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  if (!isRunning) {
                    setIsRunning(true);
                    if (ambientSound !== "none") playAmbientSound(ambientSound);
                  } else {
                    setIsRunning(false);
                    stopAmbientSound();
                  }
                }}
                className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25 hover:bg-primary-hover transition"
              >
                {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
              <button
                onClick={() => {
                  setIsRunning(false);
                  setTimeLeft(focusDuration);
                  stopAmbientSound();
                }}
                className="w-12 h-12 rounded-full border border-border text-foreground hover:bg-secondary flex items-center justify-center transition"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* Ambient Sound Selector */}
            <div className="pt-2 border-t border-border text-left space-y-2">
              <label className="block text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-purple-500" />
                <span>Ambient Audio Generator</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {["none", "rain", "stream", "cafe"].map((snd) => (
                  <button
                    key={snd}
                    onClick={() => {
                      setAmbientSound(snd as any);
                      if (isRunning) playAmbientSound(snd);
                    }}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold capitalize transition ${
                      ambientSound === snd
                        ? "bg-purple-600 text-white"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {snd}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add TimeBlock Modal */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card p-6 rounded-3xl border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">Schedule Time Block</h3>
              <button onClick={() => setIsBlockModalOpen(false)} className="p-1 rounded hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBlock} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Block Title</label>
                <input
                  type="text"
                  required
                  value={blockTitle}
                  onChange={(e) => setBlockTitle(e.target.value)}
                  placeholder="e.g. Deep Architecture Coding"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Start Time</label>
                  <input
                    type="time"
                    value={blockStart}
                    onChange={(e) => setBlockStart(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-input bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">End Time</label>
                  <input
                    type="time"
                    value={blockEnd}
                    onChange={(e) => setBlockEnd(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-input bg-background"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="w-1/3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover"
                >
                  Save Time Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
