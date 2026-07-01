import client from './client'
import type {
  DailyDebrief,
  DebriefStats,
  Feedback,
  HourlyLog,
  PaginatedResponse,
  ProductivitySummary,
  User,
  UserBasic,
} from '../types'

// ─── Debriefs ─────────────────────────────────────────────────────────────────
export const debriefApi = {
  list: (params?: { intern_id?: number; start_date?: string; end_date?: string; page?: number }) =>
    client.get<PaginatedResponse<DailyDebrief>>('/debriefs/', { params }),

  get: (id: number) => client.get<DailyDebrief>(`/debriefs/${id}/`),

  today: () => client.get<DailyDebrief>('/debriefs/today/'),

  create: (data: Omit<DailyDebrief, 'id' | 'intern' | 'intern_detail' | 'feedback' | 'created_at' | 'updated_at'>) =>
    client.post<DailyDebrief>('/debriefs/', data),

  update: (id: number, data: Partial<DailyDebrief>) =>
    client.patch<DailyDebrief>(`/debriefs/${id}/`, data),

  delete: (id: number) => client.delete(`/debriefs/${id}/`),

  stats: (params?: { intern_id?: number }) =>
    client.get<DebriefStats>('/debriefs/stats/', { params }),
}

// ─── Hourly Logs ──────────────────────────────────────────────────────────────
export const logApi = {
  list: (params?: { intern_id?: number; start_date?: string; end_date?: string; page?: number }) =>
    client.get<PaginatedResponse<HourlyLog>>('/hourly-logs/', { params }),

  create: (data: Omit<HourlyLog, 'id' | 'intern' | 'intern_detail' | 'duration_hours' | 'created_at'>) =>
    client.post<HourlyLog>('/hourly-logs/', data),

  update: (id: number, data: Partial<HourlyLog>) =>
    client.patch<HourlyLog>(`/hourly-logs/${id}/`, data),

  delete: (id: number) => client.delete(`/hourly-logs/${id}/`),

  productivitySummary: (params?: { intern_id?: number }) =>
    client.get<ProductivitySummary[]>('/hourly-logs/productivity-summary/', { params }),
}

// ─── Feedback ─────────────────────────────────────────────────────────────────
export const feedbackApi = {
  list: (params?: { debrief_id?: number }) =>
    client.get<PaginatedResponse<Feedback>>('/feedback/', { params }),

  create: (data: { debrief: number; content: string }) =>
    client.post<Feedback>('/feedback/', data),

  update: (id: number, data: { content: string }) =>
    client.patch<Feedback>(`/feedback/${id}/`, data),
}

// ─── Users ────────────────────────────────────────────────────────────────────
export const userApi = {
  list: (params?: { page?: number }) =>
    client.get<PaginatedResponse<User>>('/users/', { params }),

  get: (id: number) => client.get<User>(`/users/${id}/`),

  create: (data: {
    username: string
    email: string
    password: string
    password_confirm: string
    first_name?: string
    last_name?: string
    role: string
    supervisor?: number | null
  }) => client.post<User>('/users/', data),

  update: (id: number, data: Partial<User>) =>
    client.patch<User>(`/users/${id}/`, data),

  delete: (id: number) => client.delete(`/users/${id}/`),

  supervisors: () => client.get<UserBasic[]>('/users/supervisors/'),

  interns: () => client.get<UserBasic[]>('/users/interns/'),
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportApi = {
  downloadExcel: (start_date: string, end_date: string, intern_id?: number) => {
    const params = new URLSearchParams({ start_date, end_date })
    if (intern_id) params.append('intern_id', String(intern_id))
    const token = localStorage.getItem('access_token')
    const url = `/api/reports/excel/?${params.toString()}`
    // Use anchor download
    const a = document.createElement('a')
    a.href = url
    a.setAttribute('download', `DebriefPro_${start_date}_${end_date}.xlsx`)
    // Attach auth via fetch then blob
    return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob)
        a.href = blobUrl
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(blobUrl)
      })
  },

  downloadPdf: (start_date: string, end_date: string, intern_id?: number) => {
    const params = new URLSearchParams({ start_date, end_date })
    if (intern_id) params.append('intern_id', String(intern_id))
    const token = localStorage.getItem('access_token')
    const url = `/api/reports/pdf/?${params.toString()}`
    return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.setAttribute('download', `DebriefPro_${start_date}_${end_date}.pdf`)
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(blobUrl)
      })
  },
}
