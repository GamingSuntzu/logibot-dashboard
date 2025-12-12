import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    agents: [
      { id: "agent-1", name: "Support Agent" }
    ]
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  console.log("📨 HITL: Create Agent", body);

  return NextResponse.json({ ok: true });
}
