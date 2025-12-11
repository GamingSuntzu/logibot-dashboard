import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    let body = {};

    try {
      body = await req.json(); // Try to parse JSON
    } catch {
      body = {}; // If empty or invalid JSON -> fallback
    }

    console.log("📨 HITL: Create User", body);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ HITL Users Error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Users endpoint" });
}
