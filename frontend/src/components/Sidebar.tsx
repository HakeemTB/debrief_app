import {
  BarChart2,
  BookOpen,
  Clock,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  roles: string[]
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard', roles: ['ADMIN', 'SUPERVISOR', 'INTERN'] },
  { to: '/debrief', icon: <BookOpen size={20} />, label: 'Daily Debrief', roles: ['INTERN'] },
  { to: '/hourly-logs', icon: <Clock size={20} />, label: 'Hourly Logs', roles: ['INTERN'] },
  { to: '/admin', icon: <Settings size={20} />, label: 'Admin Panel', roles: ['ADMIN'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()

  if (!user) return null

  const visible = navItems.filter((item) => item.roles.includes(user.role))

  const roleBadge: Record<string, string> = {
    ADMIN: 'badge-admin',
    SUPERVISOR: 'badge-supervisor',
    INTERN: 'badge-intern',
  }

  return (
    <aside className="w-64 bg-brand-900 text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-brand-800">
        <div className="flex items-center gap-2">
          <BarChart2 className="text-brand-300" size={24} />
          <span className="text-xl font-bold tracking-tight">DebriefPro</span>
        </div>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-brand-800">
        <p className="text-sm font-semibold truncate">
          {user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user.username}
        </p>
        <p className="text-xs text-brand-300 truncate mt-0.5">{user.email}</p>
        <span className={`mt-2 inline-block ${roleBadge[user.role]}`}>{user.role}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-700 text-white'
                  : 'text-brand-200 hover:bg-brand-800 hover:text-white'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}

        {/* Supervisor: Interns list link is handled in Dashboard, but add Users link */}
        {(user.role === 'SUPERVISOR' || user.role === 'ADMIN') && (
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-700 text-white'
                  : 'text-brand-200 hover:bg-brand-800 hover:text-white'
              }`
            }
          >
            <Users size={20} />
            Interns
          </NavLink>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-brand-800">
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-brand-200 hover:bg-brand-800 hover:text-white transition-colors"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
