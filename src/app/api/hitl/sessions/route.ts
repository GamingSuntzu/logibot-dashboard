import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  console.log("📨 HITL: Create Session", body);

  return NextResponse.json({ ok: true });
}
