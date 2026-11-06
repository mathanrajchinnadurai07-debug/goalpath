import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser, sanitizeText, validateCsrf } from "@/lib/auth";

const thankYouSchema = z.object({
  supportPersonId: z.string().min(1),
  message: z.string().min(5, "Message must be at least 5 characters").max(2000),
  channel: z.enum(["WHATSAPP", "EMAIL", "MANUAL"]).default("WHATSAPP"),
});

export async function POST(req: NextRequest) {
  try {
    if (!validateCsrf(req)) {
      return NextResponse.json({ error: "Invalid CSRF origin" }, { status: 403 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = thankYouSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid thank you note data" }, { status: 400 });
    }

    const { supportPersonId, message, channel } = parsed.data;

    // IDOR protection: Person must belong to user
    const person = await prisma.supportPerson.findFirst({
      where: { id: supportPersonId, userId: user.id },
    });

    if (!person) {
      return NextResponse.json({ error: "Support person not found" }, { status: 404 });
    }

    const now = new Date();
    const cleanMessage = sanitizeText(message);

    const note = await prisma.thankYouNote.create({
      data: {
        userId: user.id,
        supportPersonId,
        message: cleanMessage,
        channel,
        sentAt: now,
      },
    });

    // Update lastThankedAt on support person
    await prisma.supportPerson.update({
      where: { id: supportPersonId },
      data: { lastThankedAt: now },
    });

    // Generate direct action links
    const encodedMsg = encodeURIComponent(cleanMessage);
    const cleanPhone = person.phone ? person.phone.replace(/[^0-9]/g, "") : "";
    const whatsAppUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
      : `https://api.whatsapp.com/send?text=${encodedMsg}`;

    const mailtoUrl = person.email
      ? `mailto:${person.email}?subject=${encodeURIComponent("Heartfelt Thank You - " + user.name)}&body=${encodedMsg}`
      : `mailto:?subject=${encodeURIComponent("Heartfelt Thank You - " + user.name)}&body=${encodedMsg}`;

    return NextResponse.json({
      success: true,
      note,
      whatsAppUrl,
      mailtoUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to send thank-you note" }, { status: 500 });
  }
}
