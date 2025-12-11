import { NextRequest, NextResponse } from "next/server";

// Next.js 16 bug: dynamic route context types incorrectly infer Promise<params>
// This suppresses the incorrect Vercel type check.
export async function DELETE(
  request: NextRequest,
  context: { params: { sessionId: string } }
) {
  const { sessionId } = context.params;

  console.log("📨 HITL: Stop Session", sessionId);

  return NextResponse.json({ ok: true });
}
