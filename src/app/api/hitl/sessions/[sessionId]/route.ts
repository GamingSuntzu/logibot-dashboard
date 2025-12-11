import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  console.log("📨 HITL: Stop Session", params.sessionId);

  return NextResponse.json({ ok: true });
}
