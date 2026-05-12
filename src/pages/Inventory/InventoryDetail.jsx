import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, CircleDollarSign, ClipboardList, Package, ShoppingBag, UsersRound, Pencil, Trash2 } from 'lucide-react'

function InventoryDetailPage({ themeStyle, item, setCurrentPage, setSelectedInventoryItem, initialMode, setInventoryDetailMode, showGlobalToast }) {
  const [mode, setMode] = useState(initialMode);
  const [formData, setFormData] = useState(item);
  const [priceEntryMode, setPriceEntryMode] = useState('per-unit');
  const [itemToDelete, setItemToDelete] = useState(null);

  if (!item) {
    setCurrentPage('view-inventory');
    return null;
  }

  const handleUpdate = (e) => {
    e.preventDefault();
    const saved = JSON.parse(localStorage.getItem('inventory') || '[]');
    const updated = saved.map(i => i.id === item.id ? formData : i);
    localStorage.setItem('inventory', JSON.stringify(updated));
    setSelectedInventoryItem(formData);
    setMode('view');
    if (showGlobalToast) showGlobalToast('Updated!', 'Inventory item updated successfully.');
  };

  const handleDelete = () => {
    const saved = JSON.parse(localStorage.getItem('inventory') || '[]');
    const updated = saved.filter(i => i.id !== item.id);
    localStorage.setItem('inventory', JSON.stringify(updated));
    setCurrentPage('view-inventory');
    if (showGlobalToast) showGlobalToast('Deleted!', 'Inventory item removed successfully.');
  };

  return (
    <div style={themeStyle} className="space-y-6">
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-[var(--text)]">Delete Inventory Item</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Are you sure you want to delete <span className="font-semibold text-[var(--text)]">{item.productName}</span>? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold transition hover:bg-[var(--soft)]" onClick={() => setItemToDelete(null)}>Cancel</button>
              <button className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700" onClick={handleDelete}>Delete Item</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <button
          className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)] transition hover:underline"
          onClick={() => setCurrentPage('view-inventory')}
        >
          <ChevronLeft size={16} /> Back to View Inventory
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-[var(--surface)] p-6 rounded-[24px] border border-[var(--border)] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">{mode === 'view' ? 'Inventory Details' : 'Edit Inventory Item'}</h1>
          <p className="text-sm text-[var(--muted)]">{formData.productName} (ID: {formData.productId})</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCurrentPage('create-inventory')}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition hover:brightness-95"
          >
            <Package size={18} /> Add New Item
          </button>
          <button
            onClick={() => setItemToDelete(true)}
            className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-600 hover:text-white"
          >
            <Trash2 size={18} /> Delete Item
          </button>
          {mode === 'view' ? (
            <button
              onClick={() => setMode('edit')}
              className="flex items-center gap-2 rounded-xl bg-[var(--accent-soft)] px-4 py-2.5 text-sm font-bold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
            >
              <Pencil size={18} /> Edit Inventory
            </button>
          ) : (
            <button
              onClick={() => setMode('view')}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm font-bold transition hover:bg-[var(--soft)]"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <ShoppingBag size={20} className="text-[var(--accent)]" /> Core Information
            </h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase text-[var(--muted)] mb-1">Product Name</p>
                {mode === 'view' ? (
                  <p className="text-lg font-semibold">{formData.productName}</p>
                ) : (
                  <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2.5 outline-none focus:border-[var(--accent)]" value={formData.productName} onChange={e => setFormData({ ...formData, productName: e.target.value })} />
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-[var(--muted)] mb-1">Product ID</p>
                {mode === 'view' ? (
                  <p className="text-lg font-semibold">{formData.productId}</p>
                ) : (
                  <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2.5 outline-none focus:border-[var(--accent)]" value={formData.productId} onChange={e => setFormData({ ...formData, productId: e.target.value })} />
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-[var(--muted)] mb-1">Purchased Quantity</p>
                {mode === 'view' ? (
                  <p className="text-lg font-semibold text-[var(--text)]">{formData.initialQuantity || formData.quantity} {formData.unit}</p>
                ) : (
                  <input 
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2.5 outline-none focus:border-[var(--accent)]" 
                    type="number" 
                    value={formData.initialQuantity || formData.quantity} 
                    onChange={e => setFormData({ ...formData, initialQuantity: parseFloat(e.target.value) || 0 })} 
                  />
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-[var(--muted)] mb-1">Stock Quantity (Remaining)</p>
                {mode === 'view' ? (
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-black text-[var(--accent)]">{formData.quantity} {formData.unit}</p>
                    <span className="text-[10px] font-bold text-[var(--muted)] uppercase">Remaining</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2.5 outline-none focus:border-[var(--accent)]" type="number" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })} />
                    <input className="w-20 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2.5 outline-none focus:border-[var(--accent)] text-xs font-bold uppercase" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} placeholder="Unit" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-[var(--muted)] mb-1">Category / Type</p>
                {mode === 'view' ? (
                  <p className="text-lg font-semibold">{formData.productType}</p>
                ) : (
                  <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2.5 outline-none focus:border-[var(--accent)]" value={formData.productType} onChange={e => setFormData({ ...formData, productType: e.target.value })} />
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <CircleDollarSign size={20} className="text-[var(--accent)]" /> Pricing & Financials
            </h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase text-[var(--muted)] mb-1">Unit Price (Decided)</p>
                {mode === 'view' ? (
                  <p className="text-2xl font-black text-[var(--accent)]">₹{formData.finalPrice}</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-1 rounded-lg bg-[var(--soft)] p-0.5 w-fit">
                      <button type="button" onClick={() => setPriceEntryMode('per-unit')} className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition ${priceEntryMode === 'per-unit' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)]'}`}>PER UNIT</button>
                      <button type="button" onClick={() => setPriceEntryMode('total')} className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition ${priceEntryMode === 'total' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)]'}`}>TOTAL</button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] font-bold">₹</span>
                      <input 
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] py-2.5 pl-8 pr-4 outline-none focus:border-[var(--accent)]" 
                        type="number" 
                        value={priceEntryMode === 'per-unit' ? formData.finalPrice : (parseFloat(formData.finalPrice) * parseFloat(formData.quantity)).toFixed(2)} 
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          const qty = parseFloat(formData.quantity) || 1;
                          if (priceEntryMode === 'per-unit') {
                            setFormData({ ...formData, finalPrice: val.toString() });
                          } else {
                            setFormData({ ...formData, finalPrice: (val / qty).toFixed(2) });
                          }
                        }} 
                      />
                    </div>
                    <p className="text-[10px] font-bold text-[var(--muted)] uppercase px-1">
                      {priceEntryMode === 'per-unit' 
                        ? `Total: ₹${(parseFloat(formData.finalPrice) * parseFloat(formData.quantity)).toFixed(2)}` 
                        : `Unit Price: ₹${formData.finalPrice}`}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-[var(--muted)] mb-1">Purchase Price (from Vendor)</p>
                {mode === 'view' ? (
                  <p className="text-lg font-semibold text-[var(--text)]">₹{formData.purchasePrice}</p>
                ) : (
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] font-bold">₹</span>
                    <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] py-2.5 pl-8 pr-4 outline-none focus:border-[var(--accent)]" type="number" value={formData.purchasePrice} onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })} />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-[var(--muted)] mb-1">Tax (GST %)</p>
                {mode === 'view' ? (
                  <p className="text-lg font-semibold">{formData.gst}%</p>
                ) : (
                  <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2.5 outline-none focus:border-[var(--accent)]" type="number" value={formData.gst} onChange={e => setFormData({ ...formData, gst: e.target.value })} />
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-[var(--muted)] mb-1">Discount (%)</p>
                {mode === 'view' ? (
                  <p className="text-lg font-semibold">{formData.discount}%</p>
                ) : (
                  <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2.5 outline-none focus:border-[var(--accent)]" type="number" value={formData.discount} onChange={e => setFormData({ ...formData, discount: e.target.value })} />
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <UsersRound size={20} className="text-[var(--accent)]" /> Vendor Details
            </h3>
            <div>
              <p className="text-xs font-bold uppercase text-[var(--muted)] mb-1">Vendor Name</p>
              {mode === 'view' ? (
                <p className="text-lg font-semibold">{formData.vendorName || 'No Vendor Linked'}</p>
              ) : (
                <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2.5 outline-none focus:border-[var(--accent)]" value={formData.vendorName} onChange={e => setFormData({ ...formData, vendorName: e.target.value })} placeholder="Enter vendor name..." />
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <ClipboardList size={20} className="text-[var(--accent)]" /> Internal Notes
            </h3>
            {mode === 'view' ? (
              <p className="text-sm leading-relaxed text-[var(--text)] whitespace-pre-wrap">{formData.note || 'No additional notes provided.'}</p>
            ) : (
              <textarea
                className="w-full min-h-[150px] rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none focus:border-[var(--accent)] text-sm"
                value={formData.note}
                onChange={e => setFormData({ ...formData, note: e.target.value })}
                placeholder="Add internal notes about quality, fabric feel, or usage..."
              />
            )}
          </section>

          {mode === 'edit' && (
            <div className="pt-4">
              <button
                onClick={handleUpdate}
                className="w-full rounded-2xl bg-[var(--accent)] py-4 text-lg font-bold text-white shadow-xl shadow-[var(--accent)]/25 transition hover:brightness-95"
              >
                Update Inventory Item
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InventoryDetailPage;
