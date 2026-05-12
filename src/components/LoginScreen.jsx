import React, { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { orders } from '../utils/constants'

function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const savedEmail = localStorage.getItem('erp_remember_email')
    const savedPassword = localStorage.getItem('erp_remember_password')
    if (savedEmail && savedPassword) {
      setEmail(savedEmail)
      setPassword(savedPassword)
      setRememberMe(true)
    }
  }, [])
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const submitLogin = async (event) => {
    event.preventDefault()
    setMessage('')
    setIsLoading(true)

    if (rememberMe) {
      localStorage.setItem('erp_remember_email', email)
      localStorage.setItem('erp_remember_password', password)
    } else {
      localStorage.removeItem('erp_remember_email')
      localStorage.removeItem('erp_remember_password')
    }

    // Artificial delay for premium feel
    setTimeout(() => {
      const allUsers = JSON.parse(localStorage.getItem('erp_users') || '[]')
      // Fallback if erp_users is empty
      if (allUsers.length === 0 && email === 'admin@classy.com' && password === 'admin123') {
        const admin = {
          id: 'admin',
          name: 'Ayesha',
          email: 'admin@classy.com',
          designation: 'Admin',
          password: 'admin123',
          createdAt: new Date().toISOString()
        }
        localStorage.setItem('erp_users', JSON.stringify([admin]))
        onLogin({ id: 'admin', email, name: 'Ayesha', role: 'Admin' })
        setIsLoading(false)
        return
      }

      const foundUser = allUsers.find(u => u.email === email && u.password === password)

      if (foundUser) {
        onLogin({
          id: foundUser.id,
          email: foundUser.email,
          name: foundUser.name,
          role: foundUser.designation || 'Staff'
        })
      } else {
        setMessage('Invalid email or password.')
      }
      setIsLoading(false)
    }, 800)
  }

  const submitForgotPassword = async (event) => {
    event.preventDefault()
    setMessage('')
    setIsLoading(true)

    setTimeout(() => {
      const allUsers = JSON.parse(localStorage.getItem('erp_users') || '[]')
      const exists = allUsers.some(u => u.email === email) || email === 'admin@classy.com'

      if (exists) {
        setMessage('Password reset request accepted. Please contact the boutique owner to reset access.')
      } else {
        setMessage('No account found for this email.')
      }
      setIsLoading(false)
    }, 800)
  }

  return (
    <section className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <div className="relative hidden overflow-hidden bg-[#2a211d] text-white lg:block">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-70 mix-blend-screen"
          src="https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1300&q=80"
          alt="Designer boutique styling studio"
        />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(39,28,24,0.96),rgba(39,28,24,0.28),rgba(24,54,48,0.82))]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-md bg-white p-1 shadow-sm">
              <img src="/logo-black.png" alt="CB" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-[#e6c9b8]">
                Classy Couture
              </p>
              <h1 className="text-2xl font-semibold">Boutique ERP System</h1>
            </div>
          </div>

          <div className="max-w-2xl">
            <p className="mb-4 w-fit rounded-full border border-white/25 px-4 py-2 text-sm text-[#f3dfcf] backdrop-blur">
              Boutique operations, client fittings, orders, and inventory
            </p>
            <h2 className="text-6xl font-semibold leading-tight">
              Run every fitting, fabric, and final delivery with elegance.
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            {['Bridal', 'Luxury Pret', 'Alterations'].map((item) => (
              <div key={item} className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
                <span className="block text-2xl font-semibold">24</span>
                <span className="text-[#ead8ca]">{item} workflows</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-md bg-white p-1 shadow-sm">
              <img src="/logo-black.png" alt="CB" className="h-full w-full object-contain" />
            </div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#9b4d3a]">
              Classy Couture
            </p>
          </div>

          <div className="rounded-lg border border-[#e0d2c4] bg-white p-8 shadow-[0_24px_80px_rgba(67,47,35,0.12)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9b4d3a]">
              Welcome back
            </p>
            <h2 className="mt-3 text-3xl font-semibold">Sign in to your studio</h2>
            <p className="mt-2 text-sm text-stone-500">
              Manage designer orders, measurements, clients, appointments, and stock.
            </p>

            <form
              className="mt-8 space-y-5"
              onSubmit={mode === 'login' ? submitLogin : submitForgotPassword}
            >
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Email address</span>
                <input
                  className="mt-2 w-full rounded-md border border-[#dfd2c7] bg-[#fbf8f5] px-4 py-3 outline-none transition focus:border-[#9b4d3a] focus:ring-4 focus:ring-[#9b4d3a]/10"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter Email"
                  required
                />
              </label>

              {mode === 'login' && (
                <>
                  <label className="block">
                    <span className="text-sm font-medium text-stone-700">Password</span>
                    <div className="relative mt-2">
                      <input
                        className="w-full rounded-md border border-[#dfd2c7] bg-[#fbf8f5] px-4 py-3 pr-12 outline-none transition focus:border-[#9b4d3a] focus:ring-4 focus:ring-[#9b4d3a]/10"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter Password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#9b4d3a] transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </label>
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 text-stone-600">
                      <input
                        className="h-4 w-4 accent-[#9b4d3a]"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      Remember me
                    </label>
                    <button
                      className="font-semibold text-[#9b4d3a]"
                      onClick={() => {
                        setMode('forgot')
                        setMessage('')
                      }}
                      type="button"
                    >
                      Forgot password?
                    </button>
                  </div>
                </>
              )}

              {message && (
                <p className="rounded-md bg-[#f7f2ec] px-4 py-3 text-sm font-medium text-[#8a3f31]">
                  {message}
                </p>
              )}

              <button
                className="w-full rounded-md bg-[#9b4d3a] px-5 py-3 font-semibold text-white shadow-lg shadow-[#9b4d3a]/25 transition hover:bg-[#823f30]"
                type="submit"
                disabled={isLoading}
              >
                {isLoading
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Login to Dashboard'
                    : 'Send Reset Request'}
              </button>

              {mode === 'forgot' && (
                <button
                  className="w-full rounded-md border border-[#d8c8bc] px-5 py-3 font-semibold text-stone-700"
                  onClick={() => {
                    setMode('login')
                    setMessage('')
                  }}
                  type="button"
                >
                  Back to Login
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LoginScreen;
