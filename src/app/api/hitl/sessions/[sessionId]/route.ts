import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;

  console.log("📨 HITL: Stop Session", sessionId);

  return NextResponse.json({ ok: true });
}
