'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { FiSearch, FiFlag, FiArrowLeft } from "react-icons/fi"; // feather search icon
import { FaExclamationCircle, FaWhatsapp, FaInstagram, FaFacebookMessenger } from "react-icons/fa";
import { IoGlobeOutline } from "react-icons/io5"; // fallback for web/unknown

export default function Home() {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [clientId, setClientId] = useState(null)  // ✅ dynamic client id
  const chatContainerRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState("")
  const messageChannelRef = useRef(null)
  const [maskIdentifiers, setMaskIdentifiers] = useState(true)

  // ✅ detect mobile
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])


  // client-side auth check
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = "/login" // redirect if not logged in
        return
      }

      // Look up client via client_users
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

      // Save client id in state
      setClientId(mapping.client_id);

    }
    checkAuth()
  }, [])

  // Format timestamp to Jakarta
  function formatTimestamp(utcString) {
    const date = new Date(utcString);

    // Force to Asia/Jakarta timezone
    return date.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function ChannelIcon({ channel }) {
    switch (channel) {
      case "whatsapp":
        return (
          <span title="WhatsApp">
            <FaWhatsapp color="#25D366" style={{ marginLeft: "6px" }} />
          </span>
        );
      case "messenger":
        return (
          <span title="Messenger">
            <FaFacebookMessenger color="#0084FF" style={{ marginLeft: "6px" }} />
          </span>
        );
      case "instagram":
        return (
          <span title="Instagram">
            <FaInstagram color="#E1306C" style={{ marginLeft: "6px" }} />
          </span>
        );
      case "web":
        return (
          <span title="Web Chat">
            <IoGlobeOutline color="#aaa" style={{ marginLeft: "6px" }} />
          </span>
        );
      default:
        return (
          <span title="Unknown">
            <IoGlobeOutline color="#aaa" style={{ marginLeft: "6px" }} />
          </span>
        );
    }
  }

  function maskPhoneNumber(phone) {
    if (!phone) return phone
    const clean = String(phone)
    if (clean.length <= 8) return clean
    const start = clean.slice(0, 5)
    const end = clean.slice(-3)
    return `${start}***${end}`
  }

  function maskUserId(userId) {
    if (!userId) return userId
    const id = String(userId)
    if (id.length <= 12) return id
    const start = id.startsWith("user_") ? id.slice(0, 8) : id.slice(0, 6)
    const end = id.slice(-3)
    return `${start}***${end}`
  }

  function displayIdentifier(user) {
    if (!user) return ""
    const value = user.phone_number || user.end_user_id
    if (!maskIdentifiers) return value
    return user.phone_number ? maskPhoneNumber(value) : maskUserId(value)
  }

  // Auto-scroll when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])


  // Fetch unique users and realtime update hook
  useEffect(() => {
    if (!clientId) return;

    // 1. Fetch users initially
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('chat_logs')
        .select('end_user_id, phone_number, client_id, user_map (is_flagged, is_priority, channel)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (!error) {
        const uniqueUsers = Array.from(
          new Map(
            data.map(u => {
              // use phone_number if available, otherwise fall back to end_user_id
              const id = u.phone_number || u.end_user_id
              return [id, { id, phone_number: u.phone_number, end_user_id: u.end_user_id, client_id: u.client_id, channel: u.user_map?.channel || "unknown", is_flagged: u.user_map?.is_flagged || false, is_priority: u.user_map?.is_priority || false }]
            })
          ).values()
        );

        // ✅ sort: priority > flagged > normal
        const sortedUsers = [...users].sort((a, b) => {
          if (a.is_priority && !b.is_priority) return -1;
          if (!a.is_priority && b.is_priority) return 1;

          if (a.is_flagged && !b.is_flagged) return -1;
          if (!a.is_flagged && b.is_flagged) return 1;

          // fallback: newest message first
          return new Date(b.created_at) - new Date(a.created_at);
        });

        setUsers(uniqueUsers)
      } else {
        console.log("Supabase error:", error)
      }
    }

    fetchUsers()

    // 2. Subscribe to realtime inserts
    const channel = supabase
      .channel(`chat_logs_${clientId}_${Date.now()}`) // unique channel name
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_logs', filter: `client_id=eq.${clientId}` },
        (payload) => {
          const newRow = payload.new
          const id = newRow.phone_number || newRow.end_user_id

          // 👉 Add new user to sidebar if missing
          setUsers(prev => {
            if (prev.some(u => u.id === id)) return prev
            return [{ id, phone_number: newRow.phone_number, end_user_id: newRow.end_user_id, client_id: newRow.client_id, is_flagged: false, is_priority: false }, ...prev]
          })
        }
      )
      .subscribe()

    // 🔹 3. Cleanup on unmount or clientId change
    return () => {
      supabase.removeChannel(channel)
    }
  }, [clientId, selectedUser])

  // Fetch messages when a user is clicked n refresh the subscription for the specific user
  const fetchMessages = async (user) => {
    // Save the user's id (phone_number or end_user_id) in state
    setSelectedUser(user.id)

    // Clean up previous subscription (if there is)
    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current)
      messageChannelRef.current = null
    }

    // 1. Fetch existing messages
    let query = supabase
      .from('chat_logs')
      .select('message, sender, created_at, phone_number, end_user_id')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })

    if (user.phone_number) {
      query = query.eq('phone_number', user.phone_number)
    } else {
      query = query.eq('end_user_id', user.end_user_id)
    }

    const { data, error } = await query

    if (!error) {
      setMessages(data)
    } else {
      console.error(error)
    }

    // 2. Subscribe to realtime inserts for this specific user
    const filter = user.phone_number
      ? `client_id=eq.${clientId} AND phone_number=eq.${user.phone_number}`
      : `client_id=eq.${clientId} AND end_user_id=eq.${user.end_user_id}`

    const channel = supabase
      .channel(`chat_logs_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_logs', filter },
        (payload) => {
          setMessages(prev => [...prev, payload.new])
        }
      )
      .subscribe()

    // Save the active channel to be able to clean it later
    messageChannelRef.current = channel
  }

  // Toggle user flag/priority
  const toggleFlag = async (user, type) => {
    let column = type === "flag" ? "is_flagged" : "is_priority";
    let newValue = !user[column];

    const { error } = await supabase
      .from("user_map")
      .update({ [column]: newValue })
      .eq("end_user_id", user.end_user_id)
      .eq("client_id", clientId); // ensure only the corresponding client's row is updated

    if (!error) {
      setUsers(prev =>
        prev.map(u =>
          u.end_user_id === user.end_user_id ? { ...u, [column]: newValue } : u
        )
      );
    } else {
      console.error("Error updating flag:", error);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden flex-col md:flex-row">
      {/* Desktop layout */}
      {!isMobile && (
        <>
          {/* Sidebar */}
          <aside
            style={{
              width: '450px',
              background: '#215f9aff',
              padding: '10px',
              color: 'white',
              display: 'flex',          // ✅ make sidebar a flex container
              flexDirection: 'column',  // ✅ vertical stacking
              height: '100vh',          // ✅ fix height so scroll works
            }}
          >
            <div
              style={{
                padding: '15px',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <h2 style={{ margin: 0 }}>Users</h2>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <input
                  type="checkbox"
                  checked={maskIdentifiers}
                  onChange={(e) => setMaskIdentifiers(e.target.checked)}
                />
                Hide IDs
              </label>
            </div>

            {/* 🔍 Search bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#1e293b", // dark bluish background
                borderRadius: "8px",
                padding: "6px 10px",
                margin: "10px",
                border: "1px solid #2c5282", // subtle blue border
              }}
            >
              <span style={{ color: "#9ca3af", marginRight: "8px" }}>
                <FiSearch style={{ color: "#9ca3af", marginRight: "8px" }} />
              </span>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "white",
                  fontSize: "14px",
                }}
              />
            </div>

            {/* Scrollable user list */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto', //makes sidebar scrollable
                padding: '10px'
              }}
              className="custom-scrollbar"  // 🎨 custom scrollbar styling
            >
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[...users]   // clone array before sorting
                  .sort((a, b) => {
                    if (a.is_priority && !b.is_priority) return -1;
                    if (!a.is_priority && b.is_priority) return 1;

                    if (a.is_flagged && !b.is_flagged) return -1;
                    if (!a.is_flagged && b.is_flagged) return 1;

                    return new Date(b.created_at) - new Date(a.created_at);
                  })

                  .filter(
                    (user) =>
                      (user.phone_number || user.end_user_id)
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
                  )
                  .map((user, i) => (
                    <li
                      key={i}
                      style={{
                        padding: '8px',
                        borderBottom: '1px solid #ccc',
                        cursor: 'pointer',
                        background: selectedUser === user.id ? '#154a7d' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                      onClick={() => fetchMessages(user)} // // pass full object
                    >
                      {/* Left side: user identifier */}
                      <span style={{ display: "flex", alignItems: "center" }}>
                        {displayIdentifier(user)}
                        <ChannelIcon channel={user.channel} />
                      </span>

                      {/* Right side: Flag toggles */}
                      <span style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                        <FiFlag
                          color={user.is_flagged ? "yellow" : "#4b5563"}
                          onClick={() => toggleFlag(user, "flag")}
                          style={{ cursor: "pointer" }}
                          title={user.is_flagged ? "Unflag User" : "Flag User"}
                        />
                        <FaExclamationCircle
                          color={user.is_priority ? "red" : "#4b5563"}
                          onClick={() => toggleFlag(user, "priority")}
                          style={{ cursor: "pointer" }}
                          title={user.is_priority ? "Remove Priority" : "Mark as Priority"}
                        />
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </aside>


          {/* Main Chat Window */}
          <main className="flex-1 bg-[#0f172a] text-white flex flex-col min-h-0">
            <h1 style={{ padding: '20px', borderBottom: '1px solid #1e293b' }}>
              {selectedUser
                ? `Conversation with ${displayIdentifier(users.find(u => u.id === selectedUser)) || selectedUser}`
                : 'Chat Window'}
            </h1>

            <div
              ref={chatContainerRef} // attach ref here
              style={{
                flex: 1,
                overflowY: 'auto', // ✅ makes it scrollable
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {selectedUser ? (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        background: msg.sender === 'user' ? '#007bff' : '#e5e5ea',
                        color: msg.sender === "user" ? "white" : "black",
                        padding: '10px 14px',
                        borderRadius: '18px',
                        maxWidth: '60%',
                        wordBreak: 'break-word'
                      }}
                    >
                      <p style={{ margin: 0 }}>{msg.message}</p>
                      <small style={{ fontSize: '11px', opacity: 0.7 }}>
                        {formatTimestamp(msg.created_at)}
                      </small>
                    </div>
                  </div>
                ))
              ) : (
                <p>Select a user to view messages</p>
              )}
            </div>
          </main>
        </>
      )}

      {/* Mobile layout */}
      {isMobile && (
        <>
          {/* Show user list if no user selected */}
          {/* Mobile User List */}
          {!selectedUser && (
            <div className="flex-1 bg-[#215f9a] text-white flex flex-col min-h-0">
              {/* Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h2 className="m-0">Users</h2>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={maskIdentifiers}
                    onChange={(e) => setMaskIdentifiers(e.target.checked)}
                  />
                  Hide IDs
                </label>
              </div>

              {/* Search Bar */}
              <div className="flex items-center bg-slate-800 rounded-md px-3 py-2 m-3">
                <FiSearch className="text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent outline-none text-sm flex-1 text-white"
                />
              </div>

              {/* ✅ Scrollable user list only */}
              <div className="flex-1 overflow-y-auto">
                <ul>
                  {users
                    .filter(u => (u.phone_number || u.end_user_id).toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((user, i) => (
                      <li
                        key={i}
                        className="p-3 border-b border-gray-600 flex justify-between items-center"
                        onClick={() => fetchMessages(user)}
                      >
                        <span className="flex items-center min-w-0">
                          <span className="truncate overflow-hidden whitespace-nowrap max-w-[240px]">
                            {displayIdentifier(user)}
                          </span>
                          <ChannelIcon channel={user.channel} />
                        </span>

                        {/* Flag & priority icons */}
                        <span className="flex gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <FiFlag
                            size={16}
                            color={user.is_flagged ? "yellow" : "#9ca3af"}
                            onClick={() => toggleFlag(user, "flag")}
                          />
                          <FaExclamationCircle
                            size={16}
                            color={user.is_priority ? "red" : "#9ca3af"}
                            onClick={() => toggleFlag(user, "priority")}
                          />
                        </span>
                      </li>
                    ))}
                </ul>
                {/* Spacer for bottom nav bar, prevents ghost scroll */}
                <div className="h-20 shrink-0" />
              </div>
            </div>
          )}


          {/* Show chat if user selected */}
          {selectedUser && (
            <div className="flex-1 flex flex-col bg-slate-900 text-white min-h-0">
              {/* ✅ Fixed header */}
              <div className="flex items-center p-4 border-b border-slate-800">
                <button onClick={() => setSelectedUser(null)} className="mr-3">
                  <FiArrowLeft size={20} />
                </button>
                <h1 className="text-lg font-semibold truncate">
                  {displayIdentifier(users.find(u => u.id === selectedUser)) || selectedUser}
                </h1>
              </div>

              {/* ✅ Scrollable messages */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 flex flex-col gap-2"
              >
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`px-3 py-2 rounded-2xl max-w-[75%] ${msg.sender === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-black"
                        }`}
                    >
                      <p>{msg.message}</p>
                      <small className="text-xs opacity-70">
                        {formatTimestamp(msg.created_at)}
                      </small>
                    </div>
                  </div>
                ))}
                <div className="h-20 shrink-0" /> {/* Spacer */}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

