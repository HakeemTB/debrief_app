import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AdminPanel from './pages/AdminPanel'
import DailyDebriefPage from './pages/DailyDebrief'
import Dashboard from './pages/Dashboard'
import HourlyLogs from './pages/HourlyLogs'
import InternDetail from './pages/InternDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import Layout from './components/Layout'

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-700" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" replace />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route
          path="debrief"
          element={
            <ProtectedRoute roles={['INTERN']}>
              <DailyDebriefPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hourly-logs"
          element={
            <ProtectedRoute roles={['INTERN']}>
              <HourlyLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="intern/:internId"
          element={
            <ProtectedRoute roles={['SUPERVISOR', 'ADMIN']}>
              <InternDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
