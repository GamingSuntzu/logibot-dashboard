import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, message: "HITL root endpoint is working" });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ ok: true, message: "HITL root POST received" });
}
