"use client"

import { useAuthClient } from "@/hooks/useAuthClient"
import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis
} from "recharts"
import { FaWhatsapp } from "react-icons/fa"

function GaugeCard({ label, used, limit, note }) {
  const safeLimit = limit || 1
  const percent = (used / safeLimit) * 100
  const color =
    percent > 90 ? "#FF0000" :
    percent > 60 ? "#FFCC00" :
    "#00FF00"

  return (
    <div className="bg-gray-900 p-4 rounded-2xl shadow-lg flex flex-col items-center relative">
      <h2 className="text-md font-semibold mb-2">{label}</h2>

      <div className="relative flex items-center justify-center">
        <RadialBarChart
          width={200}
          height={200}
          cx="50%"
          cy="50%"
          innerRadius="70%"
          outerRadius="100%"
          barSize={18}
          data={[{ name: label, value: percent, fill: color }]}
          startAngle={180}
          endAngle={0}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar background clockWise dataKey="value" isAnimationActive />
        </RadialBarChart>

        <div className="absolute text-center">
          <p className="text-2xl font-bold" style={{ color }}>
            {Math.round(percent)}%
          </p>
          <p className="text-sm text-gray-300">
            {used} / {limit || "∞"}
          </p>
        </div>
      </div>

      {note && (
        <p className="text-xs text-gray-500 mt-2 italic text-center">{note}</p>
      )}
    </div>
  )
}

export default function QuotaPage() {
  const { clientId, session, loading } = useAuthClient()
  const [stats, setStats] = useState({ total: 0, incoming: 0, outgoing: 0, users: 0 })
  const [limits, setLimits] = useState({ inLimit: 0, outLimit: 0, userLimit: 0, planName: "" })
  const [showModal, setShowModal] = useState(false)

  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString()

  // Fetch quota plan details
  useEffect(() => {
    if (!clientId) return

    async function fetchClientQuota() {
      const { data, error } = await supabase
        .from("clients")
        .select(`
          id,
          quota_plans (
            name,
            in_limit,
            out_limit,
            user_limit
          )
        `)
        .eq("id", clientId)
        .single()

      if (error) {
        console.error("Error fetching quota plan:", error)
        return
      }

      if (data?.quota_plans) {
        setLimits({
          planName: data.quota_plans.name,
          inLimit: data.quota_plans.in_limit,
          outLimit: data.quota_plans.out_limit,
          userLimit: data.quota_plans.user_limit
        })
      }
    }

    fetchClientQuota()
  }, [clientId])

  // Fetch usage stats
  useEffect(() => {
    if (!clientId) return

    async function fetchStats() {
      const { count: total } = await supabase
        .from("chat_logs")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .gte("created_at", firstDay)
        .lte("created_at", lastDay)

      const { count: incoming } = await supabase
        .from("chat_logs")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("sender", "user")
        .gte("created_at", firstDay)
        .lte("created_at", lastDay)

      const { count: outgoing } = await supabase
        .from("chat_logs")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("sender", "bot")
        .gte("created_at", firstDay)
        .lte("created_at", lastDay)

      const { data: userRows } = await supabase
        .from("chat_logs")
        .select("phone_number")
        .eq("client_id", clientId)
        .gte("created_at", firstDay)
        .lte("created_at", lastDay)

      const uniqueUsers = userRows ? new Set(userRows.map(r => r.phone_number)).size : 0

      setStats({
        total: total ?? 0,
        incoming: incoming ?? 0,
        outgoing: outgoing ?? 0,
        users: uniqueUsers
      })
    }

    fetchStats()
  }, [clientId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-400"></div>
      </div>
    )
  }

  // Highest usage % between incoming and outgoing
  const usagePercent = Math.max(
    (stats.incoming / limits.inLimit) * 100 || 0,
    (stats.outgoing / limits.outLimit) * 100 || 0
  )

  // 🧪 Debug multiplier to simulate high usage (set >1.0 to test warnings)
  const debugMultiplier = 1
  const simulatedUsagePercent = Math.min(usagePercent * debugMultiplier, 100)

  const totalLimit = limits.inLimit + limits.outLimit
  const resetDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  })

  return (
    <div className="p-6 text-white relative">
      <h1 className="text-2xl font-bold mb-2">Quota Usage</h1>
      <p className="text-sm text-gray-400 mb-4">
        Logged in as: <span className="text-green-400">{session?.user?.email}</span>
      </p>

      {/* Plan info */}
      <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl mb-4">
        <p className="text-lg font-semibold">
          Plan: <span className="text-green-400 capitalize">{limits.planName || "Loading..."}</span>
        </p>
        <p className="text-sm text-gray-400">
          Inbound limit: {limits.inLimit?.toLocaleString()} | Outbound limit: {limits.outLimit?.toLocaleString()}
        </p>
        <p className="text-sm text-gray-400">Resets on: {resetDate}</p>
      </div>

      {/* Warning Banner */}
      {simulatedUsagePercent > 80 && (
        <div className="bg-yellow-900 border border-yellow-600 text-yellow-300 p-3 rounded-xl text-center mb-6">
          ⚠️ You’ve used {Math.round(simulatedUsagePercent)}% of your quota this month.
          <button
            onClick={() => setShowModal(true)}
            className="text-green-400 underline ml-1"
          >
            Request plan change
          </button>
        </div>
      )}

      <GaugeCard label="Total Messages" used={stats.total} limit={totalLimit} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <GaugeCard label="Incoming" used={stats.incoming} limit={limits.inLimit} />
        <GaugeCard label="Outgoing" used={stats.outgoing} limit={limits.outLimit} />
        <GaugeCard
          label="Unique Users"
          used={stats.users}
          limit={limits.userLimit}
          note="Flexible Limit"
        />
      </div>

      {/* Plan change modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/40 z-50">
          <div 
            className="bg-gray-900 p-8 rounded-2xl shadow-2xl w-96 text-center border transition-all duration-200"
            style={{
              borderColor: "#215f9aff",
              boxShadow: "0 0 20px rgba(33, 95, 154, 0.3)"  // soft glow of Logibot blue
            }}
          >
            <h2 
              className="text-xl font-semibold mb-4 border-b pb-2"
              style={{ borderColor: "#215f9aff" }}
            >
              Request Plan Change
            </h2>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              To upgrade or modify your plan, please contact <span style={{ color: "#215f9aff" }} className="font-semibold">Logibot</span>{" "} support.  
              Plan changes will take effect at the start of the next billing cycle.
            </p>

            <div className="flex flex-col md:flex-row justify-center gap-4">
            <a
              href="https://wa.me/6287773139683?text=Halo%20tim%20Logibot,%20saya%20mau%20upgrade%20paket%20layanan%20saya."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#215f9aff] hover:bg-[#1b4d80ff] px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 w-full md:w-auto shadow-md hover:shadow-lg"
            >
              <FaWhatsapp className="text-xl" />
              Contact via WhatsApp
            </a>

            <button
              onClick={() => setShowModal(false)}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-white font-medium transition-colors w-full md:w-auto"
            >
              Close
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
