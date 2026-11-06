"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Target,
  Sparkles,
  Plus,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Copy,
  Share2,
  Bookmark,
  Check,
  Flame,
  ArrowRight,
  X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function GoalsPage() {
  const { user, t } = useApp();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [smartStep, setSmartStep] = useState(1);

  // New goal form state
  const [title, setTitle] = useState("");
  const [whyItMatters, setWhyItMatters] = useState("");
  const [category, setCategory] = useState("Personal");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [deadline, setDeadline] = useState("");
  const [milestonesInput, setMilestonesInput] = useState(["", ""]);
  const [actionStepsInput, setActionStepsInput] = useState([""]);
  const [obstaclesInput, setObstaclesInput] = useState([{ obstacle: "", solution: "" }]);

  const categories = ["ALL", "Business", "Study", "Career", "Health", "Finance", "Personal"];

  const fetchGoals = async () => {
    try {
      const res = await fetch("/api/v1/goals");
      const data = await res.json();
      if (data.goals) setGoals(data.goals);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !whyItMatters.trim() || !deadline) return;

    const filteredMilestones = milestonesInput.filter((m) => m.trim().length > 0).map((m) => ({ title: m }));
    const filteredSteps = actionStepsInput.filter((s) => s.trim().length > 0);
    const filteredObstacles = obstaclesInput.filter((o) => o.obstacle.trim().length > 0);

    const res = await fetch("/api/v1/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        whyItMatters,
        category,
        priority,
        deadline,
        milestones: filteredMilestones,
        plan: {
          actionSteps: filteredSteps,
          resourcesNeeded: ["Standard deep work tools"],
          obstaclesSolutions: filteredObstacles,
          supportPeople: [],
        },
      }),
    });

    if (res.ok) {
      setIsCreateOpen(false);
      resetForm();
      fetchGoals();
    }
  };

  const handleCloneTemplate = async (slug: string) => {
    const res = await fetch("/api/v1/goals/clone-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });

    if (res.ok) {
      setIsTemplateOpen(false);
      fetchGoals();
      const confetti = (await import("canvas-confetti")).default;
      confetti({ particleCount: 50, spread: 60 });
    }
  };

  const resetForm = () => {
    setTitle("");
    setWhyItMatters("");
    setCategory("Personal");
    setPriority("MEDIUM");
    setDeadline("");
    setMilestonesInput(["", ""]);
    setActionStepsInput([""]);
    setObstaclesInput([{ obstacle: "", solution: "" }]);
    setSmartStep(1);
  };

  const filteredGoals = goals.filter((g) => {
    const matchesCat = selectedCategory === "ALL" || g.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.whyItMatters.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">{t.goals.title}</h1>
          <p className="text-sm text-muted-foreground">{t.goals.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsTemplateOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Bookmark className="w-4 h-4 text-purple-500" />
            <span>{t.goals.templates}</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{t.goals.newGoal}</span>
          </button>
        </div>
      </div>

      {/* Filter Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter goals..."
          className="px-3.5 py-1.5 text-xs rounded-xl border border-input bg-background text-foreground max-w-xs"
        />
      </div>

      {/* Goals Grid */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Loading your goals...</div>
      ) : filteredGoals.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-3xl border border-dashed border-border p-8 space-y-3">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <h2 className="font-bold text-base text-foreground">No goals in this category yet</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Establish your vision with our guided SMART goal builder or clone a curated template.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={() => setIsTemplateOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-secondary"
            >
              Clone Template
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
            >
              Create First Goal
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGoals.map((goal) => {
            const daysLeft = Math.ceil(
              (new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
            );
            return (
              <Link
                key={goal.id}
                href={`/goals/${goal.id}`}
                prefetch={false}
                className="group p-5 rounded-3xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                      {goal.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        goal.priority === "URGENT"
                          ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                          : goal.priority === "HIGH"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {goal.priority}
                    </span>
                  </div>

                  <h2 className="font-bold text-base text-foreground group-hover:text-primary transition line-clamp-2">
                    {goal.title}
                  </h2>

                  <p className="text-xs text-muted-foreground line-clamp-2 font-light">{goal.whyItMatters}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{daysLeft > 0 ? `${daysLeft} days remaining` : "Due today"}</span>
                    </div>
                    <span
                      className={`font-bold text-[11px] ${
                        goal.health === "ON_TRACK"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : goal.health === "AT_RISK"
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-rose-700 dark:text-rose-400"
                      }`}
                    >
                      {goal.health.replace("_", " ")}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-foreground">{goal.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${goal.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground flex justify-between">
                    <span>{goal.milestones?.length || 0} Milestones</span>
                    <span>{goal.tasks?.length || 0} Tasks</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* SMART Goal Creation Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full bg-card p-6 md:p-8 rounded-3xl border border-border shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Guided SMART Goal Builder</h2>
                <p className="text-xs text-muted-foreground">
                  Specific • Measurable • Achievable • Relevant • Time-Bound
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step navigation tabs */}
            <div className="flex gap-2 text-xs font-semibold border-b border-border pb-2">
              <button
                type="button"
                onClick={() => setSmartStep(1)}
                className={`px-3 py-1 rounded-lg ${smartStep === 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                1. Vision & SMART
              </button>
              <button
                type="button"
                onClick={() => setSmartStep(2)}
                className={`px-3 py-1 rounded-lg ${smartStep === 2 ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                2. Milestones
              </button>
              <button
                type="button"
                onClick={() => setSmartStep(3)}
                className={`px-3 py-1 rounded-lg ${smartStep === 3 ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                3. Obstacles & Plan
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              {smartStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Specific Goal Title (What exactly will you achieve?)
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Master Full-Stack Architecture & Ship GoalPath to 1,000 Users"
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Relevant Anchor (Why does this matter deeply to you?)
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={whyItMatters}
                      onChange={(e) => setWhyItMatters(e.target.value)}
                      placeholder="e.g. It creates financial autonomy, delivers real utility, and demonstrates elite engineering craft."
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-background text-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background text-foreground"
                      >
                        {categories.filter((c) => c !== "ALL").map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Priority</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background text-foreground"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Time-Bound Deadline</label>
                      <input
                        type="date"
                        required
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background text-foreground"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSmartStep(2)}
                    disabled={!title || !whyItMatters || !deadline}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <span>Proceed to Milestones</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {smartStep === 2 && (
                <div className="space-y-4">
                  <div className="text-xs text-muted-foreground">
                    Break this goal into progressive, measurable milestones:
                  </div>

                  {milestonesInput.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 text-xs font-bold text-muted-foreground">{idx + 1}.</span>
                      <input
                        type="text"
                        value={m}
                        onChange={(e) => {
                          const copy = [...milestonesInput];
                          copy[idx] = e.target.value;
                          setMilestonesInput(copy);
                        }}
                        placeholder={`Milestone ${idx + 1}`}
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-input bg-background text-foreground"
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setMilestonesInput([...milestonesInput, ""])}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Milestone
                  </button>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSmartStep(1)}
                      className="w-1/3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-secondary"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmartStep(3)}
                      className="w-2/3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover flex items-center justify-center gap-1"
                    >
                      <span>Proceed to Execution Plan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {smartStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Action Steps (How will you execute daily?)
                    </label>
                    {actionStepsInput.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={s}
                          onChange={(e) => {
                            const copy = [...actionStepsInput];
                            copy[idx] = e.target.value;
                            setActionStepsInput(copy);
                          }}
                          placeholder={`Daily Action Step ${idx + 1}`}
                          className="flex-1 px-3 py-2 text-xs rounded-xl border border-input bg-background text-foreground"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setActionStepsInput([...actionStepsInput, ""])}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Step
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Predicted Obstacles &amp; Pre-Planned Countermeasures
                    </label>
                    {obstaclesInput.map((o, idx) => (
                      <div key={idx} className="grid grid-cols-2 gap-2 mb-2">
                        <input
                          type="text"
                          value={o.obstacle}
                          onChange={(e) => {
                            const copy = [...obstaclesInput];
                            copy[idx].obstacle = e.target.value;
                            setObstaclesInput(copy);
                          }}
                          placeholder="Obstacle (e.g. Distractions)"
                          className="px-3 py-1.5 text-xs rounded-xl border border-input bg-background text-foreground"
                        />
                        <input
                          type="text"
                          value={o.solution}
                          onChange={(e) => {
                            const copy = [...obstaclesInput];
                            copy[idx].solution = e.target.value;
                            setObstaclesInput(copy);
                          }}
                          placeholder="Solution (e.g. Phone in other room)"
                          className="px-3 py-1.5 text-xs rounded-xl border border-input bg-background text-foreground"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setSmartStep(2)}
                      className="w-1/3 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-secondary"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover flex items-center justify-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save &amp; Activate Goal</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Template Cloning Modal */}
      {isTemplateOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-card p-6 md:p-8 rounded-3xl border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">Clone a Proven Goal Template</h2>
              <button
                onClick={() => setIsTemplateOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <div
                onClick={() => handleCloneTemplate("launch-saas")}
                className="p-4 rounded-2xl border border-border hover:border-primary cursor-pointer hover:bg-secondary/40 transition flex items-center justify-between"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">
                    Business
                  </span>
                  <div className="font-bold text-sm text-foreground">Launch a SaaS to First 100 Paying Users</div>
                  <div className="text-xs text-muted-foreground">90 Days • 4 Milestones • Obstacle Playbook</div>
                </div>
                <Copy className="w-4 h-4 text-primary shrink-0" />
              </div>

              <div
                onClick={() => handleCloneTemplate("crack-exam")}
                className="p-4 rounded-2xl border border-border hover:border-primary cursor-pointer hover:bg-secondary/40 transition flex items-center justify-between"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500">
                    Study &amp; Academics
                  </span>
                  <div className="font-bold text-sm text-foreground">Crack Competitive Exam with High Percentile</div>
                  <div className="text-xs text-muted-foreground">120 Days • 4 Milestones • 20 Mocks Schedule</div>
                </div>
                <Copy className="w-4 h-4 text-primary shrink-0" />
              </div>

              <div
                onClick={() => handleCloneTemplate("run-marathon")}
                className="p-4 rounded-2xl border border-border hover:border-primary cursor-pointer hover:bg-secondary/40 transition flex items-center justify-between"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                    Health &amp; Fitness
                  </span>
                  <div className="font-bold text-sm text-foreground">Complete a Marathon with Strong Aerobic Base</div>
                  <div className="text-xs text-muted-foreground">100 Days • Long Run Progression • Hydration Plan</div>
                </div>
                <Copy className="w-4 h-4 text-primary shrink-0" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
