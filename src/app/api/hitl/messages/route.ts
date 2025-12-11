import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    let body = {};

    try {
      body = await req.json(); // Botpress should send JSON, but not guaranteed
    } catch {
      body = {}; // Prevent crashes
    }

    console.log("📨 HITL: Message Received", body);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ HITL Messages Error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Messages endpoint",
  });
}
