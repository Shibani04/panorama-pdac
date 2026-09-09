import { Bell } from 'lucide-react'
import NotificationBell from './NotificationBell'

function Topbar({ title, user }) {
  const initials = user?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2)

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-panel px-8 py-4 shadow-[0_2px_10px_rgba(26,52,73,0.04)]">
      <div>
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted"><span>PancreaAI</span><span>/</span><span>Clinical workspace</span></div>
        <h1 className="font-display text-xl font-bold mt-1">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden md:block text-xs text-text-muted">08 Sep 2026</span>
        <NotificationBell />
        <div className="hidden sm:flex items-center gap-2 text-sm font-medium">
          <span className="w-8 h-8 rounded-full bg-accent-soft text-accent grid place-items-center text-xs font-bold">{initials}</span>
          <span>{user?.name}</span>
        </div>
      </div>
    </header>
  )
}

export default Topbar
