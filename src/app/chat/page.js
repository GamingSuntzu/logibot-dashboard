'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { FiSearch } from "react-icons/fi"; // feather search icon


export default function Home() {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [clientId, setClientId] = useState(null)  // ✅ dynamic client id
  const chatContainerRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState("");
  

  // client-side auth check
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = "/login" // redirect if not logged in
        return
      }

      // Lookp clientId using auth_id
      const { data: client, error } = await supabase
        .from('clients')
        .select('id')
        .eq('auth_id', session.user.id)
        .single()
      
      if (error) {
        console.error("Error finding client:", error)
      } else {
        setClientId(client.id)  // save client id in state
      }
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

  // Auto-scroll when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])


  // Fetch unique users
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('chat_logs')
        .select('end_user_id, phone_number')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (!error) {
        const uniqueUsers = Array.from(
          new Map(
            data.map(u => {
              // use phone_number if available, otherwise fall back to end_user_id
              const id = u.phone_number || u.end_user_id
              return [id, { id, phone_number: u.phone_number, end_user_id: u.end_user_id }]
            })
          ).values()
        )
                
        setUsers(uniqueUsers)
      } else {
        console.log("Supabase error:", error)
      }
    }

    fetchUsers()
  }, [clientId])

  // Fetch messages when a user is clicked
  const fetchMessages = async (user) => {
  // Save the user's id (phone_number or end_user_id) in state
  setSelectedUser(user.id)

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
  }

  
  return (
    <div style={{ display: 'flex', height: '100vh' }}>

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
        <h2 style={{ padding: '15px', borderBottom: '1px solid #1e293b' }}>
        Users</h2>

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
          {users
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
                background: selectedUser === user.id ? '#154a7d' : 'transparent'
              }}
              onClick={() => fetchMessages(user)} // // pass full object
            >
              {user.phone_number || user.end_user_id}
            </li>
          ))}
        </ul>
        </div>
      </aside>

      
      {/* Main Chat Window */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a', color: 'white' }}>
        <h1 style={{ padding: '20px', borderBottom: '1px solid #1e293b' }}>
        {selectedUser
          ? `Conversation with ${users.find(u => u.id === selectedUser)?.phone_number || selectedUser}`
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
            <small style={{ fontSize: '11px', opacity: 0.7}}>
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


    </div>
  )
}
