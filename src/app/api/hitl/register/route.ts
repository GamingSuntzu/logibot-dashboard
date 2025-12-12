import { NextResponse } from "next/server";

export async function POST() {
  console.log("📨 HITL: Register endpoint called by Botpress");

  return NextResponse.json({
    ok: true,
    service: "logibot-hitl",
    version: "1.0",
  });
}
