import { BookOpen, Clock, MessageSquare, TrendingUp, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { debriefApi, logApi, userApi } from '../api/debriefs'
import Card from '../components/Card'
import PerformanceChart from '../components/PerformanceChart'
import StatCard from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import type { DebriefStats, DailyDebrief, ProductivitySummary, UserBasic } from '../types'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DebriefStats | null>(null)
  const [productivity, setProductivity] = useState<ProductivitySummary[]>([])
  const [recentDebriefs, setRecentDebriefs] = useState<DailyDebrief[]>([])
  const [interns, setInterns] = useState<UserBasic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const [statsRes, prodRes, debriefRes] = await Promise.all([
          debriefApi.stats(),
          logApi.productivitySummary(),
          debriefApi.list({ page: 1 }),
        ])
        setStats(statsRes.data)
        setProductivity(prodRes.data)
        setRecentDebriefs(debriefRes.data.results.slice(0, 5))

        if (user.role !== 'INTERN') {
          const internsRes = await userApi.interns()
          setInterns(internsRes.data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-700" />
      </div>
    )
  }

  const greeting = user.first_name ? `Hello, ${user.first_name}!` : `Hello, ${user.username}!`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{greeting}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Total Debriefs"
            value={stats.total_debriefs}
            icon={<BookOpen size={22} />}
          />
          <StatCard
            label="Debriefs This Week"
            value={stats.debriefs_last_7_days}
            icon={<TrendingUp size={22} />}
            color="text-green-600"
          />
          <StatCard
            label="With Feedback"
            value={stats.debriefs_with_feedback}
            icon={<MessageSquare size={22} />}
            color="text-purple-600"
          />
        </div>
      )}

      {/* Charts + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Productivity chart */}
        <div className="lg:col-span-2">
          <Card title="Productivity Trend">
            <PerformanceChart data={productivity} />
          </Card>
        </div>

        {/* Quick actions */}
        <Card title="Quick Actions">
          <div className="space-y-2">
            {user.role === 'INTERN' && (
              <>
                <Link to="/debrief" className="btn-primary w-full justify-center">
                  <BookOpen size={16} />
                  Submit Today's Debrief
                </Link>
                <Link to="/hourly-logs" className="btn-secondary w-full justify-center">
                  <Clock size={16} />
                  Log Hours
                </Link>
              </>
            )}
            {(user.role === 'SUPERVISOR' || user.role === 'ADMIN') && (
              <p className="text-sm text-gray-500">Select an intern below to view their progress.</p>
            )}
            {user.role === 'ADMIN' && (
              <Link to="/admin" className="btn-primary w-full justify-center mt-2">
                <Users size={16} />
                Admin Panel
              </Link>
            )}
          </div>
        </Card>
      </div>

      {/* Recent debriefs */}
      <Card title="Recent Debriefs">
        {recentDebriefs.length === 0 ? (
          <p className="text-sm text-gray-400">No debriefs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  {user.role !== 'INTERN' && <th className="pb-2 font-medium text-gray-500 pr-4">Intern</th>}
                  <th className="pb-2 font-medium text-gray-500 pr-4">Date</th>
                  <th className="pb-2 font-medium text-gray-500 pr-4">Today's Task</th>
                  <th className="pb-2 font-medium text-gray-500">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {recentDebriefs.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                    {user.role !== 'INTERN' && (
                      <td className="py-2.5 pr-4 font-medium">
                        <Link to={`/intern/${d.intern}`} className="text-brand-700 hover:underline">
                          {d.intern_detail.first_name} {d.intern_detail.last_name || d.intern_detail.username}
                        </Link>
                      </td>
                    )}
                    <td className="py-2.5 pr-4 text-gray-600">{new Date(d.date).toLocaleDateString()}</td>
                    <td className="py-2.5 pr-4 text-gray-800 max-w-xs truncate">{d.today_task}</td>
                    <td className="py-2.5">
                      {d.feedback ? (
                        <span className="badge bg-green-100 text-green-800">Reviewed</span>
                      ) : (
                        <span className="badge bg-yellow-100 text-yellow-800">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Interns list (supervisor/admin) */}
      {user.role !== 'INTERN' && interns.length > 0 && (
        <Card title="All Interns">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {interns.map((intern) => (
              <Link
                key={intern.id}
                to={`/intern/${intern.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm">
                  {(intern.first_name?.[0] || intern.username[0]).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {intern.first_name && intern.last_name
                      ? `${intern.first_name} ${intern.last_name}`
                      : intern.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{intern.email}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
