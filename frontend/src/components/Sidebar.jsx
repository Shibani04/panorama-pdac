import {
  LayoutDashboard, Users, ClipboardList, FileText, Upload, LogOut, HeartPulse
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const DOCTOR_NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'patients', label: 'Patients', icon: Users },
  { key: 'requests', label: 'Scan Requests', icon: ClipboardList },
  { key: 'reports', label: 'Reports', icon: FileText },
]

const RADIOLOGIST_NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'upload', label: 'Upload & Analysis', icon: Upload },
  { key: 'requests', label: 'Scan Requests', icon: ClipboardList },
  { key: 'reports', label: 'Reports', icon: FileText },
]

function Sidebar({ role = 'doctor', activeKey, onNavigate }) {
  const { user, logout } = useAuth()
  const navConfig = role === 'radiologist' ? RADIOLOGIST_NAV : DOCTOR_NAV

  return (
    <aside className="w-64 h-screen shrink-0 sticky top-0 bg-sidebar text-white flex flex-col">
      <div className="px-6 py-7 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-[9px] bg-[#D8EEEC] text-accent flex items-center justify-center shrink-0">
          <HeartPulse size={20} strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-lg leading-tight tracking-[0.02em] truncate">PANCREAAI</p>
        </div>
      </div>
      <p className="px-6 mb-3 text-[10px] font-bold uppercase tracking-[1.35px] text-[#8AA8B2]">Clinical workspace</p>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navConfig.map((item) => {
          const Icon = item.icon
          const isActive = activeKey === item.key

          return (
            <div key={item.key}>
              <button
                onClick={() => onNavigate?.(item.key)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-active text-sidebar-text-active'
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {Icon && <Icon size={16} />}
                  {item.label}
                </span>
              </button>
            </div>
          )
        })}
      </nav>

      <div className="px-4 pb-5 pt-4 border-t border-white/10">
        <div className="px-2 py-2 mb-2">
          <p className="text-white text-sm font-medium truncate">{user?.name}</p>
          <p className="text-sidebar-text text-xs capitalize">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active text-sm transition-colors"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  )
}

export default Sidebar