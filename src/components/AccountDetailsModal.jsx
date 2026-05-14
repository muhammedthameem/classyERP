import React, { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, ShieldCheck, User, Mail, Phone, Calendar, MapPin, CheckCircle2, AlertCircle } from 'lucide-react'
import supabase from '../supabase'

function AccountDetailsModal({ fullUser, onClose, onChanged, onLogout, themeStyle }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState(null) // 'success' or 'error'
  const [isLoading, setIsLoading] = useState(false)

  const email = fullUser?.email || ''
  const name = fullUser?.name || 'User'

  const submitChangePassword = async (event) => {
    event.preventDefault()
    setMessage('')
    setStatus(null)
    setIsLoading(true)

    try {
      const { data: userData, error: fetchError } = await supabase
        .from('erp_users')
        .select('*')
        .eq('id', email)
        .single();

      if (fetchError || !userData) {
        setMessage('User profile not found.')
        setStatus('error')
        setIsLoading(false)
        return
      }

      if (currentPassword !== userData.data.password) {
        setMessage('Current password is incorrect.')
        setStatus('error')
        setIsLoading(false)
        return
      }

      if (newPassword.length < 6) {
        setMessage('New password must be 6+ characters.')
        setStatus('error')
        setIsLoading(false)
        return
      }

      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      if (authError) throw authError;

      const updatedProfile = { ...userData.data, password: newPassword };
      await supabase.from('erp_users').upsert([{ id: email, data: updatedProfile }]);
      
      setMessage('Password updated! Logging out...')
      setStatus('success')
      setTimeout(() => onChanged(), 2000)

    } catch (error) {
      setMessage(error.message || 'Something went wrong.')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-[#1a1412]/80 px-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[#2a211d] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto text-white">
        
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#e6c9b8] to-[#9b4d3a] grid place-items-center shadow-lg">
            <User size={32} className="text-[#2a211d]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Security Settings</h2>
            <p className="text-[#e6c9b8]/60 text-sm">Update your profile and access keys</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2 text-[#e6c9b8] text-xs font-bold uppercase tracking-widest mb-2">
              <Mail size={14} /> Email
            </div>
            <p className="font-medium text-stone-200">{email}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2 text-[#e6c9b8] text-xs font-bold uppercase tracking-widest mb-2">
              <ShieldCheck size={14} /> Role
            </div>
            <p className="font-medium text-stone-200">{fullUser?.designation || 'Staff'}</p>
          </div>
        </div>

        <form onSubmit={submitChangePassword} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative">
              <label className="text-xs font-bold text-[#e6c9b8] uppercase tracking-widest mb-2 block">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#e6c9b8] transition text-stone-100"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-[#e6c9b8]"
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="relative">
              <label className="text-xs font-bold text-[#e6c9b8] uppercase tracking-widest mb-2 block">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#e6c9b8] transition text-stone-100"
                  required
                  minLength={6}
                />
                <button 
                  type="button" 
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-[#e6c9b8]"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {message && (
            <div className={`flex items-center gap-3 p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300 ${
              status === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {status === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <p className="text-sm font-medium">{message}</p>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-xl border border-white/10 font-bold text-sm hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-[2] bg-gradient-to-r from-[#e6c9b8] to-[#9b4d3a] px-6 py-4 rounded-xl font-bold text-sm text-[#2a211d] shadow-lg shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AccountDetailsModal