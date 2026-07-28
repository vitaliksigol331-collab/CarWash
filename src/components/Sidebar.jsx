import {
  LayoutDashboard,
  Sun,
  Boxes,
  Users,
  UserCog,
  CalendarClock,
  Wallet2,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export const TABS = [
  { key: 'overview', label: 'Огляд', icon: LayoutDashboard },
  { key: 'workday', label: 'Робочий день', icon: Sun },
  { key: 'employees', label: 'Працівники', icon: UserCog },
  { key: 'expenses', label: 'Витрати', icon: Wallet2 },
  { key: 'warehouse', label: 'Склад', icon: Boxes },
  { key: 'clients', label: 'Клієнти', icon: Users },
  { key: 'booking', label: 'Запис', icon: CalendarClock },
]

export default function Sidebar({ active, onChange, mobileOpen, onCloseMobile }) {
  const { storeName, signOut } = useAuth()

  const content = (
    <div className="h-full flex flex-col bg-ink-900 border-r border-ink-700">
      <div className="px-5 py-6 flex items-center gap-2 border-b border-ink-700">
        <div className="w-9 h-9 rounded-xl bg-aqua-400/15 flex items-center justify-center shrink-0">
          <img src="/logo.svg" alt="" className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <p className="font-display font-extrabold text-white leading-tight truncate">
            {storeName || 'AquaBoard'}
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = active === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => {
                onChange(tab.key)
                onCloseMobile?.()
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative
                ${
                  isActive
                    ? 'bg-ink-700 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-ink-800'
                }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-gradient-to-b from-aqua-400 to-foam-400" />
              )}
              <Icon size={18} className={isActive ? 'text-aqua-400' : ''} />
              {tab.label}
            </button>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-ink-700">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-coral-400 hover:bg-ink-800 transition-colors"
        >
          <LogOut size={18} />
          Вийти
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Десктоп */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0">{content}</aside>

      {/* Мобільна версія */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-64 h-full animate-drop-in">{content}</div>
          <div className="flex-1 bg-black/60" onClick={onCloseMobile} />
        </div>
      )}
    </>
  )
}
