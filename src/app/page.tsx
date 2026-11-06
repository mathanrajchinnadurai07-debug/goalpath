import React from "react";
import Link from "next/link";
import {
  Target,
  Calendar,
  Activity,
  Heart,
  Users,
  Shield,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="py-8 md:py-16">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
          <Sparkles className="w-4 h-4" />
          <span>The Production-Grade Platform for High-Achieving Planners</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
          Plan Your Day. <br />
          Achieve Big Goals. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
            Thank Who Helped.
          </span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-normal">
          GoalPath transforms ambitious vision into daily timeline execution, builds unbreakable habit streaks, and
          celebrates the mentors and peers who made your success possible.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/signup"
            prefetch={false}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:bg-primary-hover transition"
          >
            <span>Start Free Today</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/login"
            prefetch={false}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-secondary transition"
          >
            <span>Sign In to Account</span>
          </Link>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-card border border-border hover:shadow-md transition">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
            <Target className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-foreground mb-2">SMART Goals Engine</h2>
          <p className="text-sm text-muted-foreground">
            Deconstruct big North Star visions into milestone trees, execution plans, vision boards, and auto-computed
            health indices.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border hover:shadow-md transition">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
            <Calendar className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-foreground mb-2">Daily Planner & Focus</h2>
          <p className="text-sm text-muted-foreground">
            Time-blocking timeline, Eisenhower matrix, automatic task rollover, and ambient sound Pomodoro timer synced to
            calendar export.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border hover:shadow-md transition">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-4">
            <Heart className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-foreground mb-2">Gratitude & Support Network</h2>
          <p className="text-sm text-muted-foreground">
            Our signature capability: acknowledge the people who guided you, generate instant WhatsApp notes, and share
            on the gratitude wall.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border hover:shadow-md transition">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
            <Activity className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-foreground mb-2">Unbreakable Habits</h2>
          <p className="text-sm text-muted-foreground">
            Stack consistency streaks, visualize 365-day heatmaps, and schedule rest days without breaking your
            momentum.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border hover:shadow-md transition">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
            <Users className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-foreground mb-2">Accountability Teams</h2>
          <p className="text-sm text-muted-foreground">
            Pair with an accountability partner, create mastermind groups, share group challenges, and enable mentor
            inspection.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border hover:shadow-md transition">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
            <Shield className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-foreground mb-2">Enterprise Cybersecurity</h2>
          <p className="text-sm text-muted-foreground">
            OWASP Top 10 hardened, strict CSP headers, Argon2id/bcrypt encryption, TOTP 2FA, zero-knowledge admin boundary, and
            GDPR data erasure.
          </p>
        </div>
      </div>
    </div>
  );
}
