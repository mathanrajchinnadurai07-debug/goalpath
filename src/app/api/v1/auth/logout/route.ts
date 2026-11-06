import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      // Purges both Prisma database record and Redis distributed cache key
      await revokeSession(token);
    }

    const response = NextResponse.json({ success: true, message: "Logged out successfully" });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch (error: any) {
    console.error("Logout error:", error);
    const response = NextResponse.json({ success: true });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}
