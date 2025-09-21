"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  // Hide sidebar on login page
  if (pathname === "/login") return null;

  return (
    <nav
      style={{
        width: "60px",
        background: "#1e293b",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "10px 0",
      }}
    >
      <Link
        href="/chat"
        style={{
          margin: "20px 0",
          fontSize: "24px",
          background: pathname === "/chat" ? "#3b82f6" : "transparent",
          borderRadius: "8px",
          padding: "6px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "40px",
          height: "40px",
        }}
      >
        💬
      </Link>

      <Link
        href="/analytics"
        style={{
          margin: "20px 0",
          fontSize: "24px",
          background: pathname === "/analytics" ? "#3b82f6" : "transparent",
          borderRadius: "8px",
          padding: "6px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "40px",
          height: "40px",
        }}
      >
        📊
      </Link>
    </nav>
  );
}
