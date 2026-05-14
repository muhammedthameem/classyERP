import React, { useState, useEffect, useRef } from 'react'
import supabase from '../supabase'

function AccountDetailsModal({ fullUser, onClose, onChanged, onLogout, themeStyle }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const email = fullUser?.email || ''
  const name = fullUser?.name || 'User'

  const submitChangePassword = async (event) => {
    event.preventDefault()
    setMessage('')
    setIsLoading(true)

    try {
      // 1. Fetch current profile from Supabase
      const { data: userData, error: fetchError } = await supabase
        .from('erp_users')
        .select('*')
        .eq('id', email)
        .single();

      if (fetchError || !userData) {
        setMessage('User profile not found in database.')
        setIsLoading(false)
        return
      }

      // 2. Verify current password
      if (currentPassword !== userData.data.password) {
        setMessage('Current password is incorrect.')
        setIsLoading(false)
        return
      }

      if (newPassword.length < 6) {
        setMessage('New password must be at least 6 characters.')
        setIsLoading(false)
        return
      }

      // 3. Update Supabase Auth Password (The Login Key)
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      if (authError) throw authError;

      // 4. Update Database Password (The Reference)
      const updatedProfile = { ...userData.data, password: newPassword };
      const { error: dbError } = await supabase
        .from('erp_users')
        .upsert([{ id: email, data: updatedProfile }]);
      
      if (dbError) throw dbError;

      setMessage('Password changed successfully. Logging out...')
      setTimeout(() => {
        onChanged()
      }, 1500)

    } catch (error) {
      console.error(error)
      setMessage(error.message || 'Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">

        <button
          className="absolute top-6 right-6 text-[var(--muted)] hover:text-[var(--text)] transition"
          onClick={onClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <h2 className="text-2xl font-bold mb-2">Account Details</h2>

        <p className="text-sm text-[var(--muted)] mb-8">
          Manage your profile and security settings.
        </p>

        <div className="space-y-6">

          <div className="grid gap-4 sm:grid-cols-2">

            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-1">
                Signed in as
              </p>

              <p className="text-lg font-bold text-[var(--text)]">
                {name}
              </p>

              <p className="text-sm text-[var(--muted)]">
                {email}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-1">
                Designation
              </p>

              <p className="text-lg font-bold text-[var(--accent)]">
                {fullUser?.designation || 'Admin'}
              </p>

              <p className="text-sm text-[var(--muted)]">
                Active Staff
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-1">
                Phone Number
              </p>

              <p className="text-base font-bold">
                {fullUser?.phone || 'N/A'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-1">
                Member Since
              </p>

              <p className="text-base font-bold">
                {fullUser?.createdAt
                  ? new Date(fullUser.createdAt).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>

            <div className="sm:col-span-2 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-1">
                Address
              </p>

              <p className="text-sm font-medium">
                {fullUser?.address || 'No address provided.'}
              </p>
            </div>

          </div>

          <form
            onSubmit={submitChangePassword}
            className="space-y-4 border-t border-[var(--border)] pt-6"
          >

            <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-2">
              Change Password
            </p>

            <div className="grid gap-4 sm:grid-cols-2">

              <label className="block">
                <span className="text-xs font-medium text-[var(--muted)]">
                  Current Password
                </span>

                <input
                  className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[var(--muted)]">
                  New Password
                </span>

                <input
                  className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </label>

            </div>

            {message && (
              <p
                className={`text-sm font-medium ${message.includes('successfully')
                    ? 'text-green-600'
                    : 'text-red-600'
                  }`}
              >
                {message}
              </p>
            )}

            <div className="pt-4 flex gap-3">

              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 text-sm font-bold text-[var(--text)] transition hover:bg-[var(--soft)]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-95 disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>

            </div>

          </form>

        </div>
      </div>
    </div>
  )
}

export default AccountDetailsModal