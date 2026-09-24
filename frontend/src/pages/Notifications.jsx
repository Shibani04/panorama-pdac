import { useEffect, useState } from 'react'
import { ArrowLeft, Bell, CheckCheck, ExternalLink } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { claimRequest, listMyNotifications, markAllNotificationsRead, markNotificationRead } from '../api/client'
import { useAuth } from '../context/AuthContext'
import ClaimRequestModal from '../components/ClaimRequestModal'

function timeAgo(isoString) {
  const diffMs = Date.now() - new Date(`${isoString}Z`).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function Notifications() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [claimingNotification, setClaimingNotification] = useState(null)
  const [claimSubmitting, setClaimSubmitting] = useState(false)
  const [claimError, setClaimError] = useState(null)

  useEffect(() => {
    listMyNotifications()
      .then(setNotifications)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function markRead(notification) {
    if (!notification.is_read) {
      await markNotificationRead(notification.id)
      setNotifications((items) => items.map((item) => (
        item.id === notification.id ? { ...item, is_read: true } : item
      )))
    }
    if (notification.request_id) {
      const isUnassigned = user?.role === 'radiologist' && notification.message.toLowerCase().includes('unassigned')
      if (isUnassigned) {
        setClaimError(null)
        setClaimingNotification(notification)
        return
      }
      const isNewRequest = notification.message.toLowerCase().includes('new scan request')
      navigate(user?.role === 'radiologist' && isNewRequest ? `/upload-analysis?requestId=${notification.request_id}` : `/case/${notification.request_id}`)
    }
  }

  async function confirmClaim() {
    setClaimSubmitting(true)
    try {
      await claimRequest(claimingNotification.request_id)
      setNotifications((items) => items.filter((item) => item.request_id !== claimingNotification.request_id))
      navigate(`/upload-analysis?requestId=${claimingNotification.request_id}`)
      setClaimingNotification(null)
    } catch (err) {
      setClaimError(err.message)
    } finally {
      setClaimSubmitting(false)
    }
  }

  async function markAllRead() {
    await markAllNotificationsRead()
    setNotifications((items) => items.map((item) => ({ ...item, is_read: true })))
  }

  const unreadCount = notifications.filter((notification) => !notification.is_read).length
  const backTo = window.localStorage.getItem('user')
    ? JSON.parse(window.localStorage.getItem('user')).role === 'radiologist' ? '/radiologist' : '/doctor'
    : '/login'

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-10 border-b border-border bg-panel/95 px-6 py-4 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <Link to={backTo} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
            <ArrowLeft size={16} /> Back to dashboard
          </Link>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
              <CheckCheck size={16} /> Mark all as read
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <div className="mb-6">
          <p className="text-xs font-mono text-text-muted uppercase tracking-wide">Updates</p>
          <h1 className="text-2xl font-semibold mt-1">Notifications</h1>
          <p className="text-sm text-text-muted mt-1">Review scan and report activity in one place.</p>
        </div>

        {error && <p className="bg-flag-positive-bg text-flag-positive text-sm rounded px-3 py-2 mb-4">{error}</p>}
        <section className="bg-panel border border-border rounded-xl overflow-hidden shadow-[0_6px_20px_rgba(49,87,183,0.04)]">
          {loading ? (
            <p className="p-8 text-sm text-text-muted text-center">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <div className="p-10 text-center">
              <Bell size={24} className="mx-auto text-text-muted" />
              <p className="text-sm font-medium mt-3">You are all caught up</p>
            </div>
          ) : notifications.map((notification) => (
            <div key={notification.id} className={`px-5 py-4 border-b border-border last:border-b-0 flex gap-4 ${!notification.is_read ? 'bg-flag-positive-bg/30' : ''}`}>
              <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${notification.is_read ? 'bg-border' : 'bg-flag-positive'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed">{notification.message}</p>
                <p className="text-xs text-text-muted mt-1">{timeAgo(notification.created_at)}</p>
              </div>
              <button onClick={() => markRead(notification)} className="shrink-0 self-center text-text-muted hover:text-text" title={notification.request_id ? 'Open case' : 'Mark as read'}>
                {notification.request_id ? <ExternalLink size={16} /> : <CheckCheck size={16} />}
              </button>
            </div>
          ))}
        </section>
      </main>
      <ClaimRequestModal
        requestId={claimingNotification?.request_id}
        submitting={claimSubmitting}
        error={claimError}
        onCancel={() => { setClaimError(null); setClaimingNotification(null) }}
        onConfirm={confirmClaim}
      />
    </div>
  )
}

export default Notifications