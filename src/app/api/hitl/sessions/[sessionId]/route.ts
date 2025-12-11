import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  context: { params: { sessionId: string } }
) {
  const { sessionId } = context.params;

  console.log("📨 HITL: Stop Session", sessionId);

  return NextResponse.json({ ok: true });
}
