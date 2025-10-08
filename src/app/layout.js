import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./sidebar"; // Import sidebar

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Logibot Dashboard",
  description: "Client Dashboard for Logibot",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex h-screen`}>
        <Sidebar />
        <main
          className="
            flex-1 bg-slate-900 text-white overflow-y-auto
            pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0
          "
        >
          {children}
        </main>
      </body>
    </html>
  );
}
