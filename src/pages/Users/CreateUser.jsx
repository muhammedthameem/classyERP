import React, { useState, useEffect, useRef } from 'react'
import { Search, ShieldCheck, Eye } from 'lucide-react'

function CreateUserPage({ themeStyle, setCurrentPage, showGlobalToast, users, setUsers, designations, setDesignations, currentUser }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [designation, setDesignation] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showRepeatPassword, setShowRepeatPassword] = useState(false)
  const [showDesignationDropdown, setShowDesignationDropdown] = useState(false)
  const [designationSearch, setDesignationSearch] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (currentUser?.role !== 'Admin') {
      if (showGlobalToast) showGlobalToast('Access Denied', 'Only Admins can create new users.')
      return
    }
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      if (showGlobalToast) showGlobalToast('Error', 'A user with this email already exists.')
      return
    }
    if (password !== repeatPassword) {
      if (showGlobalToast) showGlobalToast('Error', 'Passwords do not match.')
      return
    }
    const newUser = {
      id: Date.now(),
      name,
      email,
      phone,
      address,
      designation,
      password, // Note: For a real production app, this should be hashed on the server.
      createdAt: new Date().toISOString()
    }
    setUsers([...users, newUser])
    if (showGlobalToast) showGlobalToast('Success', 'User created successfully.')
    setCurrentPage('view-users')
  }

  return (
    <div style={themeStyle} className="relative">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Create User</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Add a new team member to the system</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 shadow-[var(--shadow)] backdrop-blur">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
            <ShieldCheck size={20} /> User Details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-[var(--text)]">User Name</span>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[var(--text)]">Email</span>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[var(--text)]">Phone</span>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </label>
            <div className="relative block">
              <span className="text-sm font-medium text-[var(--text)]">Designation</span>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                type="text"
                value={designation}
                onChange={(e) => {
                  setDesignation(e.target.value)
                  setDesignationSearch(e.target.value)
                  setShowDesignationDropdown(true)
                }}
                onFocus={() => setShowDesignationDropdown(true)}
                onBlur={() => setTimeout(() => setShowDesignationDropdown(false), 200)}
                placeholder="Search or add designation..."
                required
              />
              {showDesignationDropdown && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-lg">
                  {(designations || [])
                    .filter(d => d.toLowerCase().includes(designationSearch.toLowerCase()))
                    .map((d) => (
                      <button
                        key={d}
                        className="w-full px-4 py-2 text-left text-sm text-[var(--text)] transition hover:bg-[var(--soft)]"
                        onClick={() => {
                          setDesignation(d)
                          setDesignationSearch(d)
                          setShowDesignationDropdown(false)
                        }}
                        type="button"
                      >
                        {d}
                      </button>
                    ))}
                  {designationSearch && !designations.some(d => d.toLowerCase() === designationSearch.toLowerCase()) && (
                    <button
                      className="w-full px-4 py-2 text-left text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--soft)]"
                      onClick={() => {
                        const newDesignation = designationSearch.trim()
                        if (newDesignation && !designations.includes(newDesignation)) {
                          setDesignations([...designations, newDesignation])
                          setDesignation(newDesignation)
                          setDesignationSearch(newDesignation)
                          setShowDesignationDropdown(false)
                        }
                      }}
                      type="button"
                    >
                      + Add "{designationSearch}"
                    </button>
                  )}
                </div>
              )}
            </div>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-[var(--text)]">Address</span>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </label>
            <label className="block relative">
              <span className="text-sm font-medium text-[var(--text)]">Create Password</span>
              <div className="relative mt-2">
                <input
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 pr-12 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] p-1 rounded-md transition"
                >
                  <Eye size={18} className={!showPassword ? 'opacity-50' : ''} />
                </button>
              </div>
            </label>
            <label className="block relative">
              <span className="text-sm font-medium text-[var(--text)]">Repeat Password</span>
              <div className="relative mt-2">
                <input
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 pr-12 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                  type={showRepeatPassword ? 'text' : 'password'}
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] p-1 rounded-md transition"
                >
                  <Eye size={18} className={!showRepeatPassword ? 'opacity-50' : ''} />
                </button>
              </div>
            </label>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <button
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-3 font-semibold text-[var(--text)] transition hover:bg-[var(--soft)]"
            type="button"
            onClick={() => setCurrentPage('view-users')}
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white shadow-lg shadow-black/10 transition hover:brightness-95"
            type="submit"
          >
            Create User
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateUserPage;
