import React, { useState, useEffect, useRef, useMemo } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, CircleDollarSign, ClipboardList, Search, Eye, Pencil, Trash2, CheckCircle, Clock, Play, Pause, CheckCircle2, Plus, X } from 'lucide-react'
import { formatDateDDMMYY, getIndianDate, orders } from '../../utils/constants'
import supabase from '../../supabase'

function ViewOrdersPage({ themeStyle, setCurrentPage, showGlobalToast, currentUser, highlightOrderId, setHighlightOrderId, orders, setOrders, inventory, setInventory, saveOrder, deleteOrder, cloudLoaded }) {
  const rowRefs = useRef({});
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPageNum, setCurrentPageNum] = useState(1)
  const itemsPerPage = 10
  const [imagePopup, setImagePopup] = useState(null)
  const [editOrder, setEditOrder] = useState(null)
  const [orderToDelete, setOrderToDelete] = useState(null)
  const [recentlyDeletedOrder, setRecentlyDeletedOrder] = useState(null)
  const undoTimeoutRef = useRef(null)
  const [viewOrder, setViewOrder] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' })
  const [dateFilter, setDateFilter] = useState('All') // All, Today, Tomorrow, Week, Custom
  const [customDate, setCustomDate] = useState(getIndianDate())

  const isDataLoading = !cloudLoaded || !orders;

  const saveOrders = (newOrders) => {
    setOrders(newOrders)
  }

  const handleDeleteConfirm = () => {
    if (orderToDelete) {
      const idToDelete = orderToDelete.id;
      const order = { ...orderToDelete };

      setRecentlyDeletedOrder(order);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

      undoTimeoutRef.current = setTimeout(async () => {
        // Restore inventory if order had internal materials
        if (order.sourceOfMaterial === 'Internal' && order.internalItems?.length > 0) {
          let updatedInventory = [...inventory];
          order.internalItems.forEach(mat => {
            updatedInventory = updatedInventory.map(invItem => {
              if (invItem.id === mat.inventoryId || (mat.productId && invItem.productId === mat.productId)) {
                const currentQty = parseFloat(invItem.quantity) || 0;
                const restoreQty = parseFloat(mat.quantity) || 0;
                return { ...invItem, quantity: currentQty + restoreQty };
              }
              return invItem;
            });
          });
          setInventory(updatedInventory);

          // Sync restored inventory to Supabase
          const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
          updatedInventory.forEach(invItem => {
            const orig = inventory.find(i => i.id === invItem.id);
            if (orig && orig.quantity !== invItem.quantity) {
              supabase.from('erp_inventory').upsert([{ id: invItem.id.toString(), data: clean(invItem) }]).then(({ error }) => {
                if (error) console.error("Inventory sync failed:", error);
              });
            }
          });
        }

        try {
          if (deleteOrder) {
            await deleteOrder(idToDelete);
          } else {
            await supabase.from('erp_orders').delete().eq('id', idToDelete);
          }
        } catch (err) {
          console.error("Cloud delete failed:", err);
        }
        setRecentlyDeletedOrder(null);
      }, 8000);

      // 1. Optimistic UI update (Instant)
      const updated = orders.filter(o => o.id !== idToDelete)
      saveOrders(updated)
      setOrderToDelete(null)
      if (showGlobalToast) showGlobalToast('Deleted', `Order #${order.id} for ${order.clientName} removed.`)
    }
  }

  const handleUndoDelete = () => {
    if (!recentlyDeletedOrder) return;
    const updated = orders.some(o => o.id === recentlyDeletedOrder.id) ? orders : [...orders, recentlyDeletedOrder];
    saveOrders(updated);
    if (showGlobalToast) showGlobalToast('Restored', `Order #${recentlyDeletedOrder.id} has been restored.`);
    setRecentlyDeletedOrder(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  }

  const handleStatusChange = (id, newStatus) => {
    const updated = orders.map(o => {
      if (o.id === id) {
        let newData = { ...o, status: newStatus }
        if (newStatus === 'In Progress' && !o.startDate) {
          newData.startDate = getIndianDate()
        }
        if (newStatus === 'Completed' && !o.completedDate) {
          newData.completedDate = getIndianDate()
        }
        if (newStatus !== 'Hold') {
          newData.lastActiveStatus = newStatus
        }
        return newData
      }
      return o
    })
    saveOrders(updated)

    // Cloud Sync: Persist the specific order change
    const changedOrder = updated.find(o => o.id === id)
    if (changedOrder && saveOrder) {
      saveOrder(changedOrder);
    }

    if (showGlobalToast) showGlobalToast('Status Updated', `Order status changed to ${newStatus}`)
  }


  const [activeFilter, setActiveFilter] = useState('All')

  const displayOrders = orders.filter(o => o.id !== recentlyDeletedOrder?.id);

  const filteredOrders = displayOrders.filter(o => {
    const matchesSearch = (o.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.product || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.id || '').toString().includes(searchQuery)
    if (!matchesSearch) return false;

    // 1. Status Filtering
    let matchesStatus = true
    if (activeFilter === 'Upcoming') {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      matchesStatus = o.status !== 'Completed' && o.status !== 'Sold' && o.deliveryDate && new Date(o.deliveryDate) >= todayStart
    } else if (activeFilter === 'In Progress') {
      matchesStatus = o.status === 'In Progress' || o.status === 'Start'
    } else if (activeFilter === 'Completed') {
      matchesStatus = o.status === 'Completed'
    } else if (activeFilter === 'Not Ready') {
      matchesStatus = o.status === 'Not Ready' || o.status === 'Pending'
    } else if (activeFilter !== 'All') {
      matchesStatus = o.status === activeFilter
    }

    if (!matchesStatus) return false

    // 2. Date Filtering (Delivery Tracker)
    if (dateFilter !== 'All') {
      if (!o.deliveryDate) return false

      const todayStr = getIndianDate() // YYYY-MM-DD
      const targetStr = o.deliveryDate // Should be YYYY-MM-DD

      if (dateFilter === 'Today') {
        if (targetStr !== todayStr) return false
      } else if (dateFilter === 'Tomorrow') {
        const tom = new Date()
        tom.setDate(tom.getDate() + 1)
        const tomStr = tom.toISOString().split('T')[0]
        if (targetStr !== tomStr) return false
      } else if (dateFilter === 'Week') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const target = new Date(o.deliveryDate)
        target.setHours(0, 0, 0, 0)
        const nextWeek = new Date(today)
        nextWeek.setDate(today.getDate() + 7)
        if (target < today || target > nextWeek) return false
      } else if (dateFilter === 'Custom' && customDate) {
        if (targetStr !== customDate) return false
      }
    }

    return true
  })

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      // Keep 'Closed' at the bottom regardless of sort
      if (a.status === 'Closed' && b.status !== 'Closed') return 1;
      if (a.status !== 'Closed' && b.status === 'Closed') return -1;

      let valA = a[sortConfig.key] || ''
      let valB = b[sortConfig.key] || ''

      if (sortConfig.key === 'orderDate' || sortConfig.key === 'deliveryDate') {
        valA = new Date(valA || 0).getTime()
        valB = new Date(valB || 0).getTime()
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    });
  }, [filteredOrders, sortConfig]);

  // Scroll to highlight logic
  useEffect(() => {
    if (highlightOrderId) {
      // Find the index in the sorted list to calculate the exact page
      const index = sortedOrders.findIndex(o => o.id === highlightOrderId);
      if (index !== -1) {
        const page = Math.floor(index / itemsPerPage) + 1;
        setCurrentPageNum(page);

        // Wait for page to render
        setTimeout(() => {
          const row = rowRefs.current[highlightOrderId];
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Keep highlight for 3 seconds then clear
            setTimeout(() => {
              if (setHighlightOrderId) setHighlightOrderId(null);
            }, 3000);
          }
        }, 300);
      }
    }
  }, [highlightOrderId, sortedOrders]);

  // Reset pagination to page 1 when search or filters change
  useEffect(() => {
    setCurrentPageNum(1)
  }, [searchQuery, activeFilter, dateFilter])

  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage)

  useEffect(() => {
    if (totalPages > 0 && currentPageNum > totalPages) {
      setCurrentPageNum(totalPages)
    }
  }, [totalPages, currentPageNum])

  const paginatedOrders = sortedOrders.slice((currentPageNum - 1) * itemsPerPage, currentPageNum * itemsPerPage)

  const getProgress = (order) => {
    const activeStatus = order.status === 'Hold' ? (order.lastActiveStatus || 'Not Ready') : order.status;
    switch (activeStatus) {
      case 'Closed': case 'Sold': return 100;
      case 'Completed': return 100;
      case 'In Progress': case 'Start': return 50;
      default: return 0; // Not Ready
    }
  }

  const totalOrders = displayOrders.length
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const upcomingDeliveries = displayOrders.filter(o => o.status !== 'Closed' && o.status !== 'Sold' && o.deliveryDate && new Date(o.deliveryDate) >= todayStart).length
  const pendingCount = displayOrders.filter(o => o.status === 'Not Ready' || o.status === 'Pending').length
  const progressCount = displayOrders.filter(o => o.status === 'In Progress' || o.status === 'Start').length
  const holdCount = displayOrders.filter(o => o.status === 'Hold').length
  const closedCount = displayOrders.filter(o => o.status === 'Completed' || o.status === 'Sold').length

  return (
    <div style={themeStyle} className="relative">

      {/* Undo Popup */}
      {recentlyDeletedOrder && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[3000] animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-5 py-3.5 text-sm font-medium text-[var(--text)] shadow-2xl backdrop-blur-md">
            <span>Deleted Order <strong className="text-[var(--accent)]">#{recentlyDeletedOrder.id}</strong></span>
            <button
              onClick={handleUndoDelete}
              className="rounded-lg bg-[var(--accent)] px-4 py-1.5 font-bold text-white transition hover:opacity-90 active:scale-95 shadow-sm"
            >
              Undo
            </button>
            <button onClick={() => { setRecentlyDeletedOrder(null); if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current); }} className="text-[var(--muted)] hover:text-[var(--text)] transition ml-2">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {viewOrder && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--text)] transition" onClick={() => setViewOrder(null)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div className="flex items-center gap-4 mb-6">
              <img src="/logo-black.png" alt="Logo" className="w-16 h-16 object-contain" />
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2">Order #{viewOrder.id}</h2>
                <p className="text-sm text-[var(--muted)]">Classy Couture</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-sm font-medium text-[var(--muted)] mb-1">Client</p>
                <p className="font-semibold text-[var(--text)] text-lg">{viewOrder.clientName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--muted)] mb-1">Status</p>
                <span className="rounded bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">{viewOrder.status === 'Pending' ? 'Not Ready' : (viewOrder.status || 'Not Ready')}</span>
              </div>

              <div>
                <p className="text-sm font-medium text-[var(--muted)] mb-1">Product Details</p>
                <p className="font-semibold text-[var(--text)]">{viewOrder.product}</p>
                <p className="text-sm text-[var(--muted)] mt-0.5">{viewOrder.orderType} • ₹{viewOrder.price}</p>
                {viewOrder.advance > 0 && <p className="text-sm text-green-600 font-semibold mt-0.5">Advance Paid: ₹{viewOrder.advance} • Bal: ₹{(parseFloat(viewOrder.price || 0) - parseFloat(viewOrder.advance || 0)).toFixed(2)}</p>}
                {viewOrder.size && <p className="text-xs text-[var(--muted)] mt-1">Qty: <span className="font-medium text-[var(--text)]">{viewOrder.size}</span></p>}
              </div>

              <div>
                <p className="text-sm font-medium text-[var(--muted)] mb-1">Material Details</p>
                <p className="text-sm text-[var(--text)] font-medium mb-2">{viewOrder.sourceOfMaterial || 'Outside'}</p>
                {viewOrder.sourceOfMaterial === 'Internal' && viewOrder.internalItems && viewOrder.internalItems.length > 0 && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] overflow-hidden flex flex-col">
                    <div className="bg-[var(--soft)] px-3 py-2 border-b border-[var(--border)] flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Internal Materials</span>
                      <span className="text-[10px] font-bold bg-[var(--accent-soft)] text-[var(--accent)] px-2 py-0.5 rounded-full">{viewOrder.internalItems.length} Items</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto custom-scrollbar p-3 space-y-2">
                      {viewOrder.internalItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start text-xs bg-[var(--surface)] p-2.5 rounded-lg border border-[var(--border)] transition hover:border-[var(--accent)]">
                          <div>
                            <p className="font-bold text-[var(--text)]">{item.productName}</p>
                            <p className="text-[10px] font-medium text-[var(--muted)] mt-0.5">Qty: {item.quantity} {item.unit}</p>
                          </div>
                          <p className="font-black text-[var(--accent)]">₹{(item.totalPrice || 0).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-[var(--soft)] px-3 py-2.5 border-t border-[var(--border)] flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Material Total</span>
                      <span className="text-sm font-black text-[var(--text)]">₹{viewOrder.internalItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}
              </div>

              {viewOrder.notes && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-[var(--muted)] mb-1">Notes</p>
                  <p className="text-sm text-[var(--text)] bg-[var(--soft)] p-3 rounded-xl">{viewOrder.notes}</p>
                </div>
              )}

              {viewOrder.photo && (
                <div>
                  <p className="text-sm font-medium text-[var(--muted)] mb-1">Design Reference</p>
                  <img src={viewOrder.photo} alt="Ref" className="h-24 w-24 rounded-xl object-cover border border-[var(--border)] cursor-pointer hover:opacity-80 transition" onClick={() => setImagePopup(viewOrder.photo)} />
                </div>
              )}

              {viewOrder.materialPhoto && (
                <div>
                  <p className="text-sm font-medium text-[var(--muted)] mb-1">Material Photo</p>
                  <img src={viewOrder.materialPhoto} alt="Mat" className="h-24 w-24 rounded-xl object-cover border border-[var(--border)] cursor-pointer hover:opacity-80 transition" onClick={() => setImagePopup(viewOrder.materialPhoto)} />
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-[var(--muted)] mb-1">Timeline</p>
                <div className="flex flex-col gap-1 text-sm">
                  <p className="text-[var(--text)]"><span className="text-[var(--muted)] w-16 inline-block">Order:</span> {viewOrder.orderDate}</p>
                  {viewOrder.startDate && <p className="text-[var(--text)]"><span className="text-[var(--muted)] w-16 inline-block">Started:</span> {viewOrder.startDate}</p>}
                  <p className="text-[var(--text)] font-medium"><span className="text-[var(--muted)] font-normal w-16 inline-block">Delivery:</span> {viewOrder.deliveryDate}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button type="button" className="rounded-xl border border-[var(--border)] px-6 py-2.5 font-semibold hover:bg-[var(--soft)] transition" onClick={() => setViewOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {orderToDelete && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl p-6 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-500">
              <Trash2 size={24} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Delete Order</h2>
            <p className="text-sm text-[var(--muted)] mb-6">Are you sure you want to delete order #{orderToDelete.id}? This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <button type="button" className="rounded-xl border border-[var(--border)] px-4 py-2 font-semibold hover:bg-[var(--soft)] transition" onClick={() => setOrderToDelete(null)}>Cancel</button>
              <button type="button" className="rounded-xl bg-red-500 px-4 py-2 font-semibold text-white shadow-lg transition hover:brightness-95" onClick={handleDeleteConfirm}>Delete Order</button>
            </div>
          </div>
        </div>
      )}

      {editOrder && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Edit Order #{editOrder.id}</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--text)]">Client Name</span>
                <input
                  type="text"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 outline-none transition focus:border-[var(--accent)] text-[var(--text)]"
                  value={editOrder.clientName}
                  onChange={(e) => setEditOrder({ ...editOrder, clientName: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--text)]">Product</span>
                <input
                  type="text"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 outline-none transition focus:border-[var(--accent)] text-[var(--text)]"
                  value={editOrder.product}
                  onChange={(e) => setEditOrder({ ...editOrder, product: e.target.value })}
                />
              </label>
              <div className="grid grid-cols-3 gap-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-[var(--text)]">Order Type</span>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 outline-none transition focus:border-[var(--accent)] text-[var(--text)]"
                    value={editOrder.orderType}
                    onChange={(e) => setEditOrder({ ...editOrder, orderType: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-[var(--text)]">Est. Cost</span>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 outline-none transition focus:border-[var(--accent)] text-[var(--text)]"
                    value={editOrder.price}
                    onChange={(e) => setEditOrder({ ...editOrder, price: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-[var(--text)]">Advance Paid</span>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 outline-none transition focus:border-[var(--accent)] text-green-600 font-semibold"
                    value={editOrder.advance || ''}
                    onChange={(e) => setEditOrder({ ...editOrder, advance: e.target.value })}
                  />
                </label>
              </div>

              {editOrder.sourceOfMaterial === 'Internal' && editOrder.internalItems && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] overflow-hidden mb-4">
                  <div className="bg-[var(--soft)] px-3 py-2 border-b border-[var(--border)] flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Internal Materials</span>
                    <span className="text-[10px] font-bold bg-[var(--accent-soft)] text-[var(--accent)] px-2 py-0.5 rounded-full">{editOrder.internalItems.length} Items</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {editOrder.internalItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] bg-[var(--surface)] p-2 rounded-lg border border-[var(--border)]">
                        <span className="font-semibold text-[var(--text)] truncate mr-2">{item.productName} <span className="text-[var(--muted)] font-normal">(x{item.quantity})</span></span>
                        <span className="font-bold text-[var(--accent)] whitespace-nowrap">₹{(item.totalPrice || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-[var(--text)]">Order Date</span>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 outline-none transition focus:border-[var(--accent)] text-[var(--text)]"
                    value={editOrder.orderDate}
                    onChange={(e) => setEditOrder({ ...editOrder, orderDate: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-[var(--text)]">Delivery Date</span>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 outline-none transition focus:border-[var(--accent)] text-[var(--text)]"
                    value={editOrder.deliveryDate}
                    onChange={(e) => setEditOrder({ ...editOrder, deliveryDate: e.target.value })}
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--text)]">Notes</span>
                <textarea
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 outline-none transition focus:border-[var(--accent)] text-[var(--text)] min-h-[100px]"
                  value={editOrder.notes || ''}
                  onChange={(e) => setEditOrder({ ...editOrder, notes: e.target.value })}
                  placeholder="Fitting adjustments, fabric details, or special requests..."
                />
              </label>

              <div className="pt-2">
                <span className="mb-2 block text-sm font-medium text-[var(--text)]">Update Design Reference Photo</span>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] flex items-center justify-center overflow-hidden">
                    {editOrder.photo ? (
                      <img src={editOrder.photo} alt="Current" className="h-full w-full object-cover" />
                    ) : (
                      <Plus size={24} className="text-[var(--muted)]" />
                    )}
                  </div>
                  <label className="flex-1">
                    <div className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-4 text-xs font-bold text-[var(--accent)] transition hover:brightness-95 active:scale-95">
                      <Plus size={16} /> {editOrder.photo ? 'Change Design Reference' : 'Upload Design Reference'}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setEditOrder({ ...editOrder, photo: ev.target.result });
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {editOrder.photo && (
                    <button
                      type="button"
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                      onClick={() => setEditOrder({ ...editOrder, photo: null })}
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="rounded-xl px-4 py-2 font-semibold hover:bg-[var(--soft)] transition" onClick={() => setEditOrder(null)}>Cancel</button>
              <button type="button" className="rounded-xl bg-[var(--accent)] px-4 py-2 font-semibold text-white shadow-lg transition hover:brightness-95" onClick={() => {
                saveOrders(orders.map(o => o.id === editOrder.id ? editOrder : o))
                setEditOrder(null)
                if (showGlobalToast) showGlobalToast('Success', 'Order updated successfully.')
              }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-h1">Orders History</h1>
          <p className="text-para text-[var(--muted)] mt-2">View and manage all active studio orders.</p>
        </div>
        <button
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition hover:brightness-95 active:scale-95"
          onClick={() => setCurrentPage('add-order')}
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Add New Order</span>
          <span className="sm:hidden">Add Order</span>
        </button>
      </div>

      {/* Mobile Stats Select */}
      <div className="mb-6 lg:hidden">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">Quick Filter</label>
        <select
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-sm font-semibold outline-none focus:border-[var(--accent)]"
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value);
            setCurrentPageNum(1);
            document.getElementById('orders-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          {[
            { id: 'All', label: 'Total Orders' },
            { id: 'Upcoming', label: 'Upcoming Delivery' },
            { id: 'Not Ready', label: 'Not Ready' },
            { id: 'In Progress', label: 'In Progress' },
            { id: 'Hold', label: 'On Hold' },
            { id: 'Completed', label: 'Completed' },
            { id: 'Sold', label: 'Sold/Delivered' },
          ].map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Stats Dashboard */}
      <div className="mb-6 hidden lg:grid gap-4 xl:grid-cols-7 lg:gap-4">
        {[
          { id: 'All', label: 'Total', value: totalOrders, icon: ClipboardList, color: 'text-stone-700', bgColor: 'bg-stone-50' },
          { id: 'Upcoming', label: 'Upcoming', value: upcomingDeliveries, icon: CalendarDays, color: 'text-blue-600', bgColor: 'bg-blue-50' },
          { id: 'Not Ready', label: 'Not Ready', value: pendingCount, icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-50' },
          { id: 'In Progress', label: 'Progress', value: progressCount, icon: Play, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
          { id: 'Hold', label: 'Hold', value: holdCount, icon: Pause, color: 'text-red-600', bgColor: 'bg-red-50' },
          { id: 'Completed', label: 'Completed', value: displayOrders.filter(o => o.status === 'Completed').length, icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50' },
          { id: 'Sold', label: 'Sold', value: displayOrders.filter(o => o.status === 'Sold').length, icon: CircleDollarSign, color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
        ].map((stat) => (
          <button
            key={stat.id}
            type="button"
            onClick={() => {
              setActiveFilter(stat.id)
              setCurrentPageNum(1)
              document.getElementById('orders-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`group relative flex flex-col items-center justify-center rounded-[24px] border p-4 transition-all duration-300 hover:shadow-lg active:scale-95 ${activeFilter === stat.id ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-md scale-[1.02]' : 'border-[var(--border)] bg-[var(--surface-strong)] hover:border-[var(--accent)]/30'}`}
          >
            <div className={`mb-3 rounded-2xl p-2.5 transition-colors ${activeFilter === stat.id ? 'bg-[var(--accent)] text-white' : stat.bgColor + ' ' + stat.color}`}>
              <stat.icon size={22} />
            </div>
            <p className={`text-2xl font-black transition-colors ${activeFilter === stat.id ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>{stat.value}</p>
            <p className="mt-1 font-black uppercase tracking-[0.15em] text-[var(--muted)] group-hover:text-[var(--text)] transition-colors !text-[10px]">{stat.label}</p>
            {activeFilter === stat.id && (
              <div className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--accent)]"></div>
            )}
          </button>
        ))}
      </div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="sm:flex-1 w-full sm:max-w-md">
          <label className="flex h-11 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm text-[var(--muted)] shadow-sm focus-within:border-[var(--accent)] transition-colors">
            <Search size={18} />
            <input
              className="w-full bg-transparent outline-none placeholder:text-stone-400 font-medium"
              placeholder="Search client, product or ID..."
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
        </div>
        <div className="flex flex-col gap-2 w-full lg:w-auto">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] px-1">Delivery Tracker</span>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-11 items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
              {['All', 'Today', 'Tomorrow', 'Week', 'Custom'].map((df) => (
                <button
                  key={df}
                  onClick={() => setDateFilter(df)}
                  className={`h-9 px-4 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center justify-center ${dateFilter === df ? 'bg-[var(--accent)] text-white shadow-md' : 'bg-[var(--soft)] text-[var(--muted)] hover:text-[var(--text)]'}`}
                >
                  {df}
                </button>
              ))}
            </div>
            {dateFilter === 'Custom' && (
              <div className="w-full sm:w-auto animate-in slide-in-from-right-2 duration-300">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full sm:w-auto rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-[11px] font-bold outline-none focus:border-[var(--accent)] h-9 shadow-sm"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <section id="orders-table" className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--text)]">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} found
            {dateFilter !== 'All' && <span className="text-[var(--muted)] ml-1">for {dateFilter === 'Custom' ? customDate : dateFilter}</span>}
          </p>
          <p className="text-xs text-[var(--muted)] font-medium uppercase tracking-wider">
            {activeFilter !== 'All' ? activeFilter : 'All Statuses'}
          </p>
        </div>
        <div className="erp-table-container">
          <table className="erp-table">
            <thead>
              <tr>
                {[
                  { key: 'id', label: 'Order ID' },
                  { key: 'clientName', label: 'Client' }
                ].map(header => (
                  <th
                    key={header.key}
                    className="cursor-pointer transition hover:text-[var(--accent)] group"
                    onClick={() => {
                      setSortConfig(prev => ({
                        key: header.key,
                        direction: prev.key === header.key && prev.direction === 'desc' ? 'asc' : 'desc'
                      }))
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {header.label}
                      <span className={`transition-opacity ${sortConfig.key === header.key ? 'opacity-100' : 'opacity-20 group-hover:opacity-100'}`}>
                        {sortConfig.key === header.key && sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    </div>
                  </th>
                ))}
                <th>Photo</th>
                <th>Details</th>
                <th
                  className="cursor-pointer transition hover:text-[var(--accent)] group"
                  onClick={() => {
                    setSortConfig(prev => ({
                      key: 'deliveryDate',
                      direction: prev.key === 'deliveryDate' && prev.direction === 'desc' ? 'asc' : 'desc'
                    }))
                  }}
                >
                  <div className="flex items-center gap-1">
                    Dates
                    <span className={`transition-opacity ${sortConfig.key === 'deliveryDate' ? 'opacity-100' : 'opacity-20 group-hover:opacity-100'}`}>
                      {sortConfig.key === 'deliveryDate' && sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  </div>
                </th>
                <th className="min-w-[140px]">Status</th>
                <th className="min-w-[120px]">Progress</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isDataLoading ? (
                // Skeleton Table Rows
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td><div className="skeleton h-5 w-16 rounded" /></td>
                    <td><div className="skeleton h-5 w-32 rounded" /></td>
                    <td><div className="skeleton h-10 w-10 rounded-lg" /></td>
                    <td>
                      <div className="skeleton h-5 w-32 rounded mb-1" />
                      <div className="skeleton h-4 w-24 rounded" />
                    </td>
                    <td>
                      <div className="skeleton h-4 w-24 rounded mb-1" />
                      <div className="skeleton h-4 w-24 rounded" />
                    </td>
                    <td><div className="skeleton h-9 w-28 rounded-xl" /></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="skeleton h-2 w-16 rounded-full" />
                        <div className="skeleton h-4 w-8 rounded" />
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <div className="skeleton h-8 w-8 rounded-lg" />
                        <div className="skeleton h-8 w-8 rounded-lg" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : paginatedOrders.map((order) => {
                const progress = getProgress(order)
                return (
                  <tr
                    key={order.id}
                    ref={el => rowRefs.current[order.id] = el}
                    className={`group transition-colors duration-1000 ${highlightOrderId === order.id ? 'bg-[var(--accent-soft)]/50 ring-2 ring-[var(--accent)] ring-inset' : (order.status === 'Completed' ? 'bg-green-500/10' : '')}`}
                  >
                    <td className="font-medium text-[var(--text)]">#{order.id}</td>
                    <td>
                      <p className="font-semibold text-[var(--text)]">{order.clientName}</p>
                    </td>
                    <td>
                      {order.photo ? (
                        <img
                          src={order.photo}
                          alt="thumb"
                          className="h-10 w-10 rounded-lg object-cover cursor-pointer border border-[var(--border)] transition hover:opacity-80"
                          onClick={() => setImagePopup(order.photo)}
                        />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--soft)] text-[var(--muted)]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        </div>
                      )}
                    </td>
                    <td>
                      <p className="text-[var(--text)] font-medium">{order.product}</p>
                      <div className="flex flex-col gap-1 mt-1">
                        <div className="flex gap-2 items-center text-xs">
                          <span className="rounded bg-[var(--soft)] px-1.5 py-0.5 text-[var(--muted)]">{order.orderType}</span>
                          <span className="font-semibold text-[var(--accent)]">₹{order.price}</span>
                        </div>
                        {order.advance > 0 && (
                          <div className="text-[10px] font-semibold text-green-600">
                            Adv: ₹{order.advance} • Bal: ₹{(parseFloat(order.price || 0) - parseFloat(order.advance || 0)).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="text-[var(--muted)]">Order: <span className="font-medium text-[var(--text)]">{formatDateDDMMYY(order.orderDate)}</span></span>
                        <span className="text-[var(--muted)]">Delivery: <span className="font-medium text-[var(--text)]">{formatDateDDMMYY(order.deliveryDate)}</span></span>
                      </div>
                    </td>
                    <td>
                      <div className="relative group min-w-[120px]">
                        <select
                          className={`w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 pr-8 text-[11px] font-bold outline-none transition focus:border-[var(--accent)] cursor-pointer shadow-sm active:scale-95 ${order.status === 'Completed' ? 'text-green-600 border-green-500/30' :
                            order.status === 'Hold' ? 'text-orange-500 border-orange-500/30' :
                              'text-[var(--text)]'
                            }`}
                          value={order.status || 'Not Ready'}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          disabled={order.status === 'Sold'}
                        >
                          <option value="Not Ready">Not Ready</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Hold">Hold</option>
                          <option value="Completed">Completed</option>
                          <option value="Sold" disabled>Sold</option>
                        </select>
                        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                      {order.startDate && order.status !== 'Pending' && (
                        <p className="text-[var(--muted)] mt-1 !text-[10px]">Started: {formatDateDDMMYY(order.startDate)}</p>
                      )}
                      {(order.completedDate || order.closedDate) && (order.status === 'Completed' || order.status === 'Sold') && (
                        <p className="text-[var(--muted)] mt-0.5 !text-[10px]">Completed: {formatDateDDMMYY(order.completedDate || order.closedDate)}</p>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-full max-w-[80px] rounded-full bg-[var(--soft)] overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${order.status === 'Hold' ? 'bg-orange-500' : 'bg-[var(--accent)]'}`} style={{ width: `${progress}%` }}></div>
                        </div>
                        <span className="text-xs font-semibold text-[var(--text)]">{progress}%</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2 transition-opacity">
                        <button className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white" title="View Order" onClick={() => setViewOrder(order)}>
                          <Eye size={16} />
                        </button>
                        {currentUser?.role === 'Admin' && (
                          <>
                            {order.status !== 'Completed' && order.status !== 'Sold' && (
                              <button className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white" title="Edit Order" onClick={() => setEditOrder(order)}>
                                <Pencil size={16} />
                              </button>
                            )}
                            <button className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white" title="Delete Order" onClick={() => setOrderToDelete(order)}>
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {paginatedOrders.length === 0 && !isDataLoading && (
                <tr>
                  <td colSpan="8" className="text-center text-[var(--muted)]">No orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
            <span className="text-sm text-[var(--muted)]">Showing {(currentPageNum - 1) * itemsPerPage + 1} to {Math.min(currentPageNum * itemsPerPage, filteredOrders.length)} of {filteredOrders.length}</span>
            <div className="flex gap-2">
              <button
                disabled={currentPageNum === 1}
                onClick={() => setCurrentPageNum(prev => prev - 1)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] transition hover:bg-[var(--soft)] disabled:opacity-50 text-[var(--text)]"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={currentPageNum === totalPages}
                onClick={() => setCurrentPageNum(prev => prev + 1)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] transition hover:bg-[var(--soft)] disabled:opacity-50 text-[var(--text)]"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {imagePopup && (
        <div className="fixed inset-0 z-[2100] grid place-items-center bg-black/80 px-4 backdrop-blur-sm" onClick={() => setImagePopup(null)}>
          <div className="relative">
            <button className="absolute -top-4 -right-4 grid h-8 w-8 place-items-center rounded-full bg-[var(--surface)] text-[var(--text)] shadow-lg hover:bg-[var(--soft)]" onClick={() => setImagePopup(null)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <img src={imagePopup} alt="Reference" className="max-h-[80vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl border-4 border-white" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}
    </div>
  )
}

export default ViewOrdersPage;
