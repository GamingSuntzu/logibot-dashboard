"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { FiChevronRight, FiBarChart, FiBarChart2 } from "react-icons/fi";
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
  const [availableFeatures, setAvailableFeatures] = useState([]);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [featureUsageCount, setFeatureUsageCount] = useState(0);



  // ✅ Auth check + client lookup
  useEffect(() => {
    async function checkAuthAndFetch() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login"; // redirect if not logged in
        return;
      }

      // Find client_id via new client_users table
      const { data: mapping, error: mappingError } = await supabase
        .from("client_users")
        .select("client_id, role")
        .eq("auth_id", session.user.id)
        .single();

      if (mappingError || !mapping) {
        console.error("User not linked to any client:", mappingError);
        window.location.href = "/login";
        return;
      }

      setClientId(mapping.client_id);

    }

    checkAuthAndFetch();
  }, []);

  // ✅ Fetch analytics once we have clientId
  useEffect(() => {
    if (!clientId) return;

    async function fetchAnalytics() {
      setLoading(true);

      const startOfMonth = new Date(selectedYear, selectedMonth, 1);
      const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

      // Total messages
      const { count: total, error: totalErr } = await supabase
        .from("chat_logs")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .gte("created_at", startOfMonth.toISOString())
        .lte("created_at", endOfMonth.toISOString());

      if (totalErr) console.error("Total messages error:", totalErr);
      setTotalMessages(total || 0);

      // Unique users
      const { data: users, error: usersErr } = await supabase
        .from("chat_logs")
        .select("end_user_id")
        .eq("client_id", clientId)
        .gte("created_at", startOfMonth.toISOString())
        .lte("created_at", endOfMonth.toISOString());

      if (usersErr) console.error("Unique users error:", usersErr);
      setUniqueUsers(users ? new Set(users.map((u) => u.end_user_id)).size : 0);

      // Messages grouped by sender
      const { data: grouped, error: groupedErr } = await supabase
        .from("chat_logs")
        .select("sender")
        .eq("client_id", clientId)
        .gte("created_at", startOfMonth.toISOString())
        .lte("created_at", endOfMonth.toISOString());

      if (groupedErr) console.error("Grouped sender error:", groupedErr);

      const counts =
        grouped?.reduce((acc, row) => {
          acc[row.sender] = (acc[row.sender] || 0) + 1;
          return acc;
        }, {}) || {};

      setMessagesBySender(counts);

      // Get available features for this month (DECEMBER UPDATE)
      const { data: featureRows, error: featureRowsErr } = await supabase
        .from("feature_usage")
        .select("feature")
        .eq("client_id", clientId)
        .gte("created_at", startOfMonth.toISOString())
        .lte("created_at", endOfMonth.toISOString());

      if (featureRowsErr) console.error("Feature list error:", featureRowsErr);

      const uniqueFeatures = Array.from(
        new Set((featureRows || []).map((r) => r.feature).filter(Boolean))
      ).sort();

      setAvailableFeatures(uniqueFeatures);

      // Pick default feature if none selected or selected feature not in list (DEC UPDATE)
      const nextSelected =
        selectedFeature && uniqueFeatures.includes(selectedFeature)
          ? selectedFeature
          : uniqueFeatures[0] || null;

      setSelectedFeature(nextSelected);

      // 3) Count usage for selected feature
      if (nextSelected) {
        const { count, error } = await supabase
          .from("feature_usage")
          .select("id", { count: "exact", head: true })
          .eq("client_id", clientId)
          .eq("feature", nextSelected)
          .gte("created_at", startOfMonth.toISOString())
          .lte("created_at", endOfMonth.toISOString());

        if (error) console.error("Feature usage count error:", error);
        setFeatureUsageCount(count || 0);
      } else {
        setFeatureUsageCount(0);
      }

      setLoading(false);
    }

    fetchAnalytics();
  }, [clientId, selectedMonth, selectedYear]);

  useEffect(() => {
  if (!clientId || !selectedFeature) return;

  async function fetchSelectedFeatureCount() {
    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

    const { count, error } = await supabase
      .from("feature_usage")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("feature", selectedFeature)
      .gte("created_at", startOfMonth.toISOString())
      .lte("created_at", endOfMonth.toISOString());

    if (error) console.error("Feature usage count error:", error);
    setFeatureUsageCount(count || 0);
  }

  fetchSelectedFeatureCount();
}, [clientId, selectedFeature, selectedMonth, selectedYear]);



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

    else if (kpi === "featureUsage") {
      if (!selectedFeature) {
        setChartData([{ day: "No Data", usage: 0 }]);
        return;
      }

      const { data, error } = await supabase
        .from("feature_usage")
        .select("created_at")
        .eq("client_id", clientId)
        .eq("feature", selectedFeature)
        .gte("created_at", startOfMonth.toISOString())
        .lte("created_at", endOfMonth.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching feature usage data:", error);
        setChartData([]);
        return;
      }

      const daily = {};
      data.forEach((row) => {
        const day = new Date(row.created_at).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
        });
        if (!daily[day]) daily[day] = { day, usage: 0 };
        daily[day].usage += 1;
      });

      let cum = 0;
      let formatted = Object.values(daily).map((d) => {
        cum += d.usage;
        return { day: d.day, usage: cum };
      });

      if (formatted.length === 0) formatted = [{ day: "No Data", usage: 0 }];
      setChartData(formatted);
      return;
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


      

    }


    fetchChartData(selectedKpi);
  }, [selectedKpi, clientId, selectedMonth, selectedYear, selectedFeature]);

  // Set the bubbles for display
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-400"></div>
      </div>
    )
  }
  
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  return (
    <div className="p-6 text-white">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">📊 Analytics</h1>

        <div className="flex gap-3 md:justify-end">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-gray-800 text-white p-2 rounded"
          >
            {months.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>

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
      </div>

      {/* KPI Grid, Desktop Layout*/}
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        
        {/* Total Messages */}
        <div
          className="bg-gray-800 p-4 rounded-xl shadow cursor-pointer hover:bg-gray-700"
          onClick={() => setSelectedKpi("total")}
        >
          <p className="text-sm text-gray-400">Total Messages This Month</p>
          <p className="text-3xl font-bold">{totalMessages}</p>
        </div>
        {/* Unique Users */}
        <div
          className="bg-gray-800 p-4 rounded-xl shadow cursor-pointer hover:bg-gray-700"
          onClick={() => setSelectedKpi("unique")}
        >
          <p className="text-sm text-gray-400">Unique Users This Month</p>
          <p className="text-3xl font-bold">{uniqueUsers}</p>
        </div>
        {/* Messages by Sender */}
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
        {/* Tracking Usage */}
        <div
        className="bg-gray-800 p-4 rounded-xl shadow cursor-pointer hover:bg-gray-700"
          onClick={() => setSelectedKpi("featureUsage")}
        >
          <p className="text-sm text-gray-400">Feature Usage This Month</p>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-3xl font-bold text-purple-400">{featureUsageCount}</p>

            <select
              value={selectedFeature || ""}
              onChange={(e) => setSelectedFeature(e.target.value)}
              className="bg-gray-700 text-white p-2 rounded text-sm"
              disabled={availableFeatures.length === 0}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()} // prevents opening chart when trying to open dropdown
            >
              {availableFeatures.length === 0 ? (
                  <option value="">No features</option>
              ) : (
                availableFeatures.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedFeature && (
            <p className="text-xs text-gray-400 mt-2">
              Selected: <span className="text-gray-200">{selectedFeature}</span>
            </p>
          )}
        </div> 
      </div>

      {/* Desktop Chart Section */}
      {selectedKpi  && (
        <div className="hidden md:block bg-gray-900 p-6 rounded-xl shadow mt-8">
          {/* Dynamic title */}
          <h2 className="text-lg font-semibold mb-4">
            {selectedKpi === "messagesBySender" && "📈 Messages Over Time"}
            {selectedKpi === "total" && "📈 Total Messages Over Time"}
            {selectedKpi === "unique" && "📈 Unique Users Over Time"}
            {selectedKpi === "featureUsage" && `📈 ${selectedFeature || "Feature"} Usage Over Time`}

          </h2>

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

              {selectedKpi === "featureUsage" && (
                <Line type="monotone" dataKey="usage" stroke="#a855f7" strokeWidth={2} />
              )}


            </LineChart>
          </ResponsiveContainer>
          ) : (
            <p className="text-gray-400">No data available for this month.</p>
          )}
        </div>
      )}

      {/* --- MOBILE LAYOUT (clean KPIs + top chart) --- */}
      <div className="block md:hidden space-y-4">
        {/* Chart at top — only visible when KPI selected */}
        {selectedKpi && (
          <div className="bg-gray-900 p-4 rounded-xl shadow">
            <h2 className="text-base font-semibold mb-3">
              {selectedKpi === "messagesBySender" && "📈 Messages Over Time"}
              {selectedKpi === "total" && "📈 Total Messages Over Time"}
              {selectedKpi === "unique" && "📈 Unique Users Over Time"}
              {selectedKpi === "featureUsage" && `📈 ${selectedFeature || "Feature"} Usage Over Time`}
            </h2>

        
            {/* Chart with transition */}
            <div
              className={`transition-all duration-500 overflow-hidden ${
                selectedKpi ? "opacity-100 max-h-[500px]" : "opacity-0 max-h-0"
              }`}
            >
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
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
                  {selectedKpi === "featureUsage" && (
                    <Line type="monotone" dataKey="usage" stroke="#a855f7" strokeWidth={2} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm">No data available for this month.</p>
            )}
          </div>
          </div>
        )}

        {/* KPI Cards */}
        <div
          onClick={() => setSelectedKpi(selectedKpi === "total" ? null : "total")}
          className={`p-4 rounded-xl shadow cursor-pointer transition-all duration-300 
            ${
              selectedKpi === "total"
              ? "bg-gray-700 ring-2 ring-yellow-400 shadow-yellow-400/20 scale-[1.02]"
              : "bg-gray-800 hover:bg-gray-700 hover:scale-[1.01]"
            }`}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400">Total Messages</p>
              <p className="text-3xl font-bold">{totalMessages}</p>
            </div>
            {selectedKpi === "total" ? (
              <FiBarChart2 className="text-yellow-400 text-xl" />
            ) : (
              <FiChevronRight className="text-gray-400 text-xl" />
            )}
          </div>
        </div>

        <div
          onClick={() => setSelectedKpi(selectedKpi === "unique" ? null : "unique")}
          className={`p-4 rounded-xl shadow cursor-pointer transition-all duration-300 
            ${
              selectedKpi === "unique"
              ? "bg-gray-700 ring-2 ring-pink-400 shadow-pink-400/20 scale-[1.02]"
              : "bg-gray-800 hover:bg-gray-700 hover:scale-[1.01]"
            }`}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400">Unique Users</p>
              <p className="text-3xl font-bold">{uniqueUsers}</p>
            </div>
            {selectedKpi === "unique" ? (
              <FiBarChart2 className="text-pink-400 text-xl" />
            ) : (
              <FiChevronRight className="text-gray-400 text-xl" />
            )}
          </div>
        </div>

        <div
          onClick={() =>
            setSelectedKpi(selectedKpi === "messagesBySender" ? null : "messagesBySender")
          }
          className={`p-4 rounded-xl shadow cursor-pointer transition-all duration-300 
            ${
              selectedKpi === "messagesBySender"
              ? "bg-gray-700 ring-2 ring-blue-400 shadow-blue-400/20 scale-[1.02]"
              : "bg-gray-800 hover:bg-gray-700 hover:scale-[1.01]"
            }`}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400">Messages by Sender</p>
              <div className="flex gap-4 mt-2">
                <div className="text-center">
                  <p className="text-sm text-gray-300">User</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {messagesBySender.user || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-300">Bot</p>
                  <p className="text-2xl font-bold text-green-400">
                    {messagesBySender.bot || 0}
                  </p>
                </div>
              </div>
            </div>
            {selectedKpi === "messagesBySender" ? (
              <FiBarChart2 className="text-blue-400 text-xl" />
            ) : (
              <FiChevronRight className="text-gray-400 text-xl" />
            )}
          </div>
        </div>

        <div
          onClick={() => setSelectedKpi(selectedKpi === "featureUsage" ? null : "featureUsage")}
          className={`p-4 rounded-xl shadow cursor-pointer transition-all duration-300 
            ${
              selectedKpi === "featureUsage"
              ? "bg-gray-700 ring-2 ring-purple-400 shadow-purple-400/20 scale-[1.02]"
              : "bg-gray-800 hover:bg-gray-700 hover:scale-[1.01]"
            }`}
        >
          

          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400">Feature Usage</p>
              <p className="text-3xl font-bold text-purple-400">{featureUsageCount}</p>
            </div>
            {selectedKpi === "featureUsage" ? (
              <FiBarChart2 className="text-purple-400 text-xl" />
            ) : (
              <FiChevronRight className="text-gray-400 text-xl" />
            )}
          </div>

          <select
            value={selectedFeature || ""}
            onChange={(e) => setSelectedFeature(e.target.value)}
            className="bg-gray-700 text-white p-2 rounded text-sm mt-2 w-full"
            disabled={availableFeatures.length === 0}
            onClick={(e) => e.stopPropagation()}
          >
            {availableFeatures.length === 0 ? (
              <option value="">No features</option>
            ) : (
              availableFeatures.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))
            )}
          </select>
        </div>
      </div>

    </div>
  );
}
