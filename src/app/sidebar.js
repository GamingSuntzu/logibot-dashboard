"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiLogOut } from "react-icons/fi";
import { BiChat, BiLineChart, BiTachometer } from "react-icons/bi";
import { supabase } from "../../lib/supabaseClient";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  if (["/login", "/reset-password", "/update-password"].includes(pathname)) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <nav
        className="hidden md:flex flex-col justify-between items-center"
        style={{
          width: "60px",
          background: "#1e293b",
          color: "white",
          padding: "10px 0",
          height: "100vh",
        }}
      >
        <div>
          <Link
            href="/chat"
            className={`flex justify-center items-center w-10 h-10 m-5 rounded-lg ${
              pathname === "/chat" ? "bg-blue-500" : ""
            }`}
          >
            <BiChat size={22} />
          </Link>

          <Link
            href="/analytics"
            className={`flex justify-center items-center w-10 h-10 m-5 rounded-lg ${
              pathname === "/analytics" ? "bg-blue-500" : ""
            }`}
          >
            <BiLineChart size={22} />
          </Link>

          <Link
            href="/quota"
            className={`flex justify-center items-center w-10 h-10 m-5 rounded-lg ${
              pathname === "/quota" ? "bg-blue-500" : ""
            }`}
          >
            <BiTachometer size={22} />
          </Link>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 w-10 h-10 m-5 flex justify-center items-center rounded-lg"
          title="Logout"
        >
          <FiLogOut size={20} />
        </button>
      </nav>

      {/* Mobile Bottom Nav (hidden on desktop) */}
      <nav className="flex md:hidden fixed bottom-0 left-0 w-full bg-slate-900 text-white justify-around items-center h-16 border-t border-slate-700 z-50">
  <Link href="/chat" className="flex flex-col items-center">
  <BiChat
    size={22}
    className={pathname === "/chat" ? "text-blue-400" : "text-white"}
  />
  <span className={pathname === "/chat" ? "text-blue-400 text-xs" : "text-white text-xs"}>
    Chats
  </span>
</Link>

<Link href="/analytics" className="flex flex-col items-center">
  <BiLineChart
    size={22}
    className={pathname === "/analytics" ? "text-blue-400" : "text-white"}
  />
  <span className={pathname === "/analytics" ? "text-blue-400 text-xs" : "text-white text-xs"}>
    Analytics
  </span>
</Link>

<Link href="/quota" className="flex flex-col items-center">
  <BiTachometer
    size={22}
    className={pathname === "/quota" ? "text-blue-400" : "text-white"}
  />
  <span className={pathname === "/quota" ? "text-blue-400 text-xs" : "text-white text-xs"}>
    Quota
  </span>
</Link>

<button onClick={handleLogout} className="flex flex-col items-center">
  <FiLogOut size={22} className="text-red-400" />
  <span className="text-red-400 text-xs">Logout</span>
</button>

</nav>

    </>
  );
}
