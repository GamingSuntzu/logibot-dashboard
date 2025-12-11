import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  context: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = context.params;

    console.log("📨 HITL: Stop Session", sessionId);

    // Future: Update Supabase session status

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ HITL Stop Session Error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: { sessionId: string } }
) {
  return NextResponse.json({
    ok: true,
    message: "Session details",
    sessionId: context.params.sessionId,
  });
}
