import client from './client'
import type { AuthTokens, User } from '../types'

export const authApi = {
  login: (username: string, password: string) =>
    client.post<AuthTokens>('/auth/login/', { username, password }),

  register: (data: {
    username: string
    email: string
    password: string
    password_confirm: string
    first_name?: string
    last_name?: string
    role?: string
    supervisor?: number | null
  }) => client.post<User>('/auth/register/', data),

  logout: (refresh: string) =>
    client.post('/auth/logout/', { refresh }),

  me: () => client.get<User>('/auth/me/'),
}
