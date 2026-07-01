/**
 * Tests for AuthContext: login, logout, session restore.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext'
import * as authApiModule from '../api/auth'

// Utility to render inside providers
function TestConsumer() {
  const { user, login, logout } = useAuth()
  return (
    <div>
      {user ? (
        <>
          <p data-testid="username">{user.username}</p>
          <p data-testid="role">{user.role}</p>
          <button onClick={() => logout()}>Logout</button>
        </>
      ) : (
        <>
          <p data-testid="no-user">Not logged in</p>
          <button onClick={() => login('intern1', 'Test@1234')}>Login</button>
        </>
      )}
    </div>
  )
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('shows "Not logged in" when no token present', async () => {
    vi.spyOn(authApiModule.authApi, 'me').mockRejectedValue(new Error('Unauthorized'))
    renderWithProviders(<TestConsumer />)
    await waitFor(() => {
      expect(screen.getByTestId('no-user')).toBeInTheDocument()
    })
  })

  it('logs in and stores user', async () => {
    const mockUser = {
      id: 1,
      username: 'intern1',
      email: 'intern1@test.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'INTERN' as const,
      supervisor: null,
      is_active: true,
      date_joined: new Date().toISOString(),
    }
    vi.spyOn(authApiModule.authApi, 'me').mockRejectedValue(new Error('No token'))
    vi.spyOn(authApiModule.authApi, 'login').mockResolvedValue({
      data: { access: 'fake-access', refresh: 'fake-refresh', user: mockUser },
    } as ReturnType<typeof authApiModule.authApi.login> extends Promise<infer T> ? { data: T } : never)

    renderWithProviders(<TestConsumer />)

    await waitFor(() => screen.getByTestId('no-user'))

    const user = userEvent.setup()
    await user.click(screen.getByText('Login'))

    await waitFor(() => {
      expect(screen.getByTestId('username')).toHaveTextContent('intern1')
      expect(screen.getByTestId('role')).toHaveTextContent('INTERN')
    })
  })

  it('restores session from localStorage token', async () => {
    localStorage.setItem('access_token', 'existing-token')
    const mockUser = {
      id: 2,
      username: 'supervisor1',
      email: 'sup@test.com',
      first_name: 'Sup',
      last_name: 'One',
      role: 'SUPERVISOR' as const,
      supervisor: null,
      is_active: true,
      date_joined: new Date().toISOString(),
    }
    vi.spyOn(authApiModule.authApi, 'me').mockResolvedValue({
      data: mockUser,
    } as ReturnType<typeof authApiModule.authApi.me> extends Promise<infer T> ? { data: T } : never)

    renderWithProviders(<TestConsumer />)

    await waitFor(() => {
      expect(screen.getByTestId('username')).toHaveTextContent('supervisor1')
      expect(screen.getByTestId('role')).toHaveTextContent('SUPERVISOR')
    })
  })

  it('clears user on logout', async () => {
    localStorage.setItem('access_token', 'existing-token')
    localStorage.setItem('refresh_token', 'refresh')
    const mockUser = {
      id: 3,
      username: 'admin1',
      email: 'admin@test.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'ADMIN' as const,
      supervisor: null,
      is_active: true,
      date_joined: new Date().toISOString(),
    }
    vi.spyOn(authApiModule.authApi, 'me').mockResolvedValue({ data: mockUser } as ReturnType<typeof authApiModule.authApi.me> extends Promise<infer T> ? { data: T } : never)
    vi.spyOn(authApiModule.authApi, 'logout').mockResolvedValue({ data: { detail: 'ok' } } as never)

    renderWithProviders(<TestConsumer />)
    await waitFor(() => screen.getByTestId('username'))

    const user = userEvent.setup()
    await user.click(screen.getByText('Logout'))

    await waitFor(() => {
      expect(screen.getByTestId('no-user')).toBeInTheDocument()
    })
  })
})
