import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  console.log("🌐 Incoming Request");
  console.log("➡️ Method:", req.method);
  console.log("➡️ URL:", req.nextUrl.pathname);
  console.log("➡️ Headers:", Object.fromEntries(req.headers.entries()));

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
