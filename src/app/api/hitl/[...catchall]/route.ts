import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: { catchall: string[] } }
) {
  console.log("⚠️ HITL CATCH-ALL GET");
  console.log("Path:", context.params.catchall);

  return NextResponse.json({ ok: true });
}

export async function POST(
  req: NextRequest,
  context: { params: { catchall: string[] } }
) {
  let body = null;
  try {
    body = await req.json();
  } catch {}

  console.log("⚠️ HITL CATCH-ALL POST");
  console.log("Path:", context.params.catchall);
  console.log("Body:", body);

  return NextResponse.json({ ok: true });
}
