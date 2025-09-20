'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Home() {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [clientId, setClientId] = useState(null)  // ✅ dynamic client id
  const chatContainerRef = useRef(null)

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
        .select('end_user_id')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (!error) {
        const uniqueUsers = [...new Set(data.map(u => u.end_user_id))]
        setUsers(uniqueUsers)
      } else {
        console.log("Supabase error:", error)
      }
    }

    fetchUsers()
  }, [clientId])

  // Fetch messages when a user is clicked
  const fetchMessages = async (userId) => {
    setSelectedUser(userId)

    const { data, error } = await supabase
      .from('chat_logs')
      .select('message, sender, created_at')
      .eq('client_id', clientId)
      .eq('end_user_id', userId)
      .order('created_at', { ascending: true })

    if (!error) {
      setMessages(data)
    } else {
      console.error(error)
    }
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error logging out:', error.message)
    } else{
      window.location.href = '/login'
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* ✅ Logout button */}
      <button
        onClick={handleLogout}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: '#e53e3e',
          color: 'white',
          padding: '8px 16px',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        Logout
      </button>

      {/* Sidebar */}
      <aside style={{ width: '450px', background: '#215f9aff', padding: '10px', color: 'white' }}>
        <h2 style={{ padding: '15px', borderBottom: '1px solid #1e293b' }}>
        Users</h2>
        <div
          style={{
            flex: 1,
            overflowY: 'auto', //makes sidebar scrollable
            padding: '10px'
          }}
        >
        <ul>
          {users.map((user, i) => (
            <li
              key={i}
              style={{
                padding: '8px',
                borderBottom: '1px solid #ccc',
                cursor: 'pointer',
                background: selectedUser === user ? '#154a7d' : 'transparent'
              }}
              onClick={() => fetchMessages(user)}
            >
              {user}
            </li>
          ))}
        </ul>
        </div>
      </aside>

      
      {/* Main Chat Window */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a', color: 'white' }}>
        <h1 style={{ padding: '20px', borderBottom: '1px solid #1e293b' }}>
        {selectedUser ? `Conversation with ${selectedUser}` : 'Chat Window'}
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
