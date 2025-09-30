"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabaseClient" // adjust path if needed

export function useAuthClient() {
  const [clientId, setClientId] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuthAndFetch() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = "/login"
        return
      }

      setSession(session)

      // Find client_id linked to auth_id
      const { data: client, error } = await supabase
        .from("clients")
        .select("id")
        .eq("auth_id", session.user.id)
        .single()

      if (error || !client) {
        console.error("Error finding client:", error)
        window.location.href = "/login"
        return
      }

      setClientId(client.id)
      setLoading(false)
    }

    checkAuthAndFetch()
  }, [])

  return { clientId, session, loading }
}
