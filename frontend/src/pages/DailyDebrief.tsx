import { BookOpen, ChevronLeft, ChevronRight, Loader2, Pencil, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { debriefApi } from '../api/debriefs'
import Card from '../components/Card'
import { useAuth } from '../context/AuthContext'
import type { DailyDebrief } from '../types'

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  yesterday_task: '',
  progress_made: '',
  challenges: '',
  today_task: '',
  notes: '',
}

export default function DailyDebriefPage() {
  const { user } = useAuth()
  const [debriefs, setDebriefs] = useState<DailyDebrief[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)

  const PAGE_SIZE = 5

  const loadDebriefs = async (p = 1) => {
    setLoading(true)
    try {
      const res = await debriefApi.list({ page: p })
      setDebriefs(res.data.results)
      setTotal(res.data.count)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDebriefs(page)
  }, [page])

  // Check if today's debrief already exists
  useEffect(() => {
    debriefApi.today()
      .then((res) => {
        setEditingId(res.data.id)
        setForm({
          date: res.data.date,
          yesterday_task: res.data.yesterday_task,
          progress_made: res.data.progress_made,
          challenges: res.data.challenges,
          today_task: res.data.today_task,
          notes: res.data.notes || '',
        })
      })
      .catch(() => {
        setEditingId(null)
        setForm({ ...emptyForm, date: new Date().toISOString().split('T')[0] })
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      if (editingId) {
        await debriefApi.update(editingId, form)
        setSuccess('Debrief updated successfully.')
      } else {
        const res = await debriefApi.create(form)
        setEditingId(res.data.id)
        setSuccess('Debrief submitted successfully.')
      }
      setShowForm(false)
      loadDebriefs(1)
      setPage(1)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, string[]> } }
      const data = axiosErr.response?.data
      if (data?.date) setError(data.date[0])
      else setError('Failed to save debrief. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const textArea = (
    name: keyof typeof form,
    label: string,
    placeholder: string,
    required = true,
  ) => (
    <div>
      <label htmlFor={name} className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        id={name}
        rows={3}
        required={required}
        className="input-field resize-none"
        placeholder={placeholder}
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      />
    </div>
  )

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Debrief</h1>
          <p className="text-sm text-gray-500">
            Track your daily progress, challenges, and goals.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {editingId ? <Pencil size={16} /> : <Plus size={16} />}
          {editingId ? "Edit Today's Debrief" : "New Debrief"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <Card title={editingId ? "Edit Debrief" : "Submit Today's Debrief"}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="date" className="label">Date <span className="text-red-500">*</span></label>
              <input
                id="date"
                type="date"
                required
                max={todayStr}
                className="input-field"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            {textArea('yesterday_task', "What did you work on yesterday?", "Describe your tasks from yesterday…")}
            {textArea('progress_made', 'Progress Made', 'Summarise the progress you made…')}
            {textArea('challenges', 'Challenges Faced', 'Describe any blockers or challenges…')}
            {textArea('today_task', "Today's Plan", "What will you work on today?")}
            {textArea('notes', 'Additional Notes', 'Any other notes (optional)…', false)}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
                {submitting ? 'Saving…' : editingId ? 'Update Debrief' : 'Submit Debrief'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Success message */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700" role="status">
          {success}
        </div>
      )}

      {/* Debrief history */}
      <Card title={`Debrief History (${total})`}>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-700" />
          </div>
        ) : debriefs.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No debriefs yet. Submit your first debrief above!
          </p>
        ) : (
          <div className="space-y-4">
            {debriefs.map((d) => (
              <div
                key={d.id}
                className="border border-gray-200 rounded-xl p-4 hover:border-brand-200 hover:bg-brand-50/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-sm font-semibold text-gray-900">
                      {new Date(d.date).toLocaleDateString('en-US', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </span>
                    {d.date === todayStr && (
                      <span className="ml-2 badge bg-brand-100 text-brand-800">Today</span>
                    )}
                  </div>
                  {d.feedback ? (
                    <span className="badge bg-green-100 text-green-800 shrink-0">Reviewed</span>
                  ) : (
                    <span className="badge bg-yellow-100 text-yellow-800 shrink-0">Pending Review</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Yesterday</p>
                    <p className="text-gray-800">{d.yesterday_task}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Progress</p>
                    <p className="text-gray-800">{d.progress_made}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Challenges</p>
                    <p className="text-gray-800">{d.challenges}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Today</p>
                    <p className="text-gray-800">{d.today_task}</p>
                  </div>
                </div>

                {d.feedback && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-purple-700 mb-1">
                      Supervisor Feedback — {d.feedback.supervisor_detail?.first_name} {d.feedback.supervisor_detail?.last_name}
                    </p>
                    <p className="text-sm text-gray-700">{d.feedback.content}</p>
                  </div>
                )}

                {d.date === todayStr && user?.role === 'INTERN' && (
                  <button
                    className="mt-3 btn-secondary text-xs py-1.5"
                    onClick={() => {
                      setEditingId(d.id)
                      setForm({
                        date: d.date,
                        yesterday_task: d.yesterday_task,
                        progress_made: d.progress_made,
                        challenges: d.challenges,
                        today_task: d.today_task,
                        notes: d.notes || '',
                      })
                      setShowForm(true)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  >
                    <Pencil size={12} /> Edit
                  </button>
                )}
              </div>
            ))}

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button
                    className="btn-secondary py-1.5 px-3 text-xs"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button
                    className="btn-secondary py-1.5 px-3 text-xs"
                    disabled={page * PAGE_SIZE >= total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
