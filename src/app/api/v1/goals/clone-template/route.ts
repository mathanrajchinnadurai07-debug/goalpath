import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const GOAL_TEMPLATES = [
  {
    slug: "crack-exam",
    title: "Crack Competitive Examination with High Percentile",
    whyItMatters: "Unlock life-changing career and academic opportunities through structured mastery.",
    category: "Study",
    priority: "HIGH",
    coverColor: "#9333ea",
    coverIcon: "book-open",
    durationDays: 120,
    milestones: [
      "Complete syllabus concept mapping and study schedule",
      "Finish deep revision of high-weightage topics",
      "Solve 20 full-length timed mock tests and review mistakes",
      "Final week formula memory consolidation and calm mindset",
    ],
    plan: {
      actionSteps: [
        "Study 4 hours daily in focused 50-minute Pomodoro blocks",
        "Make concise summary flashcards for every chapter",
        "Weekly simulated exam every Sunday morning",
      ],
      resourcesNeeded: ["Standard syllabus guide", "Mock test platform subscription", "Focus timer"],
      obstaclesSolutions: [
        { obstacle: "Burnout and mental exhaustion", solution: "Mandatory Sunday afternoon rest and 7h sleep" },
        { obstacle: "Distraction by phone notifications", solution: "Phone placed in another room during study" },
      ],
      supportPeople: ["Senior Mentor / Professor", "Study Buddy"],
    },
  },
  {
    slug: "launch-saas",
    title: "Launch a Micro-SaaS Product to First 100 Paying Users",
    whyItMatters: "Achieve financial independence and build software that genuinely solves acute pain.",
    category: "Business",
    priority: "URGENT",
    coverColor: "#4f46e5",
    coverIcon: "rocket",
    durationDays: 90,
    milestones: [
      "Validate problem with 20 prospective user discovery calls",
      "Build production-grade MVP (Auth, Core Engine, Stripe Billing)",
      "Public launch on Product Hunt, LinkedIn & Twitter/X",
      "Reach 100 paying customers and positive unit economics",
    ],
    plan: {
      actionSteps: [
        "Ship code daily and speak to at least 2 users every week",
        "Maintain high security standards (OWASP Top 10, encrypted cookies)",
        "Write transparent build-in-public weekly retrospectives",
      ],
      resourcesNeeded: ["Next.js App Router", "Prisma ORM", "Stripe Checkout", "Vercel / VPS"],
      obstaclesSolutions: [
        { obstacle: "Scope creep delaying MVP launch", solution: "Enforce strict 4-week MVP feature cap" },
        { obstacle: "Low initial website conversion", solution: "Record 90-second Loom demo showing instant value" },
      ],
      supportPeople: ["Co-founder / Mastermind partner", "Technical Advisor"],
    },
  },
  {
    slug: "run-marathon",
    title: "Complete a Marathon / Half-Marathon with Strong Form",
    whyItMatters: "Build indestructible cardiovascular endurance, mental toughness, and longevity.",
    category: "Health",
    priority: "MEDIUM",
    coverColor: "#059669",
    coverIcon: "activity",
    durationDays: 100,
    milestones: [
      "Build aerobic base: 20km weekly volume with comfortable breathing",
      "Long run progression reaching 16km continuous",
      "Peak training block: 30km long run and race pace testing",
      "Two-week taper, nutrition carb loading, and race completion",
    ],
    plan: {
      actionSteps: [
        "Run 4 times per week (2 easy, 1 interval tempo, 1 long run)",
        "Post-run mobility and dynamic hamstring/calf stretching",
        "Hydrate 3 liters daily and prioritize protein intake",
      ],
      resourcesNeeded: ["Quality running shoes", "GPS running watch / Strava", "Electrolyte hydration packs"],
      obstaclesSolutions: [
        { obstacle: "Shin splints or knee stiffness", solution: "Soft trail running surface and foam rolling" },
        { obstacle: "Skipping runs due to fatigue", solution: "Schedule runs at sunrise before morning meetings" },
      ],
      supportPeople: ["Running coach", "Training partner"],
    },
  },
];

const cloneSchema = z.object({
  slug: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = cloneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid template slug" }, { status: 400 });
    }

    const template = GOAL_TEMPLATES.find((t) => t.slug === parsed.data.slug);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const deadline = new Date(Date.now() + template.durationDays * 24 * 60 * 60 * 1000);

    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: template.title,
        whyItMatters: template.whyItMatters,
        category: template.category,
        priority: template.priority,
        status: "IN_PROGRESS",
        coverColor: template.coverColor,
        coverIcon: template.coverIcon,
        deadline,
        progressPercent: 0,
        health: "ON_TRACK",
        milestones: {
          create: template.milestones.map((m, idx) => ({
            title: m,
            order: idx + 1,
            isCompleted: false,
          })),
        },
        plan: {
          create: {
            actionSteps: JSON.stringify(template.plan.actionSteps),
            resourcesNeeded: JSON.stringify(template.plan.resourcesNeeded),
            obstaclesSolutions: JSON.stringify(template.plan.obstaclesSolutions),
            supportPeople: JSON.stringify(template.plan.supportPeople),
          },
        },
      },
      include: {
        milestones: true,
        plan: true,
      },
    });

    return NextResponse.json({ success: true, goal });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to clone template" }, { status: 500 });
  }
}
