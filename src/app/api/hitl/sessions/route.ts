import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    let body = {};

    try {
      body = await req.json();
    } catch {
      body = {};
    }

    console.log("📨 HITL: Create Session", body);

    // Future: Insert into Supabase sessions table

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ HITL Sessions Error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Sessions endpoint",
  });
}
