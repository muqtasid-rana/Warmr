import { useState, useEffect, useMemo, useCallback } from 'react'
import './App.css'
import {
  subscribeToProspects,
  addProspect as fbAddProspect,
  updateProspect as fbUpdateProspect,
  deleteProspect as fbDeleteProspect,
  seedIfEmpty,
} from './prospectService'

// ── Status list ──────────────────────────────────────────────
const ALL_STATUSES = [
  'Warming',
  'DM Sent',
  'No Reply',
  'Active Conversation',
  'Loom Sent',
  'Client Won',
]

const STATUS_CLASS = {
  'Warming': 'warming',
  'DM Sent': 'dm-sent',
  'No Reply': 'no-reply',
  'Active Conversation': 'active-conversation',
  'Loom Sent': 'loom-sent',
  'Client Won': 'client-won',
}

const NICHE_OPTIONS = [
  'Business Coach',
  'Executive Coach',
  'Sales Consultant',
  'Leadership Coach',
  'Financial Coach',
  'Life Coach',
  'Marketing Consultant',
  'Other',
]

// ── Helpers ──────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function nowISO() {
  return new Date().toISOString()
}

function addHoursToNow(hours) {
  const d = new Date()
  d.setTime(d.getTime() + hours * 3600000)
  return d.toISOString()
}

function isDuePast(dueDateStr) {
  if (!dueDateStr) return true
  // Support both YYYY-MM-DD (treat as start-of-day UTC) and full ISO strings
  const dueTime = new Date(dueDateStr).getTime()
  return Date.now() >= dueTime
}

function isDueFuture(dueDateStr) {
  if (!dueDateStr) return false
  const dueTime = new Date(dueDateStr).getTime()
  return Date.now() < dueTime
}

function daysSince(dateStr) {
  if (!dateStr) return 0
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.max(0, Math.floor(diff / 86400000))
}

function addDaysToDate(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ── Compute current action for a prospect ────────────────────
function computeAction(prospect) {
  const today = todayStr()
  const p = prospect

  // ─ Warming phase: days 1–7 ─
  if (p.status === 'Warming' && p.warmingDaysCompleted < 7) {
    const dayNum = (p.warmingDaysCompleted || 0) + 1
    const due = p.currentActionDueDate || today

    // Only show if due now or overdue (not if due in the future)
    if (isDueFuture(due)) return null

    const isOverdue = due < today // overdue if before today's date

    let text
    if (dayNum <= 3) text = `Like or Comment — Day ${dayNum} of 7`
    else if (dayNum <= 5) text = `Engage with content — Day ${dayNum} of 7`
    else text = `Final warming touches — Day ${dayNum} of 7`

    return {
      type: 'warming',
      colorClass: dayNum <= 3 ? 'amber' : dayNum <= 5 ? 'blue' : 'emerald',
      text,
      due,
      isOverdue,
      dayNum,
    }
  }

  // ─ Warming complete → Send DM ─
  if (p.status === 'Warming' && p.warmingDaysCompleted >= 7) {
    const due = p.currentActionDueDate || today

    // Only show if due now or overdue
    if (isDueFuture(due)) return null

    const isOverdue = due < today

    return {
      type: 'send-dm',
      colorClass: 'cyan',
      text: 'Send DM — warming complete!',
      due,
      isOverdue,
    }
  }

  // ─ DM Sent → waiting for response ─
  if (p.status === 'DM Sent') {
    return {
      type: 'dm-response',
      colorClass: 'amber',
      text: 'Awaiting response — mark outcome',
      due: today,
      isOverdue: false,
    }
  }

  // ─ No Reply → follow-up schedule ─
  if (p.status === 'No Reply' && p.followUpsDone < 4) {
    const followUpNum = (p.followUpsDone || 0) + 1
    const due = p.currentActionDueDate || today

    if (isDuePast(due)) {
      const isOverdue = due < today
      return {
        type: 'follow-up',
        colorClass: 'rose',
        text: `Follow Up #${followUpNum} — send a message`,
        due,
        isOverdue,
        followUpNum,
      }
    }
    // Not yet due
    return null
  }

  return null
}

// ── SVG Icons ────────────────────────────────────────────────
const Icons = {
  flame: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5-1.786 3-2.791 3-4 2z" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  messageCircle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" /><path d="m21.854 2.147-10.94 10.939" />
    </svg>
  ),
  zap: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  ),
  star: (
    <svg className="star-icon" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  circleCheck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
    </svg>
  ),
  xCircle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
    </svg>
  ),
}

