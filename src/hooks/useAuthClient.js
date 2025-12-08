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

      setLoading(false)
    }

    checkAuthAndFetch()
  }, [])

  return { clientId, session, loading }
}
