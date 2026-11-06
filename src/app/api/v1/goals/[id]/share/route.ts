import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id } = await Promise.resolve(context.params);
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const goal = await prisma.goal.findFirst({
      where: { id, userId: user.id },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Toggle or generate token
    const shareToken = goal.shareToken || crypto.randomBytes(16).toString("hex");

    const updated = await prisma.goal.update({
      where: { id: goal.id },
      data: { shareToken },
    });

    return NextResponse.json({
      success: true,
      shareToken: updated.shareToken,
      shareUrl: `/shared/goal/${updated.shareToken}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to generate share link" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id } = await Promise.resolve(context.params);
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.goal.updateMany({
      where: { id, userId: user.id },
      data: { shareToken: null },
    });

    return NextResponse.json({ success: true, message: "Share link revoked" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to revoke share link" }, { status: 500 });
  }
}
