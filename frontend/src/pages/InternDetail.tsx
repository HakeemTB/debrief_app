import { ArrowLeft, BookOpen, Clock, Loader2, MessageSquare, Send, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { debriefApi, feedbackApi, logApi, userApi } from '../api/debriefs'
import Card from '../components/Card'
import PerformanceChart from '../components/PerformanceChart'
import { useAuth } from '../context/AuthContext'
import type { DailyDebrief, HourlyLog, ProductivitySummary, User } from '../types'

export default function InternDetail() {
  const { internId } = useParams<{ internId: string }>()
  const { user: currentUser } = useAuth()
  const id = Number(internId)

  const [intern, setIntern] = useState<User | null>(null)
  const [debriefs, setDebriefs] = useState<DailyDebrief[]>([])
  const [logs, setLogs] = useState<HourlyLog[]>([])
  const [productivity, setProductivity] = useState<ProductivitySummary[]>([])
  const [loading, setLoading] = useState(true)

  const [feedbackContent, setFeedbackContent] = useState<Record<number, string>>({})
  const [submittingFeedback, setSubmittingFeedback] = useState<number | null>(null)
  const [feedbackSuccess, setFeedbackSuccess] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [internRes, debriefRes, logRes, prodRes] = await Promise.all([
        userApi.get(id),
        debriefApi.list({ intern_id: id }),
        logApi.list({ intern_id: id }),
        logApi.productivitySummary({ intern_id: id }),
      ])
      setIntern(internRes.data)
      setDebriefs(debriefRes.data.results)
      setLogs(logRes.data.results)
      setProductivity(prodRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const submitFeedback = async (debriefId: number) => {
    const content = feedbackContent[debriefId]?.trim()
    if (!content) return
    setSubmittingFeedback(debriefId)
    try {
      await feedbackApi.create({ debrief: debriefId, content })
      setFeedbackSuccess(debriefId)
      setFeedbackContent((prev) => ({ ...prev, [debriefId]: '' }))
      await load()
      setTimeout(() => setFeedbackSuccess(null), 3000)
    } finally {
      setSubmittingFeedback(null)
    }
  }

  const updateFeedback = async (feedbackId: number, content: string) => {
    await feedbackApi.update(feedbackId, { content })
    await load()
  }

  const scoreStars = (score: number) => (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={12}
          className={i < score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}
        />
      ))}
    </span>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-700" />
      </div>
    )
  }

  if (!intern) {
    return <p className="text-gray-500">Intern not found.</p>
  }

  const displayName = intern.first_name && intern.last_name
    ? `${intern.first_name} ${intern.last_name}`
    : intern.username

  const avgProductivity = productivity.length
    ? (productivity.reduce((s, d) => s + d.avg_score, 0) / productivity.length).toFixed(2)
    : '—'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/dashboard" className="btn-secondary mt-1">
          <ArrowLeft size={16} />
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
          <p className="text-sm text-gray-500">{intern.email}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-50 text-brand-700"><BookOpen size={20} /></div>
          <div>
            <p className="text-xl font-bold">{debriefs.length}</p>
            <p className="text-xs text-gray-500">Total Debriefs</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-yellow-50 text-yellow-600"><Star size={20} /></div>
          <div>
            <p className="text-xl font-bold">{avgProductivity}</p>
            <p className="text-xs text-gray-500">Avg Productivity</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600"><MessageSquare size={20} /></div>
          <div>
            <p className="text-xl font-bold">{debriefs.filter((d) => d.feedback).length}</p>
            <p className="text-xs text-gray-500">Reviewed Debriefs</p>
          </div>
        </div>
      </div>

      {/* Productivity chart */}
      <Card title="Productivity Trend">
        <PerformanceChart data={productivity} />
      </Card>

      {/* Debriefs + Feedback */}
      <Card title={`Debriefs (${debriefs.length})`}>
        {debriefs.length === 0 ? (
          <p className="text-sm text-gray-400">No debriefs submitted yet.</p>
        ) : (
          <div className="space-y-5">
            {debriefs.map((d) => (
              <div key={d.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {new Date(d.date).toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                  {d.feedback ? (
                    <span className="badge bg-green-100 text-green-800">Reviewed</span>
                  ) : (
                    <span className="badge bg-yellow-100 text-yellow-800">Pending</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                  {[
                    ['Yesterday', d.yesterday_task],
                    ['Progress', d.progress_made],
                    ['Challenges', d.challenges],
                    ['Today', d.today_task],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-gray-800">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Existing feedback */}
                {d.feedback && (
                  <div className="bg-purple-50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-purple-700 mb-1 flex items-center gap-1">
                      <MessageSquare size={12} />
                      Feedback from {d.feedback.supervisor_detail?.first_name}{' '}
                      {d.feedback.supervisor_detail?.last_name}
                    </p>
                    {(currentUser?.is_supervisor || currentUser?.role === 'SUPERVISOR' || currentUser?.role === 'ADMIN') ? (
                      <textarea
                        className="input-field resize-none text-sm mt-1"
                        rows={2}
                        defaultValue={d.feedback.content}
                        onBlur={(e) => {
                          if (e.target.value !== d.feedback!.content) {
                            updateFeedback(d.feedback!.id, e.target.value)
                          }
                        }}
                      />
                    ) : (
                      <p className="text-sm text-gray-700">{d.feedback.content}</p>
                    )}
                  </div>
                )}

                {/* New feedback form */}
                {!d.feedback && (currentUser?.role === 'SUPERVISOR' || currentUser?.role === 'ADMIN') && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Leave Feedback</p>
                    <div className="flex gap-2">
                      <textarea
                        rows={2}
                        className="input-field resize-none text-sm flex-1"
                        placeholder="Write your feedback here…"
                        value={feedbackContent[d.id] || ''}
                        onChange={(e) =>
                          setFeedbackContent((prev) => ({ ...prev, [d.id]: e.target.value }))
                        }
                      />
                      <button
                        className="btn-primary self-end"
                        disabled={submittingFeedback === d.id || !feedbackContent[d.id]?.trim()}
                        onClick={() => submitFeedback(d.id)}
                        aria-label="Submit feedback"
                      >
                        {submittingFeedback === d.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Send size={16} />
                        )}
                      </button>
                    </div>
                    {feedbackSuccess === d.id && (
                      <p className="text-xs text-green-600 mt-1">Feedback submitted!</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Hourly logs */}
      <Card title={`Hourly Logs (${logs.length})`}>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400">No log entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="pb-2 font-medium text-gray-500 pr-3">Date</th>
                  <th className="pb-2 font-medium text-gray-500 pr-3">Time</th>
                  <th className="pb-2 font-medium text-gray-500 pr-3">Activity</th>
                  <th className="pb-2 font-medium text-gray-500 pr-3">Score</th>
                  <th className="pb-2 font-medium text-gray-500">Hrs</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-3 text-gray-600">{log.date}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-gray-500">
                      {log.start_time.slice(0, 5)}–{log.end_time.slice(0, 5)}
                    </td>
                    <td className="py-2 pr-3 text-gray-800 max-w-xs">{log.activity}</td>
                    <td className="py-2 pr-3">{scoreStars(log.productivity_score)}</td>
                    <td className="py-2 text-gray-600">{log.duration_hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
