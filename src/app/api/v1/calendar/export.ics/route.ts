import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function formatDateToICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [tasks, timeblocks, goals] = await Promise.all([
      prisma.task.findMany({
        where: { userId: user.id, dueDate: { not: null } },
      }),
      prisma.timeBlock.findMany({
        where: { userId: user.id },
      }),
      prisma.goal.findMany({
        where: { userId: user.id, isArchived: false },
      }),
    ]);

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//GoalPath//Daily Planner & Goals//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:GoalPath - ${user.name}`,
    ];

    // Export Goals as Deadlines
    for (const g of goals) {
      const dtStart = formatDateToICS(new Date(g.deadline));
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:goal-${g.id}@goalpath.app`);
      lines.push(`DTSTAMP:${formatDateToICS(new Date())}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtStart}`);
      lines.push(`SUMMARY:🎯 Goal Deadline: ${g.title.replace(/[,;]/g, " ")}`);
      lines.push(`DESCRIPTION:Why it matters: ${g.whyItMatters.replace(/\n/g, " ")}`);
      lines.push("STATUS:CONFIRMED");
      lines.push("END:VEVENT");
    }

    // Export TimeBlocks as Scheduled Events
    for (const b of timeblocks) {
      const startIso = `${b.date}T${b.startTime}:00`;
      const endIso = `${b.date}T${b.endTime}:00`;
      const dtStart = formatDateToICS(new Date(startIso));
      const dtEnd = formatDateToICS(new Date(endIso));

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:block-${b.id}@goalpath.app`);
      lines.push(`DTSTAMP:${formatDateToICS(new Date())}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:⏰ ${b.title.replace(/[,;]/g, " ")}`);
      lines.push(`STATUS:${b.isCompleted ? "COMPLETED" : "CONFIRMED"}`);
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");

    const icsContent = lines.join("\r\n");

    return new NextResponse(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="goalpath-schedule.ics"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to generate .ics export" }, { status: 500 });
  }
}
