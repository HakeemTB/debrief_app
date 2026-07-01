/**
 * Tests for DailyDebrief page: form validation and display logic.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import DailyDebriefPage from '../pages/DailyDebrief'
import * as authApiModule from '../api/auth'
import * as debriefApiModule from '../api/debriefs'
import type { PaginatedResponse, DailyDebrief } from '../types'

const mockInternUser = {
  id: 1,
  username: 'intern1',
  email: 'intern@test.com',
  first_name: 'Test',
  last_name: 'Intern',
  role: 'INTERN' as const,
  supervisor: null,
  is_active: true,
  date_joined: new Date().toISOString(),
}

const emptyPaginated: PaginatedResponse<DailyDebrief> = {
  count: 0, next: null, previous: null, results: [],
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/debrief']}>
      <AuthProvider>
        <Routes>
          <Route path="/debrief" element={<DailyDebriefPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('DailyDebrief page', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'fake-token')
    vi.spyOn(authApiModule.authApi, 'me').mockResolvedValue({ data: mockInternUser } as never)
    vi.spyOn(debriefApiModule.debriefApi, 'list').mockResolvedValue({ data: emptyPaginated } as never)
    vi.spyOn(debriefApiModule.debriefApi, 'today').mockRejectedValue({ response: { status: 404 } })
  })

  it('renders the page heading', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Daily Debrief')).toBeInTheDocument()
    })
  })

  it('shows the new debrief button', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('New Debrief')).toBeInTheDocument()
    })
  })

  it('opens form on button click', async () => {
    renderPage()
    await waitFor(() => screen.getByText('New Debrief'))

    const user = userEvent.setup()
    await user.click(screen.getByText('New Debrief'))

    expect(screen.getByText("Submit Today's Debrief")).toBeInTheDocument()
  })

  it('shows validation: required fields', async () => {
    vi.spyOn(debriefApiModule.debriefApi, 'create').mockRejectedValue({
      response: { data: { date: ['You have already submitted a debrief for this date.'] } },
    })

    renderPage()
    await waitFor(() => screen.getByText('New Debrief'))

    const user = userEvent.setup()
    await user.click(screen.getByText('New Debrief'))

    // Fill in form
    await user.type(screen.getByLabelText(/What did you work on yesterday/i), 'Worked on feature X')
    await user.type(screen.getByLabelText(/Progress Made/i), 'Good progress')
    await user.type(screen.getByLabelText(/Challenges Faced/i), 'None')
    await user.type(screen.getByLabelText(/Today's Plan/i), 'Continue work')

    await user.click(screen.getByText('Submit Debrief'))

    await waitFor(() => {
      expect(screen.getByText(/already submitted/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no debriefs', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/No debriefs yet/i)).toBeInTheDocument()
    })
  })
})
