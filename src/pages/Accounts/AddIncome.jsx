import React, { useState } from 'react'
import { CircleDollarSign, Calendar, CreditCard, Tag, FileText, FileSignature, ChevronDown, Trash2, Link } from 'lucide-react'
import supabase from '../../supabase'
import { getIndianDate } from '../../utils/constants'

function AddIncomePage({ themeStyle, setCurrentPage, showGlobalToast, incomeCategories = [], setIncomeCategories, saveConfig, sales = [] }) {
  const [formData, setFormData] = useState({
    date: getIndianDate(),
    category: 'Sales',
    amount: '',
    payment_mode: 'Cash',
    reference: '',
    notes: '',
    linked_sale_id: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dynamic Category State
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [categorySearch, setCategorySearch] = useState('Sales')

  const paymentModes = ['Cash', 'Bank Transfer', 'UPI', 'Card', 'Cheque']
  const completedSales = sales.filter(s => s.status === 'Completed' || s.status === 'Delivered' || s.status === 'Billed' || s.totalAmount > 0)

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
          type: 'Income',
          date: formData.date,
          category: formData.category,
          amount: parseFloat(formData.amount),
          payment_mode: formData.payment_mode,
          reference: formData.linked_sale_id ? `Sale #${formData.linked_sale_id}` : formData.reference,
          notes: formData.notes
        }])

      if (error) throw error;

      if (showGlobalToast) showGlobalToast('Success!', 'Income recorded successfully.');
      setCurrentPage('view-accounts')
    } catch (error) {
      console.error("Error saving income:", error)
      if (showGlobalToast) showGlobalToast('Error', 'Failed to save income record.');
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaleSelect = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, linked_sale_id: val }));
    if (val) {
      const sale = sales.find(s => s.saleId?.toString() === val || s.id?.toString() === val);
      if (sale && sale.totalAmount) {
        setFormData(prev => ({ ...prev, amount: sale.totalAmount.toString(), category: 'Sales', reference: sale.client?.name || sale.client || '' }));
        setCategorySearch('Sales');
      }
    }
  }

  return (
    <div style={themeStyle} className="relative">
      <div className="mb-6">
        <h1 className="text-h1 flex items-center gap-2">
          <CircleDollarSign className="text-[var(--accent)]" /> Add Income
        </h1>
        <p className="text-para text-[var(--muted)] mt-2">Record incoming funds and revenue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
          <div className="grid gap-6 sm:grid-cols-2">

            <div className="relative sm:col-span-2">
              <span className="text-sm font-medium text-[var(--text)] flex items-center gap-1 mb-2"><Tag size={16}/> Income Type / Category</span>
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
                placeholder="Search or add category (e.g., Sales)..."
                required
              />
              {showCategoryDropdown && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-lg">
                  {incomeCategories
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
                            const updated = incomeCategories.filter(item => item !== c);
                            if (setIncomeCategories) setIncomeCategories(updated);
                            if (saveConfig) saveConfig('incomeCategories', updated);
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  {categorySearch && !incomeCategories.some(c => c.toLowerCase() === categorySearch.toLowerCase()) && (
                    <button
                      className="w-full px-4 py-2 text-left text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--soft)]"
                      onClick={() => {
                        const newCat = categorySearch.trim()
                        if (newCat) {
                          const updated = [...incomeCategories, newCat]
                          if (setIncomeCategories) setIncomeCategories(updated);
                          if (saveConfig) saveConfig('incomeCategories', updated);
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

            {(formData.category?.toLowerCase() === 'sales' || formData.category?.toLowerCase() === 'sale') && (
              <label className="block sm:col-span-2 pt-2">
                <span className="text-sm font-medium text-[var(--text)] flex items-center gap-1"><Link size={16}/> Link to Sale (Optional)</span>
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                  value={formData.linked_sale_id}
                  onChange={handleSaleSelect}
                >
                  <option value="">-- Select a completed sale --</option>
                  {completedSales.map(s => (
                    <option key={s.saleId || s.id} value={s.saleId || s.id}>
                      Sale #{s.saleId || s.id} - {s.client?.name || s.client || 'Walk-in'} (₹{s.totalAmount})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block pt-2">
              <span className="text-sm font-medium text-[var(--text)] flex items-center gap-1"><Calendar size={16}/> Date</span>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[var(--text)] flex items-center gap-1"><CircleDollarSign size={16}/> Amount (₹)</span>
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
              <span className="text-sm font-medium text-[var(--text)] flex items-center gap-1"><CreditCard size={16}/> Payment Mode</span>
              <select
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                value={formData.payment_mode}
                onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
              >
                {paymentModes.map(mode => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </label>

            {!formData.linked_sale_id && (
              <label className="block">
                <span className="text-sm font-medium text-[var(--text)] flex items-center gap-1"><FileSignature size={16}/> Reference / Payer Name</span>
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Invoice # or Payer Name"
                />
              </label>
            )}

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-[var(--text)] flex items-center gap-1"><FileText size={16}/> Notes</span>
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
            {isSubmitting ? 'Saving...' : 'Save Income'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddIncomePage;
