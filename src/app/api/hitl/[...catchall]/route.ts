import { NextRequest, NextResponse } from "next/server";

type Params = {
  catchall: string[];
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<Params> }
) {
  const { catchall } = await context.params;

  console.log("⚠️ HITL CATCH-ALL GET");
  console.log("Path:", catchall);

  return NextResponse.json({ ok: true });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<Params> }
) {
  const { catchall } = await context.params;

  let body = null;
  try {
    body = await req.json();
  } catch {}

  console.log("⚠️ HITL CATCH-ALL POST");
  console.log("Path:", catchall);
  console.log("Body:", body);

  return NextResponse.json({ ok: true });
}
