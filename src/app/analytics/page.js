"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function AnalyticsPage() {
  const [clientId, setClientId] = useState(null);
  const [totalMessages, setTotalMessages] = useState(0);
  const [uniqueUsers, setUniqueUsers] = useState(0);
  const [messagesBySender, setMessagesBySender] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [chartData, setChartData] = useState([]);
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0–11
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [trackingUsage, setTrackingUsage] = useState(0);




  // ✅ Auth check + client lookup
  useEffect(() => {
    async function checkAuthAndFetch() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login"; // redirect if not logged in
        return;
      }

      // Find client_id linked to auth_id
      const { data: client, error } = await supabase
        .from("clients")
        .select("id")
        .eq("auth_id", session.user.id)
        .single();

      if (error || !client) {
        console.error("Error finding client:", error);
        window.location.href = "/login"; // safety redirect
        return;
      }

      setClientId(client.id);
    }

    checkAuthAndFetch();
  }, []);

  // ✅ Fetch analytics once we have clientId
  useEffect(() => {
    if (!clientId) return;

    async function fetchAnalytics() {
      setLoading(true);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Total messages this month
      const { count: total } = await supabase
        .from("chat_logs")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .gte("created_at", startOfMonth.toISOString());
      setTotalMessages(total || 0);

      // Unique users this month
      const { data: users } = await supabase
        .from("chat_logs")
        .select("end_user_id")
        .eq("client_id", clientId)
        .gte("created_at", startOfMonth.toISOString());
      setUniqueUsers(users ? new Set(users.map((u) => u.end_user_id)).size : 0);

      // Messages grouped by sender
      const { data: grouped } = await supabase
        .from("chat_logs")
        .select("sender")
        .eq("client_id", clientId)
        .gte("created_at", startOfMonth.toISOString());
      const counts = grouped?.reduce((acc, row) => {
        acc[row.sender] = (acc[row.sender] || 0) + 1;
        return acc;
      }, {}) || {};
      setMessagesBySender(counts);

      // Tracking usage this month
      const { count: tracking } = await supabase
        .from("feature_usage")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("feature", "tracking")
        .gte("created_at", startOfMonth.toISOString());

      setTrackingUsage(tracking || 0);


      setLoading(false);
    }

    fetchAnalytics();
  }, [clientId]);

  // Fetch chart data when KPI is clicked
  useEffect(() => {
    if (!selectedKpi || !clientId) return;

    async function fetchChartData(kpi) {
      // use selectedMonth and selectedYear
      const startOfMonth = new Date(selectedYear, selectedMonth, 1);
      const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

      let selectFields = "";

      if (kpi === "messagesBySender") {
      selectFields = "sender, created_at";
    } else if (kpi === "total") {
      selectFields = "created_at";
    } else if (kpi === "unique") {
      selectFields = "end_user_id, created_at";
    }

    const { data, error } = await supabase
       .from("chat_logs")
       .select(selectFields)
       .eq("client_id", clientId)
       .gte("created_at", startOfMonth.toISOString())
       .lte("created_at", endOfMonth.toISOString())
       .order("created_at", { ascending: true });


      if (error) {
        console.error("Error fetching chart data:", error);
        setChartData([]);
        return;
      }

      const daily = {};

      if (kpi === "messagesBySender") {
        // group by sender
        data.forEach((row) => {
          const day = new Date(row.created_at).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
          });
          if (!daily[day]) daily[day] = { day, user: 0, bot: 0 };
          daily[day][row.sender] += 1;
        });

        // cumulative
        let cumUser = 0;
        let cumBot = 0;
        let formatted = Object.values(daily).map((d) => {
          cumUser += d.user;
          cumBot += d.bot;
          return { day: d.day, user: cumUser, bot: cumBot };
        });

        if (formatted.length === 0) formatted = [{ day: "No Data", user: 0, bot: 0 }];
        setChartData(formatted);

      } else if (kpi === "total") {
        // group all messages together
        data.forEach((row) => {
          const day = new Date(row.created_at).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
          });
          if (!daily[day]) daily[day] = { day, total: 0 };
          daily[day].total += 1;
        });

        let cumTotal = 0;
        let formatted = Object.values(daily).map((d) => {
          cumTotal += d.total;
          return { day: d.day, total: cumTotal };
        });

        if (formatted.length === 0) formatted = [{ day: "No Data", total: 0 }];
        setChartData(formatted);

      } else if (kpi === "unique") {
        // track first time users appear
        const seenUsers = new Set();
        data.forEach((row) => {
          const day = new Date(row.created_at).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
          });
          if (!daily[day]) daily[day] = { day, unique: 0 };

          if (!seenUsers.has(row.end_user_id)) {
            seenUsers.add(row.end_user_id);
            daily[day].unique += 1;
          }
        });

        let cumUnique = 0;
        let formatted = Object.values(daily).map((d) => {
          cumUnique += d.unique;
          return { day: d.day, unique: cumUnique };
        });

        if (formatted.length === 0) formatted = [{ day: "No Data", unique: 0 }];
        setChartData(formatted);
      }


      else if (kpi === "tracking") {
        const { data, error } = await supabase
          .from("feature_usage")
          .select("created_at")
          .eq("client_id", clientId)
          .eq("feature", "tracking")
          .gte("created_at", startOfMonth.toISOString())
          .lte("created_at", endOfMonth.toISOString())
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error fetching tracking data:", error);
          setChartData([]);
          return;
        }

        const daily = {};
        data.forEach((row) => {
          const day = new Date(row.created_at).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
          });
          if (!daily[day]) daily[day] = { day, tracking: 0 };
          daily[day].tracking += 1;
        });

        let cumTracking = 0;
        let formatted = Object.values(daily).map((d) => {
          cumTracking += d.tracking;
          return { day: d.day, tracking: cumTracking };
        });

        if (formatted.length === 0) formatted = [{ day: "No Data", tracking: 0 }];
        setChartData(formatted);
      }

    }


    fetchChartData(selectedKpi);
  }, [selectedKpi, clientId, selectedMonth, selectedYear]);

  // Set the bubbles for display
  if (loading) {
    return <div className="p-6 text-white">Loading analytics...</div>;
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">📊 Analytics</h1>

      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-6">
        <div
          className="bg-gray-800 p-4 rounded-xl shadow cursor-pointer hover:bg-gray-700"
          onClick={() => setSelectedKpi("total")}
        >
          <p className="text-sm text-gray-400">Total Messages This Month</p>
          <p className="text-3xl font-bold">{totalMessages}</p>
        </div>

        <div
          className="bg-gray-800 p-4 rounded-xl shadow cursor-pointer hover:bg-gray-700"
          onClick={() => setSelectedKpi("unique")}
        >
          <p className="text-sm text-gray-400">Unique Users This Month</p>
          <p className="text-3xl font-bold">{uniqueUsers}</p>
        </div>

        <div
          className="bg-gray-800 p-4 rounded-xl shadow cursor-pointer hover:bg-gray-700"
          onClick={() => setSelectedKpi("messagesBySender")}
        >
          <p className="text-sm text-gray-400 mb-4">Messages by Sender This Month</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-300">User</p>
              <p className="text-2xl font-bold text-blue-400">
                {messagesBySender.user || 0}
              </p>
            </div>

            <div className="bg-gray-700 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-300">Bot</p>
              <p className="text-2xl font-bold text-green-400">
                {messagesBySender.bot || 0}
              </p>
            </div>
          </div>
        </div>

        <div
          className="bg-gray-800 p-4 rounded-xl shadow cursor-pointer hover:bg-gray-700"
          onClick={() => setSelectedKpi("tracking")}
        >
          <p className="text-sm text-gray-400">Tracking Usage This Month</p>            <p className="text-3xl font-bold text-purple-400">{trackingUsage}</p>
        </div>  
      </div>

      {/* Chart Section */}
      {selectedKpi  && (
        <div className="bg-gray-900 p-6 rounded-xl shadow mt-8">
          {/* Dynamic title */}
          <h2 className="text-lg font-semibold mb-4">
            {selectedKpi === "messagesBySender" && "📈 Messages Over Time"}
            {selectedKpi === "total" && "📈 Total Messages Over Time"}
            {selectedKpi === "unique" && "📈 Unique Users Over Time"}
            {selectedKpi === "tracking" && "📈 Tracking Usage Over Time"}

          </h2>

          {/* Month/Year Picker */}
          <div className="flex gap-4 mb-6">
            {/* Month dropdown */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-gray-800 text-white p-2 rounded"
            >
              {[
                "January","February","March","April","May","June",
                "July","August","September","October","November","December"
              ].map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>

            {/* Year dropdown */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-gray-800 text-white p-2 rounded"
            >
              {Array.from({ length: 5 }, (_, i) => today.getFullYear() - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Chart */}
          {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="day" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip />
              <Legend />

              {selectedKpi === "messagesBySender" && (
                <>
                  <Line type="monotone" dataKey="user" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="bot" stroke="#22c55e" strokeWidth={2} />
                </>
              )}

              {selectedKpi === "total" && (
                <Line type="monotone" dataKey="total" stroke="#facc15" strokeWidth={2} />
              )}

              {selectedKpi === "unique" && (
                <Line type="monotone" dataKey="unique" stroke="#ec4899" strokeWidth={2} />
              )}

              {selectedKpi === "tracking" && (
                <Line type="monotone" dataKey="tracking" stroke="#a855f7" strokeWidth={2} />
              )}


            </LineChart>
          </ResponsiveContainer>
          ) : (
            <p className="text-gray-400">No data available for this month.</p>
          )}
        </div>
      )}
    </div>
  );
}



