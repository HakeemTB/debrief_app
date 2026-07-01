import { Clock, Loader2, Plus, Star, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { logApi } from '../api/debriefs'
import Card from '../components/Card'
import PerformanceChart from '../components/PerformanceChart'
import { useAuth } from '../context/AuthContext'
import type { HourlyLog, ProductivitySummary } from '../types'

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  start_time: '',
  end_time: '',
  activity: '',
  productivity_score: 3,
}

export default function HourlyLogs() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<HourlyLog[]>([])
  const [total, setTotal] = useState(0)
  const [productivity, setProductivity] = useState<ProductivitySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [filterDate, setFilterDate] = useState('')

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterDate) { params.start_date = filterDate; params.end_date = filterDate }
      const [logsRes, prodRes] = await Promise.all([
        logApi.list(params),
        logApi.productivitySummary(),
      ])
      setLogs(logsRes.data.results)
      setTotal(logsRes.data.count)
      setProductivity(prodRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadLogs() }, [filterDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await logApi.create({
        ...form,
        productivity_score: Number(form.productivity_score),
      })
      setSuccess('Log entry added.')
      setForm({ ...emptyForm, date: form.date })
      setShowForm(false)
      loadLogs()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, string[]> } }
      const data = axiosErr.response?.data
      if (data?.end_time) setError(data.end_time[0])
      else if (data?.productivity_score) setError(data.productivity_score[0])
      else setError('Failed to save log entry.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this log entry?')) return
    await logApi.delete(id)
    loadLogs()
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

  // Group logs by date
  const grouped = logs.reduce<Record<string, HourlyLog[]>>((acc, log) => {
    if (!acc[log.date]) acc[log.date] = []
    acc[log.date].push(log)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hourly Logs</h1>
          <p className="text-sm text-gray-500">Track your activities and productivity hour by hour.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus size={16} />
          Log Activity
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <Card title="Add Log Entry">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="log-date" className="label">Date *</label>
                <input
                  id="log-date"
                  type="date"
                  required
                  className="input-field"
                  max={new Date().toISOString().split('T')[0]}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="start-time" className="label">Start Time *</label>
                <input
                  id="start-time"
                  type="time"
                  required
                  className="input-field"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="end-time" className="label">End Time *</label>
                <input
                  id="end-time"
                  type="time"
                  required
                  className="input-field"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="activity" className="label">Activity *</label>
              <textarea
                id="activity"
                rows={2}
                required
                className="input-field resize-none"
                placeholder="Describe what you worked on…"
                value={form.activity}
                onChange={(e) => setForm({ ...form, activity: e.target.value })}
              />
            </div>

            <div>
              <label className="label">
                Productivity Score: <span className="font-bold text-brand-700">{form.productivity_score} / 5</span>
              </label>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                className="w-full accent-brand-700"
                value={form.productivity_score}
                onChange={(e) => setForm({ ...form, productivity_score: Number(e.target.value) })}
                aria-label="Productivity score"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>Low</span><span>High</span>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
                {submitting ? 'Saving…' : 'Add Entry'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>
      )}

      {/* Productivity chart */}
      <Card title="Productivity Over Time">
        <PerformanceChart data={productivity} />
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label htmlFor="filter-date" className="text-sm font-medium text-gray-700">Filter by date:</label>
        <input
          id="filter-date"
          type="date"
          className="input-field w-auto"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
        {filterDate && (
          <button className="btn-secondary text-xs py-1.5" onClick={() => setFilterDate('')}>
            Clear
          </button>
        )}
      </div>

      {/* Logs */}
      <Card title={`Activity Logs (${total})`}>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-700" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No log entries yet. Add your first one!</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, dateLogs]) => (
                <div key={date}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Clock size={14} className="text-brand-600" />
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}
                    <span className="text-gray-400 font-normal">
                      — {dateLogs.length} {dateLogs.length === 1 ? 'entry' : 'entries'},
                      {' '}{dateLogs.reduce((s, l) => s + l.duration_hours, 0).toFixed(1)} hrs total
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {dateLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-4 p-3 rounded-lg bg-gray-50 hover:bg-brand-50/40 transition-colors"
                      >
                        <div className="text-xs text-gray-500 font-mono w-24 shrink-0 pt-0.5">
                          {log.start_time.slice(0, 5)} – {log.end_time.slice(0, 5)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800">{log.activity}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {scoreStars(log.productivity_score)}
                            <span className="text-xs text-gray-400">{log.duration_hours} hrs</span>
                          </div>
                        </div>
                        {user?.role === 'INTERN' && (
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                            aria-label="Delete log entry"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  )
}
