import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createAuditLog, getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";

    const fullData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        goals: {
          include: {
            milestones: true,
            tasks: true,
            plan: true,
            visionItems: true,
          },
        },
        habits: {
          include: {
            logs: true,
          },
        },
        timeBlocks: true,
        focusSessions: true,
        gratitudeEntries: true,
        supportPeople: {
          include: {
            thankYouNotes: true,
          },
        },
        reviews: true,
        badges: true,
      },
    });

    if (!fullData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await createAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "DATA_EXPORT",
      resource: "Privacy",
      details: `User exported entire account data in ${format.toUpperCase()} format`,
    });

    // Strip internal security secrets before export
    const exportPayload = {
      profile: {
        id: fullData.id,
        email: fullData.email,
        name: fullData.name,
        timezone: fullData.timezone,
        language: fullData.language,
        theme: fullData.theme,
        createdAt: fullData.createdAt,
      },
      goals: fullData.goals,
      habits: fullData.habits,
      timeBlocks: fullData.timeBlocks,
      focusSessions: fullData.focusSessions,
      gratitudeEntries: fullData.gratitudeEntries,
      supportNetwork: fullData.supportPeople,
      reviews: fullData.reviews,
      badges: fullData.badges,
      exportTimestamp: new Date().toISOString(),
      complianceNotice: "Exported in accordance with GDPR Article 20 and India DPDP 2023 Right to Data Portability.",
    };

    if (format === "csv") {
      // Flatten goals to CSV format
      const csvRows = ["ID,Title,Category,Priority,Status,ProgressPercent,Deadline"];
      fullData.goals.forEach((g) => {
        csvRows.push(
          `"${g.id}","${g.title.replace(/"/g, '""')}","${g.category}","${g.priority}","${g.status}",${g.progressPercent},"${g.deadline.toISOString()}"`
        );
      });
      return new NextResponse(csvRows.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="goalpath-data-${user.id.slice(0, 8)}.csv"`,
        },
      });
    }

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="goalpath-export-${user.id.slice(0, 8)}.json"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
