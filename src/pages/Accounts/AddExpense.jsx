import React, { useState, useEffect } from 'react'
import { TrendingDown, Calendar, CreditCard, Tag, FileText, FileSignature, ChevronDown, Trash2, Link } from 'lucide-react'
import supabase from '../../supabase'
import { getIndianDate } from '../../utils/constants'

function AddExpensePage({ themeStyle, setCurrentPage, showGlobalToast, expenseCategories = [], setExpenseCategories, saveConfig, inventory = [], staffList = [], setStaffList }) {
  const [formData, setFormData] = useState({
    date: getIndianDate(),
    category: '',
    amount: '',
    payment_mode: 'Bank Transfer',
    reference: '',
    notes: '',
    linked_inventory_id: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selectedStaff, setSelectedStaff] = useState(null)
  const [overtimeInput, setOvertimeInput] = useState('')

  // Dynamic Category State
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const [linkedInventoryIds, setLinkedInventoryIds] = useState([])

  const paymentModes = ['Cash', 'Bank Transfer', 'UPI', 'Card', 'Cheque']

  useEffect(() => {
    const fetchLinkedAccounts = async () => {
      try {
        const { data, error } = await supabase
          .from('erp_accounts')
          .select('reference')
          .eq('type', 'Expense')
          .like('reference', 'Inventory #%');

        if (!error && data) {
          const ids = data.map(d => d.reference.replace('Inventory #', ''));
          setLinkedInventoryIds(ids);
        }
      } catch (err) {
        console.error("Error fetching linked inventory:", err);
      }
    };
    fetchLinkedAccounts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      if (showGlobalToast) showGlobalToast('Amount Required', 'Please enter a valid amount.');
      return;
    }
    if (!formData.category) {
      if (showGlobalToast) showGlobalToast('Category Required', 'Please select or add a category.');
      return;
    }

    setIsSubmitting(true)

    try {
      const { data, error } = await supabase
        .from('erp_accounts')
        .insert([{
          type: 'Expense',
          date: formData.date,
          category: formData.category,
          amount: parseFloat(formData.amount),
          payment_mode: formData.payment_mode,
          reference: formData.linked_inventory_id ? `Inventory #${formData.linked_inventory_id}` : formData.reference,
          notes: formData.notes
        }])

      if (error) throw error;

      if (selectedStaff && saveConfig) {
        const updatedStaffList = staffList.map(s => {
          if (s.id === selectedStaff.id) {
            return { ...s, totalPaid: (parseFloat(s.totalPaid) || 0) + parseFloat(formData.amount) };
          }
          return s;
        });
        if (setStaffList) setStaffList(updatedStaffList);
        saveConfig('staffList', updatedStaffList);
      }

      if (showGlobalToast) showGlobalToast('Success!', 'Expense recorded successfully.');
      setCurrentPage('view-accounts')
    } catch (error) {
      console.error("Error saving expense:", error)
      if (showGlobalToast) showGlobalToast('Error', 'Failed to save expense record.');
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInventorySelect = (e) => {
    const val = e.target.value;
    if (val) {
      const item = inventory.find(i => i.productId?.toString() === val || i.id?.toString() === val);
      if (item) {
        const totalAmount = (parseFloat(item.initialQuantity || item.quantity || 0) * parseFloat(item.purchasePrice || 0)).toFixed(2);
        setFormData(prev => ({
          ...prev,
          linked_inventory_id: val,
          amount: totalAmount,
          reference: item.vendorName || item.supplier || item.productName || ''
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, linked_inventory_id: val }));
    }
  }

  const handleStaffSelect = (e) => {
    const staffId = e.target.value;
    if (staffId) {
      const staff = staffList.find(s => s.id === staffId);
      if (staff) {
        setSelectedStaff(staff);

        let noteStr = '';
        let fillAmt = '';
        if (formData.category === 'Overtime Payment') {
          noteStr = `Overtime payment for ${staff.name} (${staff.designation})`;
        } else {
          noteStr = `Salary payout for ${staff.name} (${staff.designation})`;
          fillAmt = staff.salary || '';
        }

        setFormData(prev => ({
          ...prev,
          amount: fillAmt.toString(),
          reference: `${formData.category === 'Overtime Payment' ? 'Overtime' : 'Salary'} - ${staff.name}`,
          notes: noteStr
        }));
      }
    } else {
      setSelectedStaff(null);
    }
  }

  return (
    <div style={themeStyle} className="relative">
      <div className="mb-6">
        <h1 className="text-h1 flex items-center gap-2">
          <TrendingDown className="text-[var(--accent)]" /> Add Expense
        </h1>
        <p className="text-para text-[var(--muted)] mt-2">Record outgoing payments and expenses</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
          <div className="grid gap-6 sm:grid-cols-2">

            <div className="relative sm:col-span-2">
              <span className="text-sm font-medium text-[var(--text)] flex items-center gap-1 mb-2"><Tag size={16} /> Expense Type / Category</span>
              <input
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                type="text"
                value={categorySearch}
                onChange={(e) => {
                  setCategorySearch(e.target.value)
                  setFormData({ ...formData, category: e.target.value })
                  setShowCategoryDropdown(true)
                }}
                onFocus={() => setShowCategoryDropdown(true)}
                onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                placeholder="Search or add category (e.g., Rent, Materials)..."
                required
              />
              {showCategoryDropdown && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-lg">
                  {expenseCategories
                    .filter(c => c.toLowerCase().includes(categorySearch.toLowerCase()))
                    .map((c) => (
                      <div key={c} className="flex items-center group w-full px-4 py-1 hover:bg-[var(--soft)]">
                        <button
                          className="flex-1 py-1.5 text-left text-sm text-[var(--text)] transition"
                          onClick={() => {
                            setCategorySearch(c)
                            setFormData({ ...formData, category: c })
                            setShowCategoryDropdown(false)
                          }}
                          type="button"
                        >
                          {c}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = expenseCategories.filter(item => item !== c);
                            if (setExpenseCategories) setExpenseCategories(updated);
                            if (saveConfig) saveConfig('expenseCategories', updated);
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  {categorySearch && !expenseCategories.some(c => c.toLowerCase() === categorySearch.toLowerCase()) && (
                    <button
                      className="w-full px-4 py-2 text-left text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--soft)]"
                      onClick={() => {
                        const newCat = categorySearch.trim()
                        if (newCat) {
                          const updated = [...expenseCategories, newCat]
                          if (setExpenseCategories) setExpenseCategories(updated);
                          if (saveConfig) saveConfig('expenseCategories', updated);
                          setFormData({ ...formData, category: newCat })
                          setShowCategoryDropdown(false)
                        }
                      }}
                      type="button"
                    >
                      + Add "{categorySearch}"
                    </button>
                  )}
                </div>
              )}
            </div>

            {(formData.category?.toLowerCase().includes('material') || formData.category?.toLowerCase().includes('fabric') || formData.category?.toLowerCase() === 'purchase') && (
              <label className="block sm:col-span-2 pt-2">
                <span className="text-sm font-medium text-[var(--text)] flex items-center gap-1"><Link size={16} /> Link to Inventory Purchase (Optional)</span>
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                  value={formData.linked_inventory_id}
                  onChange={handleInventorySelect}
                >
                  <option value="">-- No linked inventory --</option>
                  {inventory
                    .filter(i => !linkedInventoryIds.includes((i.productId || i.id)?.toString()))
                    .map(i => (
                    <option key={i.productId || i.id} value={i.productId || i.id}>
                      Item #{i.productId || i.id} - {i.productName} (Qty: {i.initialQuantity || i.quantity} {i.unit} @ ₹{i.purchasePrice || 0})
                    </option>
                  ))}
                </select>
              </label>
            )}

            {(formData.category?.toLowerCase().includes('staff') || formData.category?.toLowerCase().includes('salary') || formData.category === 'Overtime Payment') && (
              <label className="block sm:col-span-2 pt-2">
                <span className="text-sm font-medium text-[var(--text)] flex items-center gap-1"><Link size={16} /> Select Staff Member</span>
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                  onChange={handleStaffSelect}
                  value={selectedStaff ? selectedStaff.id : ""}
                >
                  <option value="" disabled>-- Select a staff member --</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {s.designation}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block pt-2">
              <span className="text-sm font-medium text-[var(--text)] flex items-center gap-1"><Calendar size={16} /> Date</span>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </label>

            <label className="block">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-sm font-medium text-[var(--text)] flex items-center gap-1"><TrendingDown size={16} /> Amount (₹)</span>
                {selectedStaff && (
                  <span className="text-xs font-semibold text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-md">
                    Base Salary: ₹{selectedStaff.salary || 0}
                  </span>
                )}
                {formData.linked_inventory_id && (
                  (() => {
                    const item = inventory.find(i => i.productId?.toString() === formData.linked_inventory_id || i.id?.toString() === formData.linked_inventory_id);
                    if (item) {
                      return (
                        <span className="text-xs font-semibold text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-md">
                          Inventory Cost: ₹{(parseFloat(item.initialQuantity || item.quantity || 0) * parseFloat(item.purchasePrice || 0)).toLocaleString()}
                        </span>
                      );
                    }
                    return null;
                  })()
                )}
              </div>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[var(--text)] flex items-center gap-1"><CreditCard size={16} /> Payment Mode</span>
              <select
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                value={formData.payment_mode}
                onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
              >
                {paymentModes.map(mode => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </label>

            {!formData.linked_inventory_id && (
              <label className="block">
                <span className="text-sm font-medium text-[var(--text)] flex items-center gap-1"><FileSignature size={16} /> Vendor / Payee Name</span>
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Vendor Name or Invoice #"
                />
              </label>
            )}

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-[var(--text)] flex items-center gap-1"><FileText size={16} /> Notes</span>
              <textarea
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 resize-none"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional details..."
              />
            </label>

          </div>
        </section>

        <div className="flex justify-end gap-3 w-full">
          <button
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-6 py-3 font-semibold transition hover:bg-[var(--soft)] cursor-pointer"
            type="button"
            onClick={() => setCurrentPage('view-accounts')}
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white shadow-lg shadow-[var(--accent)]/25 transition hover:brightness-110 cursor-pointer disabled:opacity-50"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddExpensePage;
