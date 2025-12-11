import { NextRequest, NextResponse } from "next/server";

// Override Next.js broken dynamic route context typing
type RouteContext = {
  params: {
    sessionId: string;
  };
};

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const { sessionId } = context.params;

  console.log("📨 HITL: Stop Session", sessionId);

  return NextResponse.json({ ok: true });
}
