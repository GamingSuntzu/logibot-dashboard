'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Home() {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages, setMessages] = useState([])
  const chatContainerRef = useRef(null)

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
        .eq('client_id', '1ee8fd80-5a36-4f01-8efe-ca0fa76f18ed')
        .order('created_at', { ascending: false })

      if (!error) {
        const uniqueUsers = [...new Set(data.map(u => u.end_user_id))]
        setUsers(uniqueUsers)
      } else {
        console.error(error)
      }
    }

    fetchUsers()
  }, [])

  // Fetch messages when a user is clicked
  const fetchMessages = async (userId) => {
    setSelectedUser(userId)

    const { data, error } = await supabase
      .from('chat_logs')
      .select('message, sender, created_at')
      .eq('client_id', '1ee8fd80-5a36-4f01-8efe-ca0fa76f18ed')
      .eq('end_user_id', userId)
      .order('created_at', { ascending: true })

    if (!error) {
      setMessages(data)
    } else {
      console.error(error)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: '450px', background: '#2068afff', padding: '10px', color: 'white' }}>
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
                background: selectedUser === user ? '#1d4ed8' : 'transparent'
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
            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            background: msg.sender === 'user' ? '#2563eb' : '#334155',
            color: 'white',
            padding: '10px 15px',
            borderRadius: '12px',
            maxWidth: '70%',
            wordBreak: 'break-word'
          }}
        >
          <p style={{ margin: 0 }}>{msg.message}</p>
          <small style={{ fontSize: '10px', opacity: 0.7, display: 'block', marginTop: '5px' }}>
            {new Date(msg.created_at).toLocaleString()}
          </small>
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
