import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { reportApi, userApi } from '../api/debriefs'
import Card from '../components/Card'
import Modal from '../components/Modal'
import type { User, UserBasic } from '../types'

const emptyUserForm = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  password_confirm: '',
  role: 'INTERN' as string,
  supervisor: null as number | null,
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([])
  const [supervisors, setSupervisors] = useState<UserBasic[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState(emptyUserForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<Record<string, string>>({})

  // Reports
  const [reportStart, setReportStart] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  )
  const [reportEnd, setReportEnd] = useState(new Date().toISOString().split('T')[0])
  const [downloading, setDownloading] = useState<'excel' | 'pdf' | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersRes, supRes] = await Promise.all([
        userApi.list(),
        userApi.supervisors(),
      ])
      setUsers(usersRes.data.results)
      setSupervisors(supRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const openCreate = () => {
    setEditUser(null)
    setForm(emptyUserForm)
    setFormError({})
    setModalOpen(true)
  }

  const openEdit = (u: User) => {
    setEditUser(u)
    setForm({
      username: u.username,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      password: '',
      password_confirm: '',
      role: u.role,
      supervisor: u.supervisor,
    })
    setFormError({})
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError({})
    setSubmitting(true)
    try {
      if (editUser) {
        const payload: Record<string, unknown> = {
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          role: form.role,
          supervisor: form.supervisor,
        }
        await userApi.update(editUser.id, payload as Partial<User>)
      } else {
        await userApi.create({
          ...form,
          supervisor: form.supervisor ?? null,
        })
      }
      setModalOpen(false)
      loadData()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, string[]> } }
      const data = axiosErr.response?.data
      if (data) {
        const flat: Record<string, string> = {}
        Object.entries(data).forEach(([k, v]) => { flat[k] = Array.isArray(v) ? v[0] : String(v) })
        setFormError(flat)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return
    await userApi.delete(id)
    loadData()
  }

  const handleDownload = async (type: 'excel' | 'pdf') => {
    setDownloading(type)
    try {
      if (type === 'excel') await reportApi.downloadExcel(reportStart, reportEnd)
      else await reportApi.downloadPdf(reportStart, reportEnd)
    } finally {
      setDownloading(null)
    }
  }

  const roleColors: Record<string, string> = {
    ADMIN: 'badge-admin',
    SUPERVISOR: 'badge-supervisor',
    INTERN: 'badge-intern',
  }

  const fieldErr = (name: string) =>
    formError[name] ? <p className="mt-1 text-xs text-red-600">{formError[name]}</p> : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-sm text-gray-500">Manage users and generate reports.</p>
      </div>

      {/* Reports section */}
      <Card title="Export Reports">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="rep-start" className="label">Start Date</label>
            <input
              id="rep-start"
              type="date"
              className="input-field"
              value={reportStart}
              onChange={(e) => setReportStart(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="rep-end" className="label">End Date</label>
            <input
              id="rep-end"
              type="date"
              className="input-field"
              value={reportEnd}
              onChange={(e) => setReportEnd(e.target.value)}
            />
          </div>
          <button
            className="btn-primary"
            disabled={downloading === 'excel'}
            onClick={() => handleDownload('excel')}
          >
            {downloading === 'excel' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
            Download Excel
          </button>
          <button
            className="btn-secondary"
            disabled={downloading === 'pdf'}
            onClick={() => handleDownload('pdf')}
          >
            {downloading === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            Download PDF
          </button>
        </div>
      </Card>

      {/* User management */}
      <Card
        title={`Users (${users.length})`}
        action={
          <button className="btn-primary text-xs py-1.5 px-3" onClick={openCreate}>
            <Plus size={14} />
            Add User
          </button>
        }
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-700" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="pb-2 font-medium text-gray-500 pr-4">Name</th>
                  <th className="pb-2 font-medium text-gray-500 pr-4">Username</th>
                  <th className="pb-2 font-medium text-gray-500 pr-4">Email</th>
                  <th className="pb-2 font-medium text-gray-500 pr-4">Role</th>
                  <th className="pb-2 font-medium text-gray-500 pr-4">Supervisor</th>
                  <th className="pb-2 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 pr-4 font-medium text-gray-900">
                      {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600">{u.username}</td>
                    <td className="py-2.5 pr-4 text-gray-600 truncate max-w-[180px]">{u.email}</td>
                    <td className="py-2.5 pr-4">
                      <span className={roleColors[u.role]}>{u.role}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500">
                      {u.supervisor_detail
                        ? `${u.supervisor_detail.first_name || ''} ${u.supervisor_detail.last_name || u.supervisor_detail.username}`
                        : '—'}
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 text-gray-400 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                          aria-label={`Edit ${u.username}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.username)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label={`Delete ${u.username}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* User form modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editUser ? `Edit User: ${editUser.username}` : 'Add New User'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fn" className="label">First Name</label>
              <input id="fn" type="text" className="input-field" value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              {fieldErr('first_name')}
            </div>
            <div>
              <label htmlFor="ln" className="label">Last Name</label>
              <input id="ln" type="text" className="input-field" value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              {fieldErr('last_name')}
            </div>
          </div>

          {!editUser && (
            <div>
              <label htmlFor="uname" className="label">Username *</label>
              <input id="uname" type="text" required className="input-field" value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })} />
              {fieldErr('username')}
            </div>
          )}

          <div>
            <label htmlFor="email" className="label">Email *</label>
            <input id="email" type="email" required className="input-field" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {fieldErr('email')}
          </div>

          <div>
            <label htmlFor="role" className="label">Role *</label>
            <select id="role" className="input-field" value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="INTERN">Intern</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {form.role === 'INTERN' && (
            <div>
              <label htmlFor="supervisor" className="label">Supervisor</label>
              <select
                id="supervisor"
                className="input-field"
                value={form.supervisor ?? ''}
                onChange={(e) => setForm({ ...form, supervisor: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">— None —</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name && s.last_name ? `${s.first_name} ${s.last_name}` : s.username}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!editUser && (
            <>
              <div>
                <label htmlFor="pw" className="label">Password *</label>
                <input id="pw" type="password" required minLength={8} className="input-field" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
                {fieldErr('password')}
              </div>
              <div>
                <label htmlFor="pwc" className="label">Confirm Password *</label>
                <input id="pwc" type="password" required className="input-field" value={form.password_confirm}
                  onChange={(e) => setForm({ ...form, password_confirm: e.target.value })} />
                {fieldErr('password_confirm')}
              </div>
            </>
          )}

          {formError.non_field && (
            <p className="text-sm text-red-600">{formError.non_field}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
              {submitting ? 'Saving…' : editUser ? 'Save Changes' : 'Create User'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              <X size={16} /> Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
