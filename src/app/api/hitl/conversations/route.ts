import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    let body = {};

    try {
      body = await req.json(); // Try to parse JSON
    } catch {
      body = {}; // Fallback if body is empty or invalid
    }

    console.log("📨 HITL: Create Conversation", body);

    // TODO: Later we will store the conversation in Supabase
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ HITL Conversations Error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Conversations endpoint",
  });
}