// ── Empty form state ─────────────────────────────────────────
const EMPTY_FORM = {
  name: '',
  linkedin: '',
  website: '',
  followers: '',
  niche: 'Business Coach',
  notes: '',
  status: 'Warming',
}

// ══════════════════════════════════════════════════════════════
// ██  APP COMPONENT
// ══════════════════════════════════════════════════════════════
function App() {
  const [activeTab, setActiveTab] = useState('Pipeline')
  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  // ── Firebase subscription ────────────────────────────────
  useEffect(() => {
    seedIfEmpty().catch(console.error)
    const unsub = subscribeToProspects((data) => {
      setProspects(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // ── Derived stats ────────────────────────────────────────
  const stats = useMemo(() => {
    const total = prospects.length
    const warming = prospects.filter(p => p.status === 'Warming').length
    const dmSent = prospects.filter(p => p.status === 'DM Sent').length
    const noReply = prospects.filter(p => p.status === 'No Reply').length
    const active = prospects.filter(p => p.status === 'Active Conversation').length

    let actionsDue = 0
    prospects.forEach(p => {
      const action = computeAction(p)
      if (action) actionsDue++
    })

    return { total, warming, dmSent, noReply, active, actionsDue }
  }, [prospects])

  // ── Today's actions ──────────────────────────────────────
  const todaysActions = useMemo(() => {
    const actions = []
    prospects.forEach(p => {
      const action = computeAction(p)
      if (action) {
        actions.push({ prospect: p, action })
      }
    })
    return actions
  }, [prospects])

  // ── Filtered prospects ───────────────────────────────────
  const filteredProspects = useMemo(() => {
    return prospects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [prospects, searchQuery, statusFilter])

  // ── Action handlers ──────────────────────────────────────
  const handleCompleteWarming = useCallback(async (prospect) => {
    const nextDue = addHoursToNow(12)
    const newCompleted = (prospect.warmingDaysCompleted || 0) + 1
    await fbUpdateProspect(prospect.id, {
      warmingDaysCompleted: newCompleted,
      currentActionDueDate: nextDue,
    })
  }, [])

  const handleCompleteSendDM = useCallback(async (prospect) => {
    const today = todayStr()
    await fbUpdateProspect(prospect.id, {
      status: 'DM Sent',
      dmSentAt: new Date().toISOString(),
      currentActionDueDate: today,
    })
  }, [])

  const handleConversationStarted = useCallback(async (prospect) => {
    await fbUpdateProspect(prospect.id, {
      status: 'Active Conversation',
    })
  }, [])

  const handleNoReply = useCallback(async (prospect) => {
    const today = todayStr()
    await fbUpdateProspect(prospect.id, {
      status: 'No Reply',
      noReplyAt: new Date().toISOString(),
      followUpsDone: 0,
      lastFollowUpAt: null,
      currentActionDueDate: addDaysToDate(today, 2),
    })
  }, [])

  const handleCompleteFollowUp = useCallback(async (prospect) => {
    const today = todayStr()
    const newFollowUpsDone = (prospect.followUpsDone || 0) + 1
    const updates = {
      followUpsDone: newFollowUpsDone,
      lastFollowUpAt: new Date().toISOString(),
      currentActionDueDate: addDaysToDate(today, 3),
    }
    await fbUpdateProspect(prospect.id, updates)
  }, [])

  // ── CRUD handlers ────────────────────────────────────────
  function openAddPanel() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setPanelOpen(true)
  }

  function openEditPanel(prospect) {
    setEditingId(prospect.id)
    setForm({
      name: prospect.name,
      linkedin: prospect.linkedin,
      website: prospect.website,
      followers: prospect.followers,
      niche: prospect.niche,
      notes: prospect.notes,
      status: prospect.status,
    })
    setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function handleFormChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) return

    if (editingId) {
      await fbUpdateProspect(editingId, {
        name: form.name,
        linkedin: form.linkedin,
        website: form.website,
        followers: form.followers,
        niche: form.niche,
        notes: form.notes,
        status: form.status,
      })
    } else {
      await fbAddProspect({
        name: form.name,
        linkedin: form.linkedin,
        website: form.website,
        followers: form.followers,
        niche: form.niche,
        notes: form.notes,
      })
    }
    closePanel()
  }

  async function handleDelete(id) {
    if (deleteConfirmId === id) {
      await fbDeleteProspect(id)
      setDeleteConfirmId(null)
    } else {
      setDeleteConfirmId(id)
      setTimeout(() => setDeleteConfirmId(prev => (prev === id ? null : prev)), 3000)
    }
  }

  // ══════════════════════════════════════════════════════════
  // ██  RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <>
      {/* ─── TOP NAV ─── */}
      <nav className="top-nav">
        <div className="nav-logo">
          {Icons.target}
          Warmr
        </div>
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'Pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('Pipeline')}
          >
            Pipeline
          </button>
          <button
            className={`nav-tab ${activeTab === 'Content Hub' ? 'active' : ''}`}
            onClick={() => setActiveTab('Content Hub')}
          >
            Content Hub
          </button>
        </div>
      </nav>

      {/* ─── MAIN CONTENT ─── */}
      <main className="main-content">
        {activeTab === 'Pipeline' && (
          <>
            {loading ? (
              <div className="loading-state">
                <div className="spinner" />
                <span>Loading prospects...</span>
              </div>
            ) : (
              <>
                {/* ── Section Header ── */}
                <div className="section-header">
                  <h1 className="section-title">Pipeline</h1>
                  <button className="btn-add-prospect" onClick={openAddPanel}>
                    {Icons.plus}
                    Add Prospect
                  </button>
                </div>

                {/* ── Stats Bar ── */}
                <div className="stats-bar">
                  <div className="stat-card">
                    <div className="stat-icon total">{Icons.users}</div>
                    <div className="stat-info">
                      <span className="stat-number total">{stats.total}</span>
                      <span className="stat-label">Total Prospects</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon warming">{Icons.flame}</div>
                    <div className="stat-info">
                      <span className="stat-number warming">{stats.warming}</span>
                      <span className="stat-label">Warming</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon ready">{Icons.send}</div>
                    <div className="stat-info">
                      <span className="stat-number ready">{stats.dmSent + stats.noReply}</span>
                      <span className="stat-label">DM Sent / No Reply</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon active">{Icons.messageCircle}</div>
                    <div className="stat-info">
                      <span className="stat-number active">{stats.active}</span>
                      <span className="stat-label">Active Conversations</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon actions">{Icons.zap}</div>
                    <div className="stat-info">
                      <span className="stat-number actions">{stats.actionsDue}</span>
                      <span className="stat-label">Actions Due</span>
                    </div>
                  </div>
                </div>

                {/* ── Today's Actions ── */}
                <div className="todays-actions">
                  <div className="todays-actions-header">
                    {Icons.clock}
                    <span className="todays-actions-title">Today&apos;s Actions</span>
                    {todaysActions.length > 0 && (
                      <span className="todays-actions-count">{todaysActions.length}</span>
                    )}
                  </div>
                  {todaysActions.length > 0 ? (
                    <div className="action-cards">
                      {todaysActions.map(({ prospect, action }) => (
                        <div className={`action-card ${action.isOverdue ? 'overdue' : ''}`} key={prospect.id}>
                          <div className={`action-dot ${action.colorClass}`} />
                          <div className="action-content">
                            <div className="action-name">
                              {prospect.name}
                              {action.isOverdue && <span className="overdue-badge">OVERDUE</span>}
                            </div>
                            <div className="action-meta">
                              {prospect.niche} · {prospect.followers} followers
                            </div>
                            <span className={`action-recommendation ${action.colorClass}`}>
                              {action.text}
                            </span>
                            <div className="action-buttons">
                              {prospect.linkedin && (
                                <a
                                  href={prospect.linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="action-btn linkedin"
                                  title="Open LinkedIn Profile"
                                >
                                  {Icons.linkedin}
                                </a>
                              )}
                              {/* //jj */}
                              {action.type === 'warming' && (
                                <button
                                  className="action-btn complete"
                                  onClick={() => handleCompleteWarming(prospect)}
                                >
                                  {Icons.circleCheck} Completed
                                </button>
                              )}
                              {action.type === 'send-dm' && (
                                <button
                                  className="action-btn complete"
                                  onClick={() => handleCompleteSendDM(prospect)}
                                >
                                  {Icons.send} DM Sent
                                </button>
                              )}
                              {action.type === 'dm-response' && (
                                <>
                                  <button
                                    className="action-btn conversation"
                                    onClick={() => handleConversationStarted(prospect)}
                                  >
                                    {Icons.circleCheck} Conversation Started
                                  </button>
                                  <button
                                    className="action-btn no-reply"
                                    onClick={() => handleNoReply(prospect)}
                                  >
                                    {Icons.xCircle} No Reply
                                  </button>
                                </>
                              )}
                              {action.type === 'follow-up' && (
                                <button
                                  className="action-btn complete"
                                  onClick={() => handleCompleteFollowUp(prospect)}
                                >
                                  {Icons.circleCheck} Follow Up Sent
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-actions">
                      {Icons.check}
                      <span>All caught up — no actions due today!</span>
                    </div>
                  )}
                </div>

                {/* ── Search & Filter ── */}
                <div className="search-filter-bar">
                  <div className="search-input-wrapper">
                    {Icons.search}
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search prospects by name..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* ── Prospect Cards Grid ── */}
                <div className="prospects-grid">
                  {filteredProspects.length > 0 ? (
                    filteredProspects.map(p => {
                      const warmingProgress = p.status === 'Warming' ? Math.min((p.warmingDaysCompleted || 0) / 7 * 100, 100) : null
                      return (
                        <div className="prospect-card" key={p.id}>
                          <div className="prospect-header">
                            <span className="prospect-name">{p.name}</span>
                            <span className="prospect-days-badge">
                              {daysSince(p.addedAt)}d ago
                            </span>
                          </div>

                          <div className="prospect-meta">
                            <span className="prospect-niche">{p.niche}</span>
                            <span className="prospect-followers">
                              {Icons.users}
                              {p.followers}
                            </span>
                          </div>

                          {/* Warming progress bar */}
                          {warmingProgress !== null && (
                            <div className="warming-progress">
                              <div className="warming-bar">
                                <div className="warming-bar-fill" style={{ width: `${warmingProgress}%` }} />
                              </div>
                              <span className="warming-label">{p.warmingDaysCompleted || 0}/7</span>
                            </div>
                          )}

                          <span className={`status-badge ${STATUS_CLASS[p.status]}`}>
                            {p.status === 'Client Won' && Icons.star}
                            {p.status}
                            {p.status === 'No Reply' && p.followUpsDone > 0 && ` (${p.followUpsDone} follow-up${p.followUpsDone > 1 ? 's' : ''})`}
                          </span>

                          {p.notes && (
                            <div className="prospect-notes">{p.notes}</div>
                          )}

                          <div className="prospect-actions">
                            {p.linkedin && (
                              <a
                                href={p.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="prospect-action-btn linkedin"
                                title="LinkedIn"
                              >
                                {Icons.linkedin}
                              </a>
                            )}
                            {p.website && (
                              <a
                                href={p.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="prospect-action-btn website"
                                title="Website"
                              >
                                {Icons.globe}
                              </a>
                            )}
                            <button
                              className="prospect-action-btn edit"
                              onClick={() => openEditPanel(p)}
                              title="Edit"
                            >
                              {Icons.edit}
                            </button>
                            <button
                              className={`prospect-action-btn delete ${deleteConfirmId === p.id ? 'confirm' : ''}`}
                              onClick={() => handleDelete(p.id)}
                              title={deleteConfirmId === p.id ? 'Click again to confirm' : 'Delete'}
                            >
                              {deleteConfirmId === p.id ? 'Confirm?' : Icons.trash}
                            </button>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="empty-prospects">
                      {Icons.inbox}
                      <span>No prospects found</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Content Hub Tab ── */}
        {activeTab === 'Content Hub' && (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📝</div>
            <p>Content Hub coming soon...</p>
          </div>
        )}

        {/* // CONTENT HUB SECTION GOES HERE */}
      </main>

      {/* ─── SLIDE-IN PANEL ─── */}
      {panelOpen && (
        <>
          <div className="panel-overlay" onClick={closePanel} />
          <div className="slide-panel">
            <div className="panel-header">
              <span className="panel-title">
                {editingId ? 'Edit Prospect' : 'Add Prospect'}
              </span>
              <button className="panel-close" onClick={closePanel}>
                {Icons.x}
              </button>
            </div>

            <div className="panel-body">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sarah Chen"
                  value={form.name}
                  onChange={e => handleFormChange('name', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">LinkedIn URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://linkedin.com/in/..."
                  value={form.linkedin}
                  onChange={e => handleFormChange('linkedin', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Website URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={form.website}
                  onChange={e => handleFormChange('website', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Follower Count</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 5k"
                  value={form.followers}
                  onChange={e => handleFormChange('followers', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Niche</label>
                <select
                  className="form-select"
                  value={form.niche}
                  onChange={e => handleFormChange('niche', e.target.value)}
                >
                  {NICHE_OPTIONS.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {editingId && (
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={e => handleFormChange('status', e.target.value)}
                  >
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-textarea"
                  placeholder="Any notes about this prospect..."
                  value={form.notes}
                  onChange={e => handleFormChange('notes', e.target.value)}
                />
              </div>
            </div>

            <div className="panel-footer">
              <button className="btn-cancel" onClick={closePanel}>Cancel</button>
              <button className="btn-save" onClick={handleSave}>
                {editingId ? 'Update Prospect' : 'Save Prospect'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default App
