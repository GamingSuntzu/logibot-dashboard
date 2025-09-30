"use client"

import { useAuthClient } from "@/hooks/useAuthClient"
import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis
} from "recharts"

function GaugeCard({ label, used, limit }) {
  const percent = (used / limit) * 100
  const color = percent > 90 ? "#FF0000" : percent > 60 ? "#FFCC00" : "#00FF00"

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
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background clockWise dataKey="value" />
        </RadialBarChart>

        <div className="absolute text-center">
          <p className="text-2xl font-bold" style={{ color }}>
            {Math.round(percent)}%
          </p>
          <p className="text-sm text-gray-300">
            {used} / {limit}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function QuotaPage() {
  const { clientId, session, loading } = useAuthClient()
  const [stats, setStats] = useState({ total: 0, incoming: 0, outgoing: 0, users: 0 })

  // Limits (could be fetched from another table if dynamic per client)
  const totalLimit = 5000
  const incomingLimit = 2000
  const outgoingLimit = 3000
  const userLimit = 200

  // 📅 Calculate first and last day of month
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString()

  useEffect(() => {
    if (!clientId) return

    async function fetchStats() {
      // Total messages
      const { count: total } = await supabase
        .from("chat_logs")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .gte("created_at", firstDay)
        .lte("created_at", lastDay)

      // Incoming messages
      const { count: incoming } = await supabase
        .from("chat_logs")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("sender", "user")
        .gte("created_at", firstDay)
        .lte("created_at", lastDay)

      // Outgoing messages
      const { count: outgoing } = await supabase
        .from("chat_logs")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("sender", "bot")
        .gte("created_at", firstDay)
        .lte("created_at", lastDay)

      // Unique users
      const { data: userRows, error } = await supabase
        .from("chat_logs")
        .select("phone_number")
        .eq("client_id", clientId)
        .gte("created_at", firstDay)
        .lte("created_at", lastDay)

      const uniqueUsers = userRows ? new Set(userRows.map(r => r.phone_number)).size : 0

      setStats({ total: total ?? 0, incoming: incoming ?? 0, outgoing: outgoing ?? 0, users: uniqueUsers })
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

  // 📅 Reset date (last day of current month)
  const resetDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  })

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">Quota Usage</h1>

      <p className="text-sm text-gray-400 mb-4">
        Logged in as: <span className="text-green-400">{session?.user?.email}</span>
      </p>

      <GaugeCard label="Total Messages" used={stats.total} limit={totalLimit} />
      <p className="text-sm text-gray-400 text-center mt-2">Resets on: {resetDate}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <GaugeCard label="Incoming" used={stats.incoming} limit={incomingLimit} />
        <GaugeCard label="Outgoing" used={stats.outgoing} limit={outgoingLimit} />
        <GaugeCard label="Unique Users" used={stats.users} limit={userLimit} />
      </div>
    </div>
  )
}
