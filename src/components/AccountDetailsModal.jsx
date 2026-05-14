import React, { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, ShieldCheck, User, Mail, Phone, Calendar, MapPin, CheckCircle2, AlertCircle } from 'lucide-react'
import supabase from '../supabase'

function AccountDetailsModal({ fullUser, onClose, onChanged, onLogout, themeStyle }) {
  const [activeTab, setActiveTab] = useState('profile') // 'profile' or 'security'
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState(null)
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
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-0 shadow-[var(--shadow)] relative max-h-[90vh] overflow-hidden text-[var(--text)] flex flex-col">
        
        {/* Header */}
        <div className="p-8 pb-4 flex items-center justify-between border-b border-[var(--border)]">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-[var(--accent)] grid place-items-center shadow-lg shadow-[var(--accent)]/20">
              <User size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">Account Center</h2>
              <p className="text-[var(--muted)] text-xs">Manage your personal business profile</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--soft)] transition text-[var(--muted)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-8 gap-6 border-b border-[var(--border)] bg-[var(--surface)]">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`py-4 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'profile' ? 'text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
          >
            Profile Info
            {activeTab === 'profile' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--accent)] rounded-t-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`py-4 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'security' ? 'text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
          >
            Security & Password
            {activeTab === 'security' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--accent)] rounded-t-full"></div>}
          </button>
        </div>

        {/* Content Area */}
        <div className="p-8 overflow-y-auto flex-1">
          {activeTab === 'profile' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                  <div className="flex items-center gap-2 text-[var(--muted)] text-[10px] font-bold uppercase tracking-widest mb-1">
                    <User size={12} /> Full Name
                  </div>
                  <p className="font-semibold text-[var(--text)]">{name}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                  <div className="flex items-center gap-2 text-[var(--muted)] text-[10px] font-bold uppercase tracking-widest mb-1">
                    <Mail size={12} /> Email Address
                  </div>
                  <p className="font-semibold text-[var(--text)]">{email}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                  <div className="flex items-center gap-2 text-[var(--muted)] text-[10px] font-bold uppercase tracking-widest mb-1">
                    <ShieldCheck size={12} /> Designation
                  </div>
                  <p className="font-semibold text-[var(--accent)]">{fullUser?.designation || 'Staff Member'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                  <div className="flex items-center gap-2 text-[var(--muted)] text-[10px] font-bold uppercase tracking-widest mb-1">
                    <Phone size={12} /> Phone Number
                  </div>
                  <p className="font-semibold text-[var(--text)]">{fullUser?.phone || 'Not Provided'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                  <div className="flex items-center gap-2 text-[var(--muted)] text-[10px] font-bold uppercase tracking-widest mb-1">
                    <Calendar size={12} /> Member Since
                  </div>
                  <p className="font-semibold text-[var(--text)]">
                    {fullUser?.createdAt ? new Date(fullUser.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                <div className="flex items-center gap-2 text-[var(--muted)] text-[10px] font-bold uppercase tracking-widest mb-1">
                  <MapPin size={12} /> Work Address / Location
                </div>
                <p className="font-semibold text-[var(--text)] text-sm leading-relaxed">{fullUser?.address || 'No office address assigned.'}</p>
              </div>
              
              <div className="pt-4 flex gap-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] font-bold text-sm text-[var(--text)] hover:bg-[var(--soft)] transition"
                >
                  Close Profile
                </button>
                <button
                  onClick={onLogout}
                  className="flex-1 px-6 py-4 rounded-xl border border-red-500/20 bg-red-500/5 font-bold text-sm text-red-500 hover:bg-red-500/10 transition"
                >
                  Log Out Session
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submitChangePassword} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-4">
                <div className="relative">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition text-[var(--text)]"
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition text-[var(--text)]"
                      required
                      minLength={6}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {message && (
                <div className={`flex items-center gap-3 p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300 ${
                  status === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-red-500/10 border-red-500/20 text-red-600'
                }`}>
                  {status === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <p className="text-sm font-medium">{message}</p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="flex-1 px-6 py-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] font-bold text-sm text-[var(--text)] hover:bg-[var(--soft)] transition"
                >
                  Back to Profile
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] bg-[var(--accent)] px-6 py-4 rounded-xl font-bold text-sm text-white shadow-lg shadow-[var(--accent)]/20 hover:brightness-95 active:scale-[0.98] transition disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default AccountDetailsModal