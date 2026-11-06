import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { createAuditLog, getCurrentUser, SESSION_COOKIE_NAME, verifyPassword } from "@/lib/auth";

const deleteSchema = z.object({
  password: z.string().min(1),
  confirmationText: z.literal("DELETE MY ACCOUNT"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Must confirm by entering your password and typing 'DELETE MY ACCOUNT'." },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = await verifyPassword(parsed.data.password, dbUser.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Incorrect password verification." }, { status: 401 });
    }

    await createAuditLog({
      actorEmail: dbUser.email,
      action: "ACCOUNT_DELETED_ERASURE",
      resource: "Privacy",
      details: "User initiated full GDPR erasure. All rows permanently shredded.",
    });

    // Cascade deletes all user data
    await prisma.user.delete({
      where: { id: user.id },
    });

    const response = NextResponse.json({
      success: true,
      message: "Your account and all associated personal data have been permanently erased.",
    });

    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch (error: any) {
    console.error("Account delete error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
