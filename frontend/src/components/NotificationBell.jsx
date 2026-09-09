import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { getUnreadCount, listMyNotifications, markNotificationRead, markAllNotificationsRead } from '../api/client'

function timeAgo(isoString) {
  const mins = Math.floor((Date.now() - new Date(`${isoString}Z`).getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  async function refreshCount() {
    try {
      const { count } = await getUnreadCount()
      setUnreadCount(count)
    } catch {
      // silent — a failed poll shouldn't interrupt the rest of the UI
    }
  }

  useEffect(() => {
    refreshCount()
    const interval = setInterval(refreshCount, 20000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  async function handleOpen() {
    const nextOpen = !open
    setOpen(nextOpen)
    if (nextOpen) {
      try {
        setNotifications(await listMyNotifications())
      } catch {
        setNotifications([])
      }
    }
  }

  async function handleNotificationClick(notification) {
    if (!notification.is_read) {
      try {
        await markNotificationRead(notification.id)
      } catch {
        // Keep the notification usable even if marking it read fails.
      }
      setUnreadCount((count) => Math.max(0, count - 1))
      setNotifications((items) => items.map((item) => (
        item.id === notification.id ? { ...item, is_read: true } : item
      )))
    }
    setOpen(false)
    if (notification.request_id) navigate(`/requests/${notification.request_id}`)
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead()
    setUnreadCount(0)
    setNotifications((items) => items.map((item) => ({ ...item, is_read: true })))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-md border border-border text-text-muted hover:bg-bg hover:text-text transition-colors"
        aria-label="Notifications"
        title="Open notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-flag-positive text-white text-[10px] font-medium rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-border bg-panel shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-accent hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">No notifications</p>
            ) : notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleNotificationClick(notification)}
                className={`w-full border-b border-border px-4 py-3 text-left last:border-0 hover:bg-bg ${!notification.is_read ? 'bg-sidebar-active/50' : ''}`}
              >
                <p className="text-sm leading-snug">{notification.message}</p>
                <p className="mt-1 text-xs text-text-muted">{timeAgo(notification.created_at)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell