import { BarChart2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
  })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    try {
      await authApi.register(form)
      // Auto-login after registration
      await login(form.username, form.password)
      navigate('/dashboard')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, string[]> } }
      const data = axiosErr.response?.data
      if (data) {
        const flat: Record<string, string> = {}
        Object.entries(data).forEach(([k, v]) => {
          flat[k] = Array.isArray(v) ? v[0] : String(v)
        })
        setErrors(flat)
      } else {
        setErrors({ non_field: 'Registration failed. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  const field = (name: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input
        id={name}
        type={type}
        className="input-field"
        placeholder={placeholder || label}
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      />
      {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name]}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center gap-2 justify-center mb-6">
          <BarChart2 className="text-brand-700" size={28} />
          <span className="text-xl font-bold text-brand-900">DebriefPro</span>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-1">Create your account</h1>
        <p className="text-sm text-gray-500 mb-6">Register as an intern to get started.</p>

        {errors.non_field && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {errors.non_field}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {field('first_name', 'First Name', 'text', 'First')}
            {field('last_name', 'Last Name', 'text', 'Last')}
          </div>
          {field('username', 'Username', 'text', 'Choose a username')}
          {field('email', 'Email', 'email', 'you@example.com')}

          <div>
            <label htmlFor="password" className="label">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="password_confirm" className="label">Confirm Password</label>
            <input
              id="password_confirm"
              type="password"
              className="input-field"
              placeholder="Repeat password"
              value={form.password_confirm}
              onChange={(e) => setForm({ ...form, password_confirm: e.target.value })}
            />
            {errors.password_confirm && (
              <p className="mt-1 text-xs text-red-600">{errors.password_confirm}</p>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-700 hover:text-brand-900">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
