import { NavLink } from 'react-router-dom'

const nav = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/leads', label: 'Leads', icon: '◎' },
  { to: '/campaigns', label: 'Campaigns', icon: '◈' },
  { to: '/live', label: 'Live calls', icon: '⬤' },
  { to: '/dial', label: 'Manual Dial', icon: '✆' },
  { to: '/history', label: 'History', icon: '◷' },
  { to: '/analytics', label: 'Analytics', icon: '▼' },
]

export default function Sidebar() {
  return (
    <aside className="w-48 flex-shrink-0 border-r border-gray-200 bg-white min-h-screen px-3 py-4">
      <div className="text-sm font-semibold text-gray-900 px-3 mb-6">📞 CallCRM</div>
      <nav className="space-y-1">
        {nav.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <span className="text-xs">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
