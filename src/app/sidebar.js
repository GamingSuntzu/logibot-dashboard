"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiLogOut, FiMessageSquare, FiTrendingUp } from "react-icons/fi"; // icons
import { MdShowChart } from "react-icons/md"; // analytics icon
import { BiChat, BiLineChart, BiTachometer } from "react-icons/bi";
import { supabase } from "../../lib/supabaseClient"; // adjust path if needed

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;
  if (pathname === "/reset-password") return null;
  if (pathname === "/update-password") return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav
      style={{
        width: "60px",
        background: "#1e293b",
        color: "white",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        height: "100vh",
      }}
    >
      <div>
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
          <BiChat size={22} />
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
          <BiLineChart size={22} />
        </Link>

        <Link
          href="/quota"
          style={{
            margin: "20px 0",
            fontSize: "24px",
            background: pathname === "/quota" ? "#3b82f6" : "transparent",
            borderRadius: "8px",
            padding: "6px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "40px",
            height: "40px",
          }}
        >
          <BiTachometer size={22} />
        </Link>
      </div>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        style={{
          margin: "20px 0",
          background: "#ef4444", // red-500
          borderRadius: "8px",
          padding: "6px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "40px",
          height: "40px",
          border: "none",
          cursor: "pointer",
          color: "white",
          transition: "background 0.2s ease-in-out",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#dc2626")} // red-600
        onMouseLeave={(e) => (e.currentTarget.style.background = "#ef4444")}
        title="Logout"
      >
        <FiLogOut size={20} />
      </button>

    </nav>
  );
}
