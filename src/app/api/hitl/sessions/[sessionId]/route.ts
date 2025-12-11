import { NextRequest, NextResponse } from "next/server";

async function extractParams(
  params: { sessionId: string } | Promise<{ sessionId: string }>
) {
  // If params is a Promise, await it. If not, return as-is.
  return params instanceof Promise ? await params : params;
}

export async function DELETE(
  req: NextRequest,
  context: { params: { sessionId: string } | Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await extractParams(context.params);

    console.log("📨 HITL: Stop Session", sessionId);

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
  context: { params: { sessionId: string } | Promise<{ sessionId: string }> }
) {
  const { sessionId } = await extractParams(context.params);

  return NextResponse.json({
    ok: true,
    message: "Session details",
    sessionId,
  });
}
