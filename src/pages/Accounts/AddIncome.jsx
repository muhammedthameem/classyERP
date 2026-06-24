import React, { useState, useEffect } from 'react'
import { CircleDollarSign, Calendar, CreditCard, Tag, FileText, FileSignature, ChevronDown, Trash2, Link } from 'lucide-react'
import supabase from '../../supabase'
import { getIndianDate } from '../../utils/constants'
import CustomDatePicker from '../../components/CustomDatePicker'

function AddIncomePage({ themeStyle, setCurrentPage, showGlobalToast, incomeCategories = [], setIncomeCategories, saveConfig, sales = [], orders = [], refreshAccounts }) {
  const [formData, setFormData] = useState({
    date: getIndianDate(),
    category: '',
    amount: '',
    payment_mode: 'Cash',
    reference: '',
    notes: '',
    linked_sale_id: '',
    linked_order_id: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const [linkedSaleIds, setLinkedSaleIds] = useState([])
  const [linkedAdvanceIds, setLinkedAdvanceIds] = useState([])

  const paymentModes = ['Cash', 'Bank Transfer', 'UPI', 'Card', 'Cheque']
  const completedSales = sales.filter(s => s.status === 'Completed' || s.status === 'Delivered' || s.status === 'Billed' || s.totalAmount > 0 || s.total > 0)

  useEffect(() => {
    const fetchLinkedSales = async () => {
      try {
        const { data, error } = await supabase
          .from('erp_accounts')
          .select('reference')
          .eq('type', 'Income')

        if (!error && data) {
          const sIds = data.filter(d => d.reference?.startsWith('Sale #')).map(d => d.reference.replace('Sale #', ''));
          const oIds = data.filter(d => d.reference?.startsWith('Order Advance #')).map(d => d.reference.replace('Order Advance #', ''));
          setLinkedSaleIds(sIds);
          setLinkedAdvanceIds(oIds);
        }
      } catch (err) {
        console.error("Error fetching linked sales:", err);
      }
    };
    fetchLinkedSales();
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
      let finalNotes = formData.notes;
      if (formData.linked_sale_id && formData.reference) {
         finalNotes = `Sale for ${formData.reference}${finalNotes ? ' | ' + finalNotes : ''}`;
      } else if (formData.linked_order_id && formData.reference) {
         finalNotes = `Advance for Order (${formData.reference})${finalNotes ? ' | ' + finalNotes : ''}`;
      }

      const { data, error } = await supabase
        .from('erp_accounts')
        .insert([{
          type: 'Income',
          date: formData.date,
          category: formData.category,
          amount: parseFloat(formData.amount),
          payment_mode: formData.payment_mode,
          reference: formData.linked_sale_id ? `Sale #${formData.linked_sale_id}` : (formData.linked_order_id ? `Order Advance #${formData.linked_order_id}` : formData.reference),
          notes: finalNotes
        }])

      if (error) throw error;

      if (refreshAccounts) refreshAccounts();

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
      if (sale && (sale.totalAmount || sale.total)) {
        setFormData(prev => ({ 
          ...prev, 
          amount: (sale.totalAmount || sale.total).toString(), 
          category: 'Sales', 
          reference: sale.client?.name || sale.client || '',
          date: sale.timestamp ? sale.timestamp.split('T')[0] : prev.date,
          mode: sale.paymentMode || prev.mode
        }));
        setCategorySearch('Sales');
      }
    }
  }

  const handleOrderSelect = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, linked_order_id: val }));
    if (val) {
      const order = orders.find(o => o.orderId?.toString() === val || o.id?.toString() === val);
      if (order && parseFloat(order.advance || 0) > 0) {
        setFormData(prev => ({ 
          ...prev, 
          amount: order.advance.toString(), 
          category: 'Order Advance', 
          reference: order.client?.name || order.client || '',
          date: order.timestamp ? order.timestamp.split('T')[0] : prev.date
        }));
        setCategorySearch('Order Advance');
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

            <div className="relative z-30 sm:col-span-2">
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
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-lg">
                  {incomeCategories
                    .filter(c => c.toLowerCase().includes(categorySearch.toLowerCase()))
                    .map((c) => (
                      <div key={c} className="flex items-center group w-full px-4 py-1 hover:bg-[var(--soft)]">
                        <button
                          className="flex-1 py-1.5 text-left text-sm text-[var(--text)] transition"
                          onMouseDown={(e) => {
                            e.preventDefault(); // Prevent input blur
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
                          onMouseDown={(e) => {
                            e.preventDefault(); // Prevent input blur
                            const updated = incomeCategories.filter(item => item !== c);
                            if (setIncomeCategories) setIncomeCategories(updated);
                            if (saveConfig) saveConfig('incomeCategories', updated);
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 opacity-60 hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  {categorySearch && !incomeCategories.some(c => c.toLowerCase() === categorySearch.toLowerCase()) && (
                    <button
                      className="w-full px-4 py-2 text-left text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--soft)]"
                      onMouseDown={(e) => {
                        e.preventDefault();
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
                  {completedSales
                    .filter(s => !linkedSaleIds.includes((s.saleId || s.id)?.toString()))
                    .map(s => (
                    <option key={s.saleId || s.id} value={s.saleId || s.id}>
                      Sale #{s.saleId || s.id} - {s.client?.name || s.client || 'Walk-in'} (₹{s.totalAmount || s.total})
                    </option>
                  ))}
                </select>
              </label>
            )}

            {(formData.category?.toLowerCase().includes('advance')) && (
              <label className="block sm:col-span-2 pt-2">
                <span className="text-sm font-medium text-[var(--text)] flex items-center gap-1"><Link size={16}/> Link to Order Advance (Optional)</span>
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                  value={formData.linked_order_id}
                  onChange={handleOrderSelect}
                >
                  <option value="">-- Select an order with advance --</option>
                  {orders
                    .filter(o => parseFloat(o.advance || 0) > 0)
                    .filter(o => !linkedAdvanceIds.includes((o.orderId || o.id)?.toString()))
                    .map(o => (
                    <option key={o.orderId || o.id} value={o.orderId || o.id}>
                      Order #{o.orderId || o.id} - {o.client?.name || o.client || 'Walk-in'} (Advance: ₹{o.advance})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block pt-2 z-20 relative">
              <span className="text-sm font-medium text-[var(--text)] flex items-center gap-1 mb-2"><Calendar size={16}/> Date</span>
              <CustomDatePicker
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
                placeholder="Select date"
                maxDate={new Date().toISOString().split('T')[0]}
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

            {!formData.linked_sale_id && !formData.linked_order_id && (
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
