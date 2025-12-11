import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  context: { params: { sessionId: string } }
) {
  const { sessionId } = context.params;

  console.log("Deleting session:", sessionId);

  return NextResponse.json({ ok: true });
}
