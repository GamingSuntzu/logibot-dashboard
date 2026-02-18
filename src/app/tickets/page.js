'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { FiSearch, FiFlag, FiCheckCircle, FiRefreshCcw, FiArrowRightCircle } from 'react-icons/fi'

export default function TicketsPage() {
  const router = useRouter()

  const [clientId, setClientId] = useState(null)
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)

  const [statusTab, setStatusTab] = useState('open') // open | in_progress | resolved
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const realtimeRef = useRef(null)

  // Format timestamp to Jakarta
  function formatTimestamp(utcString) {
    const date = new Date(utcString)
    return date.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  function statusChip(status) {
    const base =
      'inline-flex items-center px-2 py-1 text-xs rounded-full border'
    if (status === 'open') return `${base} border-blue-500/40 bg-blue-500/10 text-blue-300`
    if (status === 'in_progress') return `${base} border-yellow-500/40 bg-yellow-500/10 text-yellow-200`
    if (status === 'resolved') return `${base} border-green-500/40 bg-green-500/10 text-green-300`
    return `${base} border-slate-500/40 bg-slate-500/10 text-slate-200`
  }

  // 1) Auth + client lookup (same pattern as your chat page)
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/login'
        return
      }

      const { data: mapping, error: mappingError } = await supabase
        .from('client_users')
        .select('client_id, role')
        .eq('auth_id', session.user.id)
        .single()

      if (mappingError || !mapping) {
        console.error('User not linked to any client:', mappingError)
        window.location.href = '/login'
        return
      }

      setClientId(mapping.client_id)
    }

    checkAuth()
  }, [])

  const refreshTickets = async () => {
    if (!clientId) return

    let q = supabase
      .from('tickets')
      .select(`
        id,
        client_id,
        end_user_id,
        bp_conversation_id,
        channel,
        user_name,
        user_phone,
        category,
        description,
        status,
        is_flagged,
        created_at,
        updated_at
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    // status tab
    q = q.eq('status', statusTab)

    // flagged only
    if (flaggedOnly) q = q.eq('is_flagged', true)

    // search (OR across fields)
    const term = searchTerm.trim()
    if (term.length > 0) {
      const escaped = term.replace(/,/g, '') // keep OR string safe-ish
      q = q.or(
        `user_phone.ilike.%${escaped}%,user_name.ilike.%${escaped}%,category.ilike.%${escaped}%,description.ilike.%${escaped}%`
      )
    }

    const { data, error } = await q
    if (error) {
      console.error('Error fetching tickets:', error)
      return
    }

    setTickets(data || [])
  }

  // 2) Fetch tickets on filter changes
  useEffect(() => {
    refreshTickets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, statusTab, flaggedOnly, searchTerm])

  // 3) Realtime updates for tickets (INSERT/UPDATE)
  useEffect(() => {
    if (!clientId) return

    // cleanup old
    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current)
      realtimeRef.current = null
    }

    const ch = supabase
      .channel(`tickets_${clientId}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `client_id=eq.${clientId}` },
        () => {
          // simple approach: refetch (MVP)
          refreshTickets()
        }
      )
      .subscribe()

    realtimeRef.current = ch

    return () => {
      if (realtimeRef.current) supabase.removeChannel(realtimeRef.current)
      realtimeRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  // Actions
  const updateTicket = async (ticketId, patch) => {
    const { error } = await supabase
      .from('tickets')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', ticketId)
      .eq('client_id', clientId)

    if (error) console.error('Ticket update error:', error)
  }

  const toggleFlag = async (t) => {
    await updateTicket(t.id, { is_flagged: !t.is_flagged })
    setSelectedTicket(prev => prev ? { ...prev, is_flagged: !prev.is_flagged } : prev)
  }

  const setStatus = async (t, status) => {
    await updateTicket(t.id, { status })
    setSelectedTicket(prev => prev ? { ...prev, status } : prev)
  }

  const openChat = (t) => {
    // You can later auto-open the correct thread in /chat using these query params
    const params = new URLSearchParams()
    params.set('end_user_id', t.end_user_id)
    if (t.bp_conversation_id) params.set('conversation_id', t.bp_conversation_id)
    router.push(`/chat?${params.toString()}`)
  }

  const selectedMeta = useMemo(() => {
    if (!selectedTicket) return null
    const phone = selectedTicket.user_phone || '(no phone)'
    const name = selectedTicket.user_name || '(no name)'
    return `${name} • ${phone}`
  }, [selectedTicket])

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left: Tickets list */}
      <div className="flex-1 bg-[#0f172a] text-white flex flex-col min-h-0">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold m-0">Tickets</h1>

            <button
              onClick={refreshTickets}
              className="text-xs px-3 py-2 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 flex items-center gap-2"
              title="Refresh"
            >
              <FiRefreshCcw />
              Refresh
            </button>
          </div>

          {/* Tabs + Flagged toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {['open', 'in_progress', 'resolved'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusTab(s)}
                className={`text-sm px-3 py-2 rounded-md border ${
                  statusTab === s
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {s === 'open' ? 'Open' : s === 'in_progress' ? 'In Progress' : 'Resolved'}
              </button>
            ))}

            <label className="ml-2 text-sm flex items-center gap-2 opacity-90">
              <input
                type="checkbox"
                checked={flaggedOnly}
                onChange={(e) => setFlaggedOnly(e.target.checked)}
              />
              Flagged only
            </label>
          </div>

          {/* Search */}
          <div className="flex items-center bg-slate-900 rounded-md px-3 py-2 border border-slate-700">
            <FiSearch className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search phone, name, category, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent outline-none text-sm flex-1 text-white"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {tickets.length === 0 ? (
            <div className="p-6 opacity-70">No tickets found.</div>
          ) : (
            <ul className="divide-y divide-slate-800">
              {tickets.map((t) => (
                <li
                  key={t.id}
                  className={`p-4 cursor-pointer hover:bg-slate-900/40 ${
                    selectedTicket?.id === t.id ? 'bg-slate-900/60' : ''
                  }`}
                  onClick={() => setSelectedTicket(t)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={statusChip(t.status)}>{t.status}</span>

                        {t.is_flagged && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-red-500/40 bg-red-500/10 text-red-200">
                            <FiFlag />
                            Flagged
                          </span>
                        )}

                        <span className="text-xs opacity-70">
                          {formatTimestamp(t.created_at)}
                        </span>
                      </div>

                      <div className="mt-2 font-semibold">
                        {t.category || '(no category)'}
                      </div>

                      <div className="mt-1 text-sm opacity-80 truncate">
                        {t.description || '(no description)'}
                      </div>

                      <div className="mt-2 text-xs opacity-70">
                        {(t.user_name || '(no name)')} • {(t.user_phone || '(no phone)')} • {(t.channel || 'unknown')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-300">
                      <FiArrowRightCircle />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right: Detail drawer (desktop) */}
      <div className="hidden lg:flex w-[420px] bg-[#0b1220] border-l border-slate-800 flex-col">
        <div className="p-5 border-b border-slate-800">
          <h2 className="text-lg font-semibold m-0">Details</h2>
          <div className="text-xs opacity-70 mt-2">
            {selectedTicket ? selectedMeta : 'Select a ticket'}
          </div>
        </div>

        {!selectedTicket ? (
          <div className="p-6 opacity-70">Select a ticket to view details.</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className={statusChip(selectedTicket.status)}>{selectedTicket.status}</span>

              <button
                onClick={() => toggleFlag(selectedTicket)}
                className={`text-xs px-3 py-2 rounded-md border flex items-center gap-2 ${
                  selectedTicket.is_flagged
                    ? 'border-red-500/50 bg-red-500/10 hover:bg-red-500/20'
                    : 'border-slate-700 bg-slate-900 hover:bg-slate-800'
                }`}
              >
                <FiFlag />
                {selectedTicket.is_flagged ? 'Unflag' : 'Flag'}
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-xs opacity-70">Category</div>
              <div className="font-semibold">{selectedTicket.category}</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs opacity-70">Description</div>
              <div className="text-sm whitespace-pre-wrap">{selectedTicket.description}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs opacity-70">Created</div>
                <div>{formatTimestamp(selectedTicket.created_at)}</div>
              </div>
              <div>
                <div className="text-xs opacity-70">Updated</div>
                <div>{formatTimestamp(selectedTicket.updated_at)}</div>
              </div>
              <div>
                <div className="text-xs opacity-70">Channel</div>
                <div>{selectedTicket.channel || 'unknown'}</div>
              </div>
              <div>
                <div className="text-xs opacity-70">Conversation ID</div>
                <div className="truncate" title={selectedTicket.bp_conversation_id || ''}>
                  {selectedTicket.bp_conversation_id || '(none)'}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => openChat(selectedTicket)}
                className="w-full text-sm px-3 py-2 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800"
              >
                Open chat
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setStatus(selectedTicket, 'in_progress')}
                  disabled={selectedTicket.status === 'in_progress'}
                  className="text-sm px-3 py-2 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  In progress
                </button>

                <button
                  onClick={() => setStatus(selectedTicket, 'resolved')}
                  disabled={selectedTicket.status === 'resolved'}
                  className="text-sm px-3 py-2 rounded-md border border-green-500/40 bg-green-500/10 hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FiCheckCircle />
                  Resolve
                </button>
              </div>

              {selectedTicket.status === 'resolved' && (
                <button
                  onClick={() => setStatus(selectedTicket, 'open')}
                  className="w-full text-sm px-3 py-2 rounded-md border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20"
                >
                  Reopen
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile detail modal (simple) */}
      {selectedTicket && (
        <div className="lg:hidden fixed inset-0 bg-black/60 z-50 flex">
          <div className="bg-[#0b1220] text-white w-full h-full flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{selectedMeta}</div>
                <div className="text-xs opacity-70">{formatTimestamp(selectedTicket.created_at)}</div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-sm px-3 py-2 rounded-md border border-slate-700 bg-slate-900"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className={statusChip(selectedTicket.status)}>{selectedTicket.status}</span>
                <button
                  onClick={() => toggleFlag(selectedTicket)}
                  className={`text-xs px-3 py-2 rounded-md border flex items-center gap-2 ${
                    selectedTicket.is_flagged
                      ? 'border-red-500/50 bg-red-500/10'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  <FiFlag />
                  {selectedTicket.is_flagged ? 'Unflag' : 'Flag'}
                </button>
              </div>

              <div>
                <div className="text-xs opacity-70">Category</div>
                <div className="font-semibold">{selectedTicket.category}</div>
              </div>

              <div>
                <div className="text-xs opacity-70">Description</div>
                <div className="text-sm whitespace-pre-wrap">{selectedTicket.description}</div>
              </div>

              <button
                onClick={() => openChat(selectedTicket)}
                className="w-full text-sm px-3 py-2 rounded-md border border-slate-700 bg-slate-900"
              >
                Open chat
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setStatus(selectedTicket, 'in_progress')}
                  disabled={selectedTicket.status === 'in_progress'}
                  className="text-sm px-3 py-2 rounded-md border border-slate-700 bg-slate-900 disabled:opacity-50"
                >
                  In progress
                </button>
                <button
                  onClick={() => setStatus(selectedTicket, 'resolved')}
                  disabled={selectedTicket.status === 'resolved'}
                  className="text-sm px-3 py-2 rounded-md border border-green-500/40 bg-green-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FiCheckCircle />
                  Resolve
                </button>
              </div>

              {selectedTicket.status === 'resolved' && (
                <button
                  onClick={() => setStatus(selectedTicket, 'open')}
                  className="w-full text-sm px-3 py-2 rounded-md border border-blue-500/40 bg-blue-500/10"
                >
                  Reopen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
