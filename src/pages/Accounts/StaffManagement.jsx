import React, { useState } from 'react'
import { Users, Pencil, Trash2, Search, Plus, Save, X } from 'lucide-react'

function StaffManagementPage({ themeStyle, setCurrentPage, showGlobalToast, staffList = [], setStaffList, saveConfig }) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    designation: '',
    phone: '',
    salary: '',
    overtimeType: 'Hourly',
    overtimeRate: '0'
  })

  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [staffToDelete, setStaffToDelete] = useState(null)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!formData.name || !formData.designation || !formData.phone || !formData.salary) {
      if (showGlobalToast) showGlobalToast('Error', 'Please fill all required fields.')
      return
    }

    let updatedList = [...staffList]

    if (isEditing) {
      updatedList = updatedList.map(s => s.id === formData.id ? { ...formData } : s)
      if (showGlobalToast) showGlobalToast('Success', 'Staff member updated.')
    } else {
      const newStaff = { ...formData, id: Date.now().toString() }
      updatedList.push(newStaff)
      if (showGlobalToast) showGlobalToast('Success', 'Staff member added.')
    }

    setStaffList(updatedList)
    if (saveConfig) saveConfig('staffList', updatedList)

    // Reset form
    setFormData({ id: '', name: '', designation: '', phone: '', salary: '', overtimeType: 'Hourly', overtimeRate: '0' })
    setIsEditing(false)
  }

  const handleEdit = (staff) => {
    setFormData({ ...staff })
    setIsEditing(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = (id) => {
    const staff = staffList.find(s => s.id === id)
    if (staff) {
      setStaffToDelete(staff)
    }
  }

  const handleConfirmDelete = () => {
    if (!staffToDelete) return
    const id = staffToDelete.id
    const updatedList = staffList.filter(s => s.id !== id)
    setStaffList(updatedList)
    if (saveConfig) saveConfig('staffList', updatedList)
    if (showGlobalToast) showGlobalToast('Deleted', 'Staff member removed.')
    if (isEditing && formData.id === id) {
      setFormData({ id: '', name: '', designation: '', phone: '', salary: '', overtimeType: 'Hourly', overtimeRate: '0' })
      setIsEditing(false)
    }
    setStaffToDelete(null)
  }

  const cancelEdit = () => {
    setFormData({ id: '', name: '', designation: '', phone: '', salary: '', overtimeType: 'Hourly', overtimeRate: '0' })
    setIsEditing(false)
  }

  const filteredStaff = staffList.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone.includes(searchQuery)
  )

  return (
    <div style={themeStyle} className="relative">
      {/* Delete Confirmation Modal */}
      {staffToDelete && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-2xl">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <Trash2 size={32} />
            </div>

            <h3 className="text-2xl font-bold text-[var(--text)]">Delete Staff?</h3>
            <p className="mt-3 text-[var(--muted)] leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-[var(--text)]">{staffToDelete.name}</span>? This action cannot be undone.
            </p>
            <div className="mt-8 flex gap-3">
              <button
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3.5 font-bold transition hover:bg-[var(--soft)] cursor-pointer"
                onClick={() => setStaffToDelete(null)}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-xl bg-red-500 py-3.5 font-bold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600 cursor-pointer"
                onClick={handleConfirmDelete}
              >
                Delete Now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center gap-3">
        <Users size={32} className="text-[var(--accent)]" />
        <div>
          <h1 className="text-h1">Staff Management</h1>
          <p className="text-para text-[var(--muted)] mt-1">Manage studio staff, designations, and salaries</p>
        </div>
      </div>

      {/* Add / Edit Form */}
      <form onSubmit={handleSubmit} className="mb-10 space-y-6 max-w-4xl">
        <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
            {isEditing ? <><Pencil size={20} /> Edit Staff Member</> : <><Plus size={20} /> Add New Staff</>}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-[var(--text)]">Full Name <span className="text-red-500">*</span></span>
              <input
                name="name"
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="e.g., Jane Doe"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[var(--text)]">Designation <span className="text-red-500">*</span></span>
              <input
                name="designation"
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                type="text"
                value={formData.designation}
                onChange={handleInputChange}
                required
                placeholder="e.g., Master Tailor"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[var(--text)]">Phone Number <span className="text-red-500">*</span></span>
              <input
                name="phone"
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                required
                placeholder="e.g., +91 9876543210"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[var(--text)]">Weekly Salary (₹) <span className="text-red-500">*</span></span>
              <input
                name="salary"
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                type="number"
                min="0"
                value={formData.salary}
                onChange={handleInputChange}
                required
                placeholder="e.g., 5000"
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            {isEditing && (
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-6 py-3 font-semibold transition hover:bg-[var(--soft)] cursor-pointer"
                onClick={cancelEdit}
              >
                <X size={18} /> Cancel
              </button>
            )}
            <button
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white shadow-lg shadow-[var(--accent)]/25 transition hover:brightness-110 cursor-pointer"
              type="submit"
            >
              <Save size={18} /> {isEditing ? 'Update Staff' : 'Save Staff'}
            </button>
          </div>
        </section>
      </form>

      {/* Data Table */}
      <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur overflow-hidden">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-semibold flex items-center gap-2"><Users size={20} /> Added Staff ({staffList.length})</h2>
          <label className="flex h-11 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm text-[var(--muted)] shadow-sm focus-within:border-[var(--accent)] transition-colors w-full sm:max-w-xs">
            <Search size={18} />
            <input
              className="w-full bg-transparent outline-none placeholder:text-stone-400 font-medium text-[var(--text)]"
              placeholder="Search staff..."
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
        </div>

        <div className="erp-table-container">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Designation</th>
                <th>Phone</th>
                <th>Salary</th>
                <th>Total Paid (₹)</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length > 0 ? (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="group transition-colors hover:bg-[var(--soft)]">
                    <td className="font-semibold text-[var(--text)]">{staff.name}</td>
                    <td>
                      <span className="rounded bg-[var(--accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--accent)]">
                        {staff.designation}
                      </span>
                    </td>
                    <td className="text-[var(--text)]">{staff.phone}</td>
                    <td className="font-semibold text-[var(--text)]">₹{parseFloat(staff.salary || 0).toLocaleString()}</td>
                    <td className="font-bold text-green-600">
                      ₹{parseFloat(staff.totalPaid || 0).toLocaleString()}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
                          title="Edit"
                          onClick={() => handleEdit(staff)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-500 transition hover:bg-red-500 hover:text-white"
                          title="Delete"
                          onClick={() => handleDelete(staff.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-[var(--muted)]">
                    {searchQuery ? "No staff found matching search criteria." : "No staff members added yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default StaffManagementPage
