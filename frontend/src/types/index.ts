export type Role = 'ADMIN' | 'SUPERVISOR' | 'INTERN'

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: Role
  supervisor: number | null
  supervisor_detail?: UserBasic | null
  is_active: boolean
  date_joined: string
}

export interface UserBasic {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  role: Role
}

export interface Feedback {
  id: number
  debrief: number
  supervisor: number
  supervisor_detail: UserBasic | null
  content: string
  created_at: string
}

export interface DailyDebrief {
  id: number
  intern: number
  intern_detail: UserBasic
  date: string
  yesterday_task: string
  progress_made: string
  challenges: string
  today_task: string
  notes?: string
  feedback?: Feedback | null
  created_at: string
  updated_at: string
}

export interface HourlyLog {
  id: number
  intern: number
  intern_detail: UserBasic
  date: string
  start_time: string
  end_time: string
  activity: string
  productivity_score: number
  duration_hours: number
  created_at: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface DebriefStats {
  total_debriefs: number
  debriefs_with_feedback: number
  debriefs_last_7_days: number
}

export interface ProductivitySummary {
  date: string
  avg_score: number
  log_count: number
}

export interface AuthTokens {
  access: string
  refresh: string
  user: User
}
