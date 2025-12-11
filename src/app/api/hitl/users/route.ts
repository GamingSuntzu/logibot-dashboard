import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    let body = {};
    try {
      // Botpress will send JSON, but fail-safe parsing avoids runtime crashes
      body = await req.json();
    } catch {
      body = {};
    }

    console.log("📨 HITL USERS POST:", body);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("❌ HITL USERS ERROR:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Users endpoint working" });
}
