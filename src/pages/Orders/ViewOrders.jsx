import React, { useState, useEffect, useRef, useMemo } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, CircleDollarSign, ClipboardList, Search, Eye, Pencil, Trash2, CheckCircle, Clock, Play, Pause, CheckCircle2, Plus, X, Printer } from 'lucide-react'
import html2pdf from 'html2pdf.js'
import { formatDateDDMMYY, getIndianDate, orders } from '../../utils/constants'
import { sendWhatsApp } from "../../utils/whatsapp";
import supabase from '../../supabase'
import UndoToast from '../../components/UndoToast'

function ViewOrdersPage({ themeStyle, setCurrentPage, setSelectedClient, setClientDetailMode, showGlobalToast, currentUser, highlightOrderId, setHighlightOrderId, orders, setOrders, inventory, setInventory, clients, saveOrder, deleteOrder, cloudLoaded }) {
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
  const [sortConfig, setSortConfig] = useState({ key: 'updatedAt', direction: 'desc' })
  const [dateFilter, setDateFilter] = useState('All') // All, Today, Tomorrow, Week, Custom
  const [customDate, setCustomDate] = useState(getIndianDate())
  const [showWaPopup, setShowWaPopup] = useState(false)
  const [waData, setWaData] = useState({ phone: '', name: '', message: '', orderId: '' })
  const [showMeasurements, setShowMeasurements] = useState(false)

  const isDataLoading = !cloudLoaded || !orders;

  const saveOrders = (newOrders) => {
    setOrders(newOrders)
  }

  const handleDeleteConfirm = async () => {
    if (orderToDelete) {
      const idToDelete = orderToDelete.id;
      const order = { ...orderToDelete };

      setRecentlyDeletedOrder(order);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

      // 1. Restore Inventory Locally (Instant)
      let updatedInventory = [...inventory];
      if (order.sourceOfMaterial === 'Internal' && order.internalItems?.length > 0) {
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
      }

      // 2. Immediate Background Cloud Sync
      try {
        if (deleteOrder) {
          await deleteOrder(idToDelete);
        } else {
          await supabase.from('erp_orders').delete().eq('id', idToDelete);
        }

        // Sync restored inventory to Supabase
        if (order.sourceOfMaterial === 'Internal' && order.internalItems?.length > 0) {
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
      } catch (err) {
        console.error("Cloud delete failed:", err);
      }

      // 3. Optimistic UI update (Instant)
      const updated = orders.filter(o => o.id !== idToDelete)
      if (saveOrders) saveOrders(updated)
      setOrderToDelete(null)
      if (showGlobalToast) showGlobalToast('Order Deleted', `Order #${order.orderId || order.id} has been removed.`)

      undoTimeoutRef.current = setTimeout(() => {
        setRecentlyDeletedOrder(null);
      }, 8000);
    }
  }

  const handleUndoDelete = async () => {
    if (!recentlyDeletedOrder) return;

    // 1. Re-insert order to DB
    const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
    await supabase.from('erp_orders').upsert([{ id: recentlyDeletedOrder.id.toString(), data: clean(recentlyDeletedOrder) }]);

    // 2. Reverse Inventory Locally
    let updatedInventory = [...inventory];
    if (recentlyDeletedOrder.sourceOfMaterial === 'Internal' && recentlyDeletedOrder.internalItems?.length > 0) {
      recentlyDeletedOrder.internalItems.forEach(mat => {
        updatedInventory = updatedInventory.map(invItem => {
          if (invItem.id === mat.inventoryId || (mat.productId && invItem.productId === mat.productId)) {
            const currentQty = parseFloat(invItem.quantity) || 0;
            const restoreQty = parseFloat(mat.quantity) || 0;
            return { ...invItem, quantity: currentQty - restoreQty }; // Deduct it again
          }
          return invItem;
        });
      });
      setInventory(updatedInventory);

      // 3. Re-Sync Reversed inventory to DB
      updatedInventory.forEach(invItem => {
        const orig = inventory.find(i => i.id === invItem.id);
        if (orig && orig.quantity !== invItem.quantity) {
          supabase.from('erp_inventory').upsert([{ id: invItem.id.toString(), data: clean(invItem) }]).then(({ error }) => {
            if (error) console.error("Inventory sync failed:", error);
          });
        }
      });
    }

    if (saveOrders) {
      saveOrders(prev => prev.some(o => o.id === recentlyDeletedOrder.id) ? prev : [...prev, recentlyDeletedOrder]);
    }
    if (showGlobalToast) showGlobalToast('Restored', `Order #${recentlyDeletedOrder.orderId || recentlyDeletedOrder.id} has been restored.`);
    setRecentlyDeletedOrder(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  }

  const handleStatusChange = async (id, newStatus) => {
    const updated = orders.map(o => {
      if (o.id === id) {
        let newData = { ...o, status: newStatus, updatedAt: new Date().toISOString() }
        if (newStatus === 'In Progress' && !o.startDate) {
          newData.startDate = getIndianDate()
        }
        if (newStatus === 'Completed') {
          if (!o.completedDate) {
            newData.completedDate = getIndianDate()
          }
          if (!o.startDate) {
            newData.startDate = getIndianDate()
          }
        }
        if (newStatus === 'Not Ready' || newStatus === 'Pending') {
          newData.startDate = null;
          newData.completedDate = null;
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

    // Send WhatsApp notification when order is completed
    if (newStatus === 'Completed' && changedOrder) {
      const client = (clients || []).find(c => c.name === changedOrder.clientName);
      const phoneToUse = client?.mobile || changedOrder.clientPhone || '';

      let formattedPhone = String(phoneToUse).replace(/\D/g, '');
      if (formattedPhone.length === 10) {
        formattedPhone = '91' + formattedPhone;
      }

      const defaultMsg = `Hi ${changedOrder.clientName || 'Customer'}\nYour ${changedOrder.product || 'Item'} (#${changedOrder.orderId || changedOrder.id}) is ready for delivery. Please collect it.\n\nThank you,\nClassy Couture`;

      setWaData({
        phone: formattedPhone,
        name: changedOrder.clientName || 'Customer',
        message: defaultMsg,
        orderId: changedOrder.orderId || changedOrder.id
      });
      setShowWaPopup(true);
    }
  }

  const [activeFilter, setActiveFilter] = useState('All')

  const displayOrders = orders.filter(o => String(o.id) !== String(recentlyDeletedOrder?.id));

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

      if (sortConfig.key === 'updatedAt') {
        valA = a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.orderDate || 0).getTime()
        valB = b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.orderDate || 0).getTime()
      } else if (sortConfig.key === 'orderDate' || sortConfig.key === 'deliveryDate') {
        valA = new Date(valA || 0).getTime()
        valB = new Date(valB || 0).getTime()
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1

      // Fallback: If values are equal, sort by newest ID first
      const idA = Number(a.id) || 0
      const idB = Number(b.id) || 0
      return idB - idA
    });
  }, [filteredOrders, sortConfig]);

  // Scroll to highlight logic
  useEffect(() => {
    if (highlightOrderId) {
      // Clear filters to ensure the order is visible
      if (activeFilter !== 'All') setActiveFilter('All');
      if (dateFilter !== 'All') setDateFilter('All');
      if (searchQuery !== '') setSearchQuery('');

      // Use a timeout to allow state updates (filters) to apply and render
      setTimeout(() => {
        // Recalculate index based on the unfiltered orders
        const currentSorted = [...orders.filter(o => String(o.id) !== String(recentlyDeletedOrder?.id))].sort((a, b) => {
          if (a.status === 'Closed' && b.status !== 'Closed') return 1;
          if (a.status !== 'Closed' && b.status === 'Closed') return -1;
          let valA = a[sortConfig.key] || ''
          let valB = b[sortConfig.key] || ''
          if (sortConfig.key === 'updatedAt') {
            valA = a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.orderDate || 0).getTime()
            valB = b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.orderDate || 0).getTime()
          } else if (sortConfig.key === 'orderDate' || sortConfig.key === 'deliveryDate') {
            valA = new Date(valA || 0).getTime()
            valB = new Date(valB || 0).getTime()
          }
          if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
          if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1

          const idA = Number(a.id) || 0
          const idB = Number(b.id) || 0
          return idB - idA
        });

        const index = currentSorted.findIndex(o => String(o.id) === String(highlightOrderId));
        if (index !== -1) {
          const page = Math.floor(index / itemsPerPage) + 1;
          setCurrentPageNum(page);

          // Wait for pagination to render
          setTimeout(() => {
            const row = rowRefs.current[highlightOrderId] || rowRefs.current[String(highlightOrderId)] || rowRefs.current[Number(highlightOrderId)];
            if (row) {
              row.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Keep highlight for 3 seconds then clear
              setTimeout(() => {
                if (setHighlightOrderId) setHighlightOrderId(null);
              }, 3000);
            }
          }, 500);
        }
      }, 100);
    }
  }, [highlightOrderId, orders, recentlyDeletedOrder, sortConfig]);

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

  // Keep the viewOrder popup in sync with any background updates
  useEffect(() => {
    if (viewOrder) {
      const updatedOrder = orders.find(o => o.id === viewOrder.id);
      if (updatedOrder && JSON.stringify(updatedOrder) !== JSON.stringify(viewOrder)) {
        setViewOrder(updatedOrder);
      }
    }
  }, [orders, viewOrder]);

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

  const handlePrintReceipt = () => {
    const originalElement = document.getElementById('receipt-content');
    if (!originalElement) return;

    // Create a clone and convert it to an HTML string with display: block.
    // Passing a raw string to html2pdf completely avoids all DOM constraints, 
    // scroll offset issues, and blank page bugs while preventing any UI breaks.
    const clone = originalElement.cloneNode(true);
    clone.style.display = 'block';
    clone.style.width = '800px'; // Force exact width to prevent right-side clipping
    const htmlString = clone.outerHTML;

    const opt = {
      margin: [10, 0, 10, 0], // Remove left/right margins so it fits the A4 width perfectly
      filename: `Receipt_Order_${viewOrder.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, windowWidth: 800 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(htmlString).save().then(() => {
      if (showGlobalToast) showGlobalToast('Success', 'Receipt downloaded successfully');

      // Redirect to WhatsApp
      const client = (clients || []).find(c => c.name === viewOrder.clientName);
      const phoneToUse = client?.mobile || viewOrder.clientPhone || '';
      let formattedPhone = String(phoneToUse).replace(/\D/g, '');
      if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;

      const receiptUrl = `${window.location.origin}/?bill=${viewOrder.id}`;
      const msg = `Hello ${viewOrder.clientName || 'Valued Client'},\n\nThank you for choosing Classy Couture! Your order receipt has been generated.\n\nYou can view and download your digital receipt here:\n${receiptUrl}\n\nPlease let us know if you have any questions!`;

      const whatsappUrl = formattedPhone
        ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

      window.open(whatsappUrl, '_blank');
    }).catch((err) => {
      console.error("PDF generation failed:", err);
    });
  };

  return (
    <div style={themeStyle} className="relative">

      {recentlyDeletedOrder && (
        <UndoToast
          message="Deleted Order"
          highlight={`#${recentlyDeletedOrder.id}`}
          onUndo={handleUndoDelete}
          onClose={() => { setRecentlyDeletedOrder(null); if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current); }}
        />
      )}

      {viewOrder && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="absolute top-4 right-4 flex items-center gap-3">
              <button className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:brightness-95 transition text-sm font-semibold shadow-sm" onClick={handlePrintReceipt}>
                <Printer size={16} /> Print Receipt
              </button>
              <button className="text-[var(--muted)] hover:text-[var(--text)] transition p-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg" onClick={() => setViewOrder(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="flex items-center gap-4 mb-6 mt-4">
              <img src="/logo-black.png" alt="Logo" className="w-16 h-16 object-contain" />
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2">Order #{viewOrder.id}</h2>
                <p className="text-sm text-[var(--muted)]">Classy Couture</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Client Card */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex flex-col justify-center">
                <p className="text-xs font-medium text-[var(--muted)] mb-1.5">Client Name</p>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-[var(--surface-strong)] flex items-center justify-center text-sm font-semibold text-[var(--text)] border border-[var(--border)]">
                    {viewOrder.clientName?.charAt(0)?.toUpperCase()}
                  </div>
                  <p className="font-semibold text-[var(--text)] text-base truncate">{viewOrder.clientName}</p>
                </div>
              </div>

              {/* Status Card */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex flex-col justify-center">
                <p className="text-xs font-medium text-[var(--muted)] mb-2">Order Status</p>
                <div className="flex items-center">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium border
                    ${viewOrder.status === 'Completed' || viewOrder.status === 'Sold' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      viewOrder.status === 'In Progress' || viewOrder.status === 'Start' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                        viewOrder.status === 'Hold' ? 'bg-red-50 text-red-600 border-red-100' :
                          'bg-[var(--surface-strong)] text-[var(--text)] border-[var(--border)]'
                    }`}>
                    {viewOrder.status === 'Pending' ? 'Not Ready' : (viewOrder.status || 'Not Ready')}
                  </span>
                </div>
              </div>

              {/* Product Card */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex flex-col justify-center">
                <p className="text-xs font-medium text-[var(--muted)] mb-1">Product Details</p>
                <p className="font-semibold text-[var(--text)] text-sm">{viewOrder.product}</p>
                <p className="text-[13px] text-[var(--muted)] mt-0.5">{viewOrder.orderType} <span className="opacity-40 mx-1.5">•</span> ₹{viewOrder.price}</p>

                <div className="flex flex-wrap items-center gap-3 mt-2.5">
                  {viewOrder.advance > 0 && <span className="text-[11px] text-[var(--muted)] bg-[var(--surface-strong)] px-2 py-0.5 rounded-md border border-[var(--border)]">Adv: <span className="text-emerald-600 font-medium">₹{viewOrder.advance}</span> <span className="opacity-40 mx-1">•</span> Bal: <span className="font-medium">₹{(parseFloat(viewOrder.price || 0) - parseFloat(viewOrder.advance || 0)).toFixed(2)}</span></span>}
                  {viewOrder.size && <span className="text-[11px] text-[var(--muted)] bg-[var(--surface-strong)] px-2 py-0.5 rounded-md border border-[var(--border)]">Qty: <span className="font-medium text-[var(--text)]">{viewOrder.size}</span></span>}
                </div>
              </div>

              {/* Material Details Card */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex flex-col justify-start">
                <p className="text-xs font-medium text-[var(--muted)] mb-1">Material Source</p>
                <p className="text-sm font-semibold text-[var(--text)]">{viewOrder.sourceOfMaterial || 'Outside'}</p>

                {viewOrder.sourceOfMaterial === 'Internal' && viewOrder.internalItems && viewOrder.internalItems.length > 0 && (
                  <div className="mt-3 text-xs text-[var(--muted)]">
                    <div className="border-l-2 border-[var(--border)] pl-3 py-1 space-y-1.5">
                      {viewOrder.internalItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span>{item.quantity}x {item.productName}</span>
                          <span className="text-[var(--text)] font-medium">₹{(item.totalPrice || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-2.5 pl-3 font-medium text-[var(--text)]">
                      <span>Total Material</span>
                      <span>₹{viewOrder.internalItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-6">
              {viewOrder.notes && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-[var(--muted)] mb-1">Notes</p>
                  <p className="text-sm text-[var(--text)] bg-[var(--soft)] p-3 rounded-xl">{viewOrder.notes}</p>
                </div>
              )}

              {(() => {
                const clientObj = (clients || []).find(c => c.name?.toLowerCase().trim() === viewOrder.clientName?.toLowerCase().trim());
                const matchMeasure = clientObj?.measurements?.find(m => m.product?.toLowerCase().trim() === viewOrder.product?.toLowerCase().trim());
                if (!matchMeasure) return null;

                const topData = [];
                const bottomData = [];
                const otherData = [];

                if (matchMeasure.topMeasurements) {
                  Object.keys(matchMeasure.topMeasurements).forEach(k => {
                    const val = matchMeasure.topMeasurements[k];
                    if (val && typeof val === 'string' && val.trim() !== '') {
                      topData.push({ key: k, value: val });
                    }
                  });
                }
                if (matchMeasure.bottomMeasurements) {
                  Object.keys(matchMeasure.bottomMeasurements).forEach(k => {
                    const val = matchMeasure.bottomMeasurements[k];
                    if (val && typeof val === 'string' && val.trim() !== '') {
                      bottomData.push({ key: k, value: val });
                    }
                  });
                }

                // If old format or flat measurements exist
                Object.keys(matchMeasure).forEach(k => {
                  if (!['id', 'product', 'note', 'notes', 'timestamp', 'createdAt', 'topMeasurements', 'bottomMeasurements'].includes(k)) {
                    const val = matchMeasure[k];
                    if (val && typeof val === 'string' && val.trim() !== '') {
                      otherData.push({ key: k, value: val });
                    }
                  }
                });

                const totalItems = topData.length + bottomData.length + otherData.length;
                if (totalItems === 0) return null;

                const formatKey = (str) => {
                  return str.replace(/([A-Z])/g, ' $1').trim();
                };

                const renderSection = (title, data) => {
                  if (data.length === 0) return null;
                  return (
                    <div className="mb-4 last:mb-0">
                      <h4 className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-2.5 pb-1 border-b border-[var(--border)]">{title}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {data.map((item, idx) => (
                          <div key={idx} className="flex flex-col justify-center bg-[var(--surface-strong)] p-2.5 rounded-lg border border-[var(--border)] shadow-sm">
                            <span className="text-[10px] font-bold text-[var(--muted)] leading-tight uppercase mb-0.5">{formatKey(item.key)}</span>
                            <span className="text-sm font-black text-[var(--text)]">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="col-span-2">
                    <button
                      onClick={() => setShowMeasurements(!showMeasurements)}
                      className="w-full flex items-center justify-between bg-[var(--soft)] p-3 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] transition"
                    >
                      <p className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accent)]"><path d="M4 14l6-6 4 4 6-6" /><path d="M22 8v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8" /></svg>
                        Client Measurements ({totalItems})
                      </p>
                      {showMeasurements ? <ChevronDown size={16} className="text-[var(--muted)]" /> : <ChevronRight size={16} className="text-[var(--muted)]" />}
                    </button>
                    {showMeasurements && (
                      <div className="bg-[var(--soft)] p-4 rounded-xl border border-[var(--border)] mt-2">
                        {renderSection('Top Measurements', topData)}
                        {renderSection('Bottom Measurements', bottomData)}
                        {renderSection('Other Details', otherData)}
                      </div>
                    )}
                  </div>
                );
              })()}

              {viewOrder.audioNote && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-[var(--muted)] mb-1 flex items-center gap-2">
                    <Play size={14} className="text-[var(--accent)]" /> Voice Note
                  </p>
                  <audio controls src={viewOrder.audioNote} className="w-full h-10 rounded-xl outline-none" />
                </div>
              )}

              <div className="flex flex-wrap gap-4">
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
              </div>

              <div className="col-span-2 bg-[var(--soft)] p-5 rounded-2xl border border-[var(--border)] shadow-inner">
                <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-6 border-b border-[var(--border)] pb-2 flex items-center gap-2">
                  <Clock size={14} /> Order Timeline
                </p>
                <div className="relative flex flex-col sm:flex-row gap-6 sm:gap-0 justify-between w-full">
                  {/* Horizontal connecting line (hidden on mobile) */}
                  <div className="hidden sm:block absolute top-5 left-12 right-12 h-0.5 bg-[var(--border)] z-0"></div>

                  {/* Vertical connecting line (mobile only) */}
                  <div className="sm:hidden absolute top-5 bottom-5 left-5 w-0.5 bg-[var(--border)] z-0"></div>

                  {/* Step 1: Ordered */}
                  <div className="relative z-10 flex flex-row sm:flex-col items-center sm:items-center gap-4 sm:gap-3 w-full sm:w-1/3">
                    <div className="h-10 w-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-md ring-4 ring-[var(--soft)]">
                      <CalendarDays size={16} />
                    </div>
                    <div className="flex flex-col sm:items-center text-left sm:text-center w-full bg-[var(--surface-strong)] sm:bg-transparent p-3 sm:p-0 rounded-xl border border-[var(--border)] sm:border-none">
                      <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Ordered</span>
                      <span className="text-sm font-black text-[var(--text)] mt-0.5">{viewOrder.orderDate || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Step 2: Started */}
                  <div className={`relative z-10 flex flex-row sm:flex-col items-center sm:items-center gap-4 sm:gap-3 w-full sm:w-1/3 ${viewOrder.startDate ? '' : 'opacity-70 grayscale-[50%]'}`}>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-md ring-4 ring-[var(--soft)] transition-colors ${viewOrder.startDate ? 'bg-indigo-500 text-white' : 'bg-[var(--surface-strong)] text-[var(--muted)] border border-[var(--border)]'}`}>
                      <Play size={16} />
                    </div>
                    <div className="flex flex-col sm:items-center text-left sm:text-center w-full bg-[var(--surface-strong)] sm:bg-transparent p-3 sm:p-0 rounded-xl border border-[var(--border)] sm:border-none">
                      <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Started</span>
                      <span className="text-sm font-black text-[var(--text)] mt-0.5">{viewOrder.startDate || 'Pending'}</span>
                    </div>
                  </div>

                  {/* Step 3: Delivered/Completed */}
                  <div className={`relative z-10 flex flex-row sm:flex-col items-center sm:items-center gap-4 sm:gap-3 w-full sm:w-1/3 ${viewOrder.completedDate || viewOrder.status === 'Completed' || viewOrder.status === 'Sold' ? '' : 'opacity-70 grayscale-[50%]'}`}>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-md ring-4 ring-[var(--soft)] transition-colors ${viewOrder.completedDate || viewOrder.status === 'Completed' || viewOrder.status === 'Sold' ? 'bg-emerald-500 text-white' : 'bg-[var(--surface-strong)] text-[var(--muted)] border border-[var(--border)]'}`}>
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="flex flex-col sm:items-center text-left sm:text-center w-full bg-[var(--surface-strong)] sm:bg-transparent p-3 sm:p-0 rounded-xl border border-[var(--border)] sm:border-none">
                      <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Delivery</span>
                      <span className="text-sm font-black text-[var(--text)] mt-0.5">{viewOrder.deliveryDate || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button type="button" className="rounded-xl border border-[var(--border)] px-6 py-2.5 font-semibold hover:bg-[var(--soft)] transition" onClick={() => setViewOrder(null)}>Close</button>
            </div>
          </div>

          {/* Hidden Receipt Element for PDF Generation (Moved outside max-w-lg container to prevent clipping) */}
          <div id="receipt-content" style={{ display: 'none' }}>
            <div style={{ padding: '40px', fontFamily: '"Inter", sans-serif', color: '#1f2937', backgroundColor: '#fff', width: '800px', boxSizing: 'border-box', margin: '0 auto' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f3f4f6', paddingBottom: '30px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <img src="/logo-black.png" alt="Logo" style={{ width: '80px', height: '85px', objectFit: 'contain' }} />
                  <div>
                    <h1 style={{ margin: 0, fontSize: '32px', color: '#111827', fontWeight: '800', letterSpacing: '-0.5px' }}>Classy Couture</h1>
                    <p style={{ margin: '5px 0 0 0', fontSize: '15px', color: '#6b7280' }}>Be Unique, Be Classy</p>

                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ margin: 0, fontSize: '28px', color: '#111827', fontWeight: '700', letterSpacing: '2px' }}>INVOICE</h2>
                  <p style={{ margin: '8px 0 0 0', fontSize: '15px', color: '#4b5563', fontWeight: '600' }}>Order #{viewOrder.id}</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>Date: {viewOrder.orderDate ? formatDateDDMMYY(viewOrder.orderDate) : 'N/A'}</p>
                </div>
              </div>

              {/* Client & Delivery Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                <div style={{ flex: 1, paddingRight: '20px' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '1px', fontWeight: '600' }}>Billed To:</h3>
                  <p style={{ margin: 0, fontWeight: '700', fontSize: '20px', color: '#111827' }}>{viewOrder.clientName}</p>
                </div>
                <div style={{ flex: 1, paddingLeft: '20px', borderLeft: '2px solid #f3f4f6' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '1px', fontWeight: '600' }}>Delivery Information:</h3>
                  <p style={{ margin: 0, fontSize: '15px', color: '#4b5563' }}>Expected Delivery: <span style={{ fontWeight: '600', color: '#111827' }}>{viewOrder.deliveryDate ? formatDateDDMMYY(viewOrder.deliveryDate) : 'N/A'}</span></p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '15px', color: '#4b5563' }}>Material Source: <span style={{ fontWeight: '600', color: '#111827' }}>{viewOrder.sourceOfMaterial || 'Outside'}</span></p>
                </div>
              </div>

              {/* Order Details Table */}
              <div style={{ marginBottom: '40px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '12px 15px', borderTop: '2px solid #111827', borderBottom: '2px solid #111827', color: '#111827', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</th>
                      <th style={{ padding: '12px 15px', borderTop: '2px solid #111827', borderBottom: '2px solid #111827', color: '#111827', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</th>
                      <th style={{ padding: '12px 15px', borderTop: '2px solid #111827', borderBottom: '2px solid #111827', color: '#111827', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '12px 15px', borderTop: '2px solid #111827', borderBottom: '2px solid #111827', color: '#111827', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '20px 15px', borderBottom: '1px solid #e5e7eb', fontSize: '16px', fontWeight: '600', color: '#111827' }}>{viewOrder.product}</td>
                      <td style={{ padding: '20px 15px', borderBottom: '1px solid #e5e7eb', fontSize: '15px', color: '#4b5563' }}>{viewOrder.orderType || '-'}</td>
                      <td style={{ padding: '20px 15px', borderBottom: '1px solid #e5e7eb', fontSize: '15px', color: '#4b5563', textAlign: 'center' }}>{viewOrder.size || '1'}</td>
                      <td style={{ padding: '20px 15px', borderBottom: '1px solid #e5e7eb', fontSize: '16px', fontWeight: '600', color: '#111827', textAlign: 'right' }}>₹{parseFloat(viewOrder.price || 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Financial Summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '50px' }}>
                <div style={{ width: '380px', padding: '25px 15px 0 15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '16px' }}>
                    <span style={{ color: '#4b5563' }}>Subtotal:</span>
                    <span style={{ fontWeight: '600', color: '#111827' }}>₹{parseFloat(viewOrder.price || 0).toFixed(2)}</span>
                  </div>
                  {viewOrder.advance > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '16px' }}>
                      <span style={{ color: '#4b5563' }}>Advance Paid:</span>
                      <span style={{ fontWeight: '600', color: '#059669' }}>- ₹{parseFloat(viewOrder.advance || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #111827', fontSize: '22px' }}>
                    <span style={{ fontWeight: '800', color: '#111827' }}>Balance Due:</span>
                    <span style={{ fontWeight: '800', color: '#111827' }}>₹{(parseFloat(viewOrder.price || 0) - parseFloat(viewOrder.advance || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ textAlign: 'center', borderTop: '2px solid #f3f4f6', paddingTop: '30px', color: '#6b7280' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>Thank you for choosing Classy Couture!</p>
                <p style={{ margin: 0, fontSize: '14px' }}>If you have any questions concerning this invoice, please contact us.</p>
                <p style={{ margin: '20px 0 0 0', fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>This is a computer-generated document and does not require a signature.</p>
              </div>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-[var(--text)]">Order Type</span>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 outline-none transition focus:border-[var(--accent)] text-[var(--text)]"
                    value={editOrder.orderType || ''}
                    onChange={(e) => setEditOrder({ ...editOrder, orderType: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-[var(--text)]">Quantity</span>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 outline-none transition focus:border-[var(--accent)] text-[var(--text)]"
                    value={editOrder.size || ''}
                    onChange={(e) => setEditOrder({ ...editOrder, size: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-[var(--text)]">Est. Cost</span>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 outline-none transition focus:border-[var(--accent)] text-[var(--text)]"
                    value={editOrder.price || ''}
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

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--text)]">Material Source</span>
                <select
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 outline-none transition focus:border-[var(--accent)] text-[var(--text)]"
                  value={editOrder.sourceOfMaterial || 'Outside'}
                  onChange={(e) => setEditOrder({ ...editOrder, sourceOfMaterial: e.target.value })}
                >
                  <option value="Outside">Client Provided</option>
                  <option value="Internal">Studio Inventory</option>
                </select>
              </label>

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
                const finalOrder = { ...editOrder, updatedAt: new Date().toISOString() }
                saveOrders(orders.map(o => o.id === finalOrder.id ? finalOrder : o))
                if (saveOrder) saveOrder(finalOrder)
                setEditOrder(null)
                if (showGlobalToast) showGlobalToast('Success', 'Order updated successfully.')
              }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {showWaPopup && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-[#25D366] flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              Send WhatsApp Message
            </h2>
            <p className="text-sm text-[var(--muted)] mb-4">Send a delivery confirmation to <strong>{waData.name}</strong>.</p>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--text)]">WhatsApp Number</span>
                <input
                  type="text"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 outline-none transition focus:border-[var(--accent)] text-[var(--text)]"
                  value={waData.phone}
                  onChange={(e) => setWaData({ ...waData, phone: e.target.value })}
                  placeholder="e.g. 919876543210"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--text)]">Message</span>
                <textarea
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 outline-none transition focus:border-[var(--accent)] text-[var(--text)] min-h-[120px] resize-none"
                  value={waData.message}
                  onChange={(e) => setWaData({ ...waData, message: e.target.value })}
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="rounded-xl px-4 py-2 font-semibold hover:bg-[var(--soft)] transition" onClick={() => setShowWaPopup(false)}>Cancel</button>
              <button type="button" className="rounded-xl bg-[#25D366] px-4 py-2 font-semibold text-white shadow-lg transition hover:brightness-95 flex items-center gap-2" onClick={() => {
                if (waData.phone) {
                  let finalPhone = waData.phone.replace(/\D/g, '');
                  const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(waData.message)}`;
                  window.open(url, '_blank');
                } else {
                  if (showGlobalToast) showGlobalToast('Error', 'Please enter a valid WhatsApp number');
                  return;
                }
                setShowWaPopup(false);
              }}>
                Send via WhatsApp
              </button>
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
                <th className="min-w-[180px]">Status</th>
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
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="skeleton h-9 w-28 rounded-xl" />
                        <div className="skeleton h-4 w-6 rounded" />
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
                    className={`group transition-all duration-1000 ${highlightOrderId === order.id ? 'ring-2 ring-[var(--accent)] ring-inset' : ''}`}
                    style={{
                      background: progress > 0 ? `linear-gradient(to right, ${order.status === 'Completed' || order.status === 'Sold' ? 'rgba(34, 197, 94, 0.04)' :
                        order.status === 'Hold' ? 'rgba(249, 115, 22, 0.04)' :
                          'color-mix(in srgb, var(--accent) 4%, transparent)'
                        } ${progress}%, transparent ${progress}%)` : undefined
                    }}
                  >
                    <td className="font-medium text-[var(--text)]">#{order.id}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => {
                          const clientObj = (clients || []).find(c => c.name?.toLowerCase().trim() === order.clientName?.toLowerCase().trim());
                          if (clientObj && setSelectedClient && setClientDetailMode && setCurrentPage) {
                            setSelectedClient(clientObj);
                            setClientDetailMode('view');
                            setCurrentPage('client-detail');
                          } else if (!clientObj && showGlobalToast) {
                            showGlobalToast('Not Found', 'Client details could not be found.');
                          }
                        }}
                        className="font-semibold text-[var(--accent)] hover:underline text-left break-words"
                      >
                        {order.clientName}
                      </button>
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
                      <div className="flex items-center gap-2">
                        <div className="relative group min-w-[130px]">
                          <select
                            className={`relative z-10 w-full appearance-none rounded-xl border bg-[var(--surface-strong)] px-3 py-2 pr-8 text-[11px] font-bold outline-none transition cursor-pointer active:scale-95 ${order.status === 'Completed' || order.status === 'Sold' ? 'text-green-600 border-green-500/30' : order.status === 'Hold' ? 'text-orange-500 border-orange-500/30' : 'text-[var(--text)] border-[var(--border)]'}`}
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
                          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] z-10">
                            <ChevronDown size={14} />
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[var(--muted)] w-8 text-right">{progress}%</span>
                      </div>
                      {order.startDate && order.status !== 'Pending' && (
                        <p className="text-[var(--muted)] mt-1.5 !text-[10px]">Started: {formatDateDDMMYY(order.startDate)}</p>
                      )}
                      {(order.completedDate || order.closedDate) && (order.status === 'Completed' || order.status === 'Sold') && (
                        <p className="text-[var(--muted)] mt-0.5 !text-[10px]">Completed: {formatDateDDMMYY(order.completedDate || order.closedDate)}</p>
                      )}
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
                  <td colSpan="7" className="text-center text-[var(--muted)]">No orders found.</td>
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
