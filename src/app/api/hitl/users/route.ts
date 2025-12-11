import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json(); // Botpress sends JSON

    console.log("📨 HITL: Create User", body);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ HITL Users Error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Users endpoint" });
}
