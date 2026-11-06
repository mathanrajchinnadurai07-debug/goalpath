import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const flags = await prisma.featureFlag.findMany({
      orderBy: { key: "asc" },
    });
    return NextResponse.json({ flags });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch feature flags" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const body = await req.json();
    const { key, isEnabled, rolloutPercentage } = body;

    const updated = await prisma.featureFlag.update({
      where: { key },
      data: {
        isEnabled: typeof isEnabled === "boolean" ? isEnabled : undefined,
        rolloutPercentage: typeof rolloutPercentage === "number" ? rolloutPercentage : undefined,
      },
    });

    return NextResponse.json({ success: true, flag: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update feature flag" }, { status: 500 });
  }
}
