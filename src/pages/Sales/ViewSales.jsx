import React, { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Search, TrendingUp, Eye, Trash2, Download, Plus } from 'lucide-react'
import html2pdf from 'html2pdf.js'
import { orders } from '../../utils/constants'

import supabase from '../../supabase'

function ViewSalesPage({ themeStyle, setCurrentPage, showGlobalToast, currentUser, highlightSaleId, setHighlightSaleId, sales, setSales, inventory, setInventory, orders, setOrders, cloudLoaded }) {
  const rowRefs = useRef({});
  const [searchQuery, setSearchQuery] = useState('');
  const [viewSale, setViewSale] = useState(null);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [recentlyDeletedSale, setRecentlyDeletedSale] = useState(null);
  const undoTimeoutRef = useRef(null);
  const [isSendingPdf, setIsSendingPdf] = useState(false);

  const isDataLoading = !cloudLoaded || !sales;


  const handleDeleteConfirm = async () => {
    if (!saleToDelete) return;

    const idToDelete = saleToDelete.id;
    const sale = { ...saleToDelete };

    setRecentlyDeletedSale(sale);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

    // 1. Restore Stock/Orders Logic Locally
    let updatedInventory = [...inventory];
    let updatedOrders = [...orders];

    sale.items.forEach(soldItem => {
      if (soldItem.type === 'order') {
        updatedOrders = updatedOrders.map(o => o.id === soldItem.orderId ? { ...o, status: 'Completed' } : o);
      } else {
        updatedInventory = updatedInventory.map(p => p.id === soldItem.id ? { ...p, quantity: (p.quantity || 0) + soldItem.qty } : p);
      }
    });

    setInventory(updatedInventory);
    setOrders(updatedOrders);

    // 2. Immediate Background Cloud Sync
    try {
      await supabase.from('erp_sales').delete().eq('id', idToDelete);
      
      const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
      
      for (const soldItem of sale.items) {
        if (soldItem.type === 'order') {
          const orderToUpdate = updatedOrders.find(o => o.id === soldItem.orderId);
          if (orderToUpdate) {
            await supabase.from('erp_orders').upsert([{ id: orderToUpdate.id.toString(), data: clean(orderToUpdate) }]);
          }
        } else {
          const inventoryToUpdate = updatedInventory.find(p => p.id === soldItem.id);
          if (inventoryToUpdate) {
            await supabase.from('erp_inventory').upsert([{ id: inventoryToUpdate.id.toString(), data: clean(inventoryToUpdate) }]);
          }
        }
      }
    } catch (err) {
      console.error("Cloud delete failed:", err);
    }

    // 3. Optimistic UI update (Instant)
    const updatedSales = sales.filter(s => s.id !== idToDelete);
    setSales(updatedSales);
    setSaleToDelete(null);
    if (showGlobalToast) showGlobalToast('Sale Deleted', `Sales record #${sale.saleId || sale.id} removed.`);

    undoTimeoutRef.current = setTimeout(() => {
      setRecentlyDeletedSale(null);
    }, 8000);
  };

  const handleUndoDelete = async () => {
    if (!recentlyDeletedSale) return;
    
    // 1. Re-insert sale to DB
    const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
    await supabase.from('erp_sales').upsert([{ id: recentlyDeletedSale.id.toString(), data: clean(recentlyDeletedSale) }]);

    // 2. Reverse Stock/Orders locally
    let updatedInventory = [...inventory];
    let updatedOrders = [...orders];

    recentlyDeletedSale.items.forEach(soldItem => {
        if (soldItem.type === 'order') {
          updatedOrders = updatedOrders.map(o => o.id === soldItem.orderId ? { ...o, status: 'Ready' } : o);
        } else {
          updatedInventory = updatedInventory.map(p => p.id === soldItem.id ? { ...p, quantity: (p.quantity || 0) - soldItem.qty } : p);
        }
    });
    setInventory(updatedInventory);
    setOrders(updatedOrders);

    // 3. Re-Sync Reversed stock to DB
    for (const soldItem of recentlyDeletedSale.items) {
        if (soldItem.type === 'order') {
            const orderToUpdate = updatedOrders.find(o => o.id === soldItem.orderId);
            if (orderToUpdate) await supabase.from('erp_orders').upsert([{ id: orderToUpdate.id.toString(), data: clean(orderToUpdate) }]);
        } else {
            const inventoryToUpdate = updatedInventory.find(p => p.id === soldItem.id);
            if (inventoryToUpdate) await supabase.from('erp_inventory').upsert([{ id: inventoryToUpdate.id.toString(), data: clean(inventoryToUpdate) }]);
        }
    }

    setSales(prev => prev.some(s => s.id === recentlyDeletedSale.id) ? prev : [...prev, recentlyDeletedSale]);
    if (showGlobalToast) showGlobalToast('Restored', `Sales record #${recentlyDeletedSale.saleId || recentlyDeletedSale.id} has been restored.`);
    setRecentlyDeletedSale(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  }

  const displaySales = sales.filter(s => String(s.id) !== String(recentlyDeletedSale?.id));

  const filteredSales = useMemo(() => {
    return displaySales.filter(s => {
      const sId = (s.saleId || '').toString().toLowerCase();
      const cName = (s.client?.name || s.client || '').toString().toLowerCase();
      const query = searchQuery.toLowerCase();
      return sId.includes(query) || cName.includes(query);
    });
  }, [sales, searchQuery]);

  // Sort sales: Newest first (using timestamp or id as fallback)
  const sortedSales = useMemo(() => {
    return [...filteredSales].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.id || 0).getTime();
      const timeB = new Date(b.timestamp || b.id || 0).getTime();
      return timeB - timeA;
    });
  }, [filteredSales]);

  // Scroll to highlight logic
  useEffect(() => {
    if (highlightSaleId) {
      const index = sortedSales.findIndex(s => s.saleId === highlightSaleId);
      if (index !== -1) {
        const page = Math.floor(index / itemsPerPage) + 1;
        setCurrentPageNum(page);

        setTimeout(() => {
          const row = rowRefs.current[highlightSaleId];
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
              if (setHighlightSaleId) setHighlightSaleId(null);
            }, 3000);
          }
        }, 300);
      }
    }
  }, [highlightSaleId, sortedSales]);

  // Pagination Logic
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const itemsPerPage = 10;

  // Reset pagination to page 1 when search query changes
  useEffect(() => {
    setCurrentPageNum(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(sortedSales.length / itemsPerPage);

  useEffect(() => {
    if (totalPages > 0 && currentPageNum > totalPages) {
      setCurrentPageNum(totalPages);
    }
  }, [totalPages, currentPageNum]);

  const paginatedSales = sortedSales.slice((currentPageNum - 1) * itemsPerPage, currentPageNum * itemsPerPage);

  return (
    <div style={themeStyle} className="relative space-y-6">

      {/* Undo Popup */}
      {recentlyDeletedSale && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[3000] animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-5 py-3.5 text-sm font-medium text-[var(--text)] shadow-2xl backdrop-blur-md">
            <span>Deleted Sale <strong className="text-[var(--accent)]">#{recentlyDeletedSale.saleId || recentlyDeletedSale.id}</strong></span>
            <button
              onClick={handleUndoDelete}
              className="rounded-lg bg-[var(--accent)] px-4 py-1.5 font-bold text-white transition hover:opacity-90 active:scale-95 shadow-sm"
            >
              Undo
            </button>
            <button onClick={() => { setRecentlyDeletedSale(null); if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current); }} className="text-[var(--muted)] hover:text-[var(--text)] transition ml-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent)] mb-1">
            <TrendingUp size={16} /> Sales History
          </p>
          <h1 className="text-h1">View Sales</h1>
          <p className="text-para text-[var(--muted)] mt-2">Track all boutique transactions and manage records.</p>
        </div>
        <button
          onClick={() => setCurrentPage('create-sales')}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition hover:brightness-95 active:scale-95 whitespace-nowrap"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">New Transaction</span>
          <span className="sm:hidden">New Sale</span>
        </button>
      </div>

      <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <label className="flex sm:flex-1 h-11 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm text-[var(--muted)] shadow-sm focus-within:border-[var(--accent)] transition-colors">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by Sale ID or Client..."
              className="w-full bg-transparent outline-none placeholder:text-stone-400 font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
        </div>

        <div className="erp-table-container">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Date & ID</th>
                <th>Client</th>
                <th>Items Sold</th>
                <th className="text-right">Total Amount</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isDataLoading ? (
                // Skeleton Table Rows
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td>
                      <div className="skeleton h-5 w-24 rounded mb-1" />
                      <div className="skeleton h-3 w-32 rounded" />
                    </td>
                    <td><div className="skeleton h-5 w-32 rounded" /></td>
                    <td><div className="skeleton h-5 w-48 rounded" /></td>
                    <td className="text-right"><div className="skeleton h-7 w-24 rounded ml-auto" /></td>
                    <td>
                      <div className="flex justify-center gap-2">
                        <div className="skeleton h-8 w-8 rounded-lg" />
                        <div className="skeleton h-8 w-8 rounded-lg" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : paginatedSales.map(sale => (
                <tr
                  key={sale.id}
                  ref={el => rowRefs.current[sale.saleId] = el}
                  className={`transition-all duration-1000 ${highlightSaleId === sale.saleId ? 'bg-[var(--accent-soft)]/50 ring-2 ring-[var(--accent)] ring-inset' : ''}`}
                >
                  <td>
                    <p className="font-bold text-[var(--text)]">{sale.saleId}</p>
                    <p className="text-[10px] text-[var(--muted)] uppercase font-semibold">{new Date(sale.timestamp).toDateString() === new Date().toDateString() ? new Date(sale.timestamp).toLocaleString() : new Date(sale.timestamp).toLocaleDateString()}</p>
                  </td>
                  <td>
                    <p className="font-semibold text-[var(--text)]">{sale.client?.name || 'Guest'}</p>
                  </td>
                  <td>
                    <div className="max-w-[200px] overflow-hidden flex flex-wrap gap-1">
                      {sale.items.map((item, idx) => (
                        <span key={idx} className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${item.type === 'order' ? 'bg-purple-100 text-purple-700' : 'bg-[var(--accent-soft)] text-[var(--accent)]'}`}>
                          {item.qty}x {item.productName}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-right">
                    <p className="text-lg font-black text-[var(--accent)]">
                      ₹{sale.items.reduce((sum, item) => sum + ((parseFloat(item.price) || parseFloat(item.rate) || 0) * (item.qty || 0)) - (parseFloat(item.discount) || 0), 0).toFixed(2)}
                    </p>
                    {sale.paymentMode && (
                      <span className="inline-block mt-1 rounded bg-[var(--soft)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--muted)] uppercase">{sale.paymentMode}</span>
                    )}
                  </td>
                  <td>
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setViewSale(sale)} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition" title="View Details">
                        <Eye size={16} />
                      </button>
                      {currentUser?.role === 'Admin' && (
                        <button onClick={() => setSaleToDelete(sale)} className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition" title="Delete Sale">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && !isDataLoading && (
                <tr>
                  <td colSpan="5" className="text-center text-[var(--muted)] font-medium">No sales records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
            <span className="text-sm text-[var(--muted)]">Showing {(currentPageNum - 1) * itemsPerPage + 1} to {Math.min(currentPageNum * itemsPerPage, filteredSales.length)} of {filteredSales.length}</span>
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

      {/* View Sale Modal */}
      {viewSale && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${isSendingPdf ? 'cursor-wait' : 'cursor-pointer'}`} onClick={() => !isSendingPdf && setViewSale(null)}></div>
          <div className="relative w-full max-w-2xl rounded-3xl bg-[var(--surface)] p-8 shadow-2xl border border-[var(--border)] animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src="/logo-black.png" alt="Logo" className="w-16 h-16 object-contain" />
                <div>
                  <h3 className="text-2xl font-bold text-[var(--text)]">Sale Details</h3>
                  <p className="text-sm text-[var(--muted)]">{viewSale.saleId} • {new Date(viewSale.timestamp).toDateString() === new Date().toDateString() ? new Date(viewSale.timestamp).toLocaleString() : new Date(viewSale.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
              <button 
                disabled={isSendingPdf}
                onClick={() => setViewSale(null)} 
                className="h-10 w-10 grid place-items-center rounded-xl hover:bg-[var(--soft)] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="mb-8 space-y-6">
              {/* Receipt Visual Container */}
              <div id="printable-bill-view" className="mb-8 bg-white p-4 text-black shadow-inner overflow-hidden mx-auto" style={{ width: '97mm', minHeight: '120mm', fontFamily: 'monospace' }}>
                <div className="text-center mb-4 border-b-2 border-dashed border-gray-300 pb-4">
                  <img src="/logo-black.png" alt="Logo" className="w-28 h-32 mx-auto mb-4 object-contain" />
                  <h3 className="uppercase tracking-tight !text-[24px] !font-extrabold">Classy Couture</h3>
                  <p className="text-[10px] font-medium">Be Unique, Be Classy</p>
                  <p style={{ margin: '2px 0', fontSize: '12px' }}>Ph : 8606154015</p>
                  <div className="mt-2 text-gray-500">
                    <p className='!text-[10px]'>Order ID: {viewSale.saleId}</p>
                    <p className='!text-[10px]'>{new Date(viewSale.timestamp).toDateString() === new Date().toDateString() ? new Date(viewSale.timestamp).toLocaleString() : new Date(viewSale.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="mb-4 text-[11px]">
                  <p className="font-bold">Customer: {viewSale.client?.name || 'Guest'}</p>
                  {viewSale.client?.phone && <p>Tel: {viewSale.client.phone}</p>}
                </div>

                <table className="w-full text-[10px] mb-4">
                  <thead>
                    <tr className="border-b border-dashed border-gray-300 text-left">
                      <th className="py-1 min-w-[100px] pr-2">Item</th>
                      <th className="py-1 text-center px-3">Qty</th>
                      <th className="py-1 text-right px-3 whitespace-nowrap">Disc (₹/%)</th>
                      <th className="py-1 text-right pl-3 whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashed divide-gray-200">
                    {viewSale.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 pr-2">
                          <p className="font-bold">{item.productName.replace(/\s*\(Order #[^)]+\)/g, '')}</p>
                          <div className="flex flex-col mt-0.5">
                            <p style={{ fontSize: '12px', fontWeight: 700 }} className="opacity-70">Rate: ₹{item.price || item.rate}</p>
                          </div>
                        </td>
                        <td className="py-2 text-center px-3">{item.qty}</td>
                        <td className="py-2 text-right px-3">
                          {item.rowTotal !== undefined ? '₹' : ''}{item.discount || 0}{item.rowTotal !== undefined ? '' : '%'}
                        </td>
                        <td className="py-2 text-right pl-3 font-bold">
                          ₹{(item.rowTotal !== undefined 
                            ? item.rowTotal 
                            : (item.qty * (item.price || item.rate)) * (1 - (item.discount || 0) / 100)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t-2 border-dashed border-gray-300 pt-3 space-y-1">
                  <div className="flex justify-between text-sm font-black">
                    <span>Grand Total</span>
                    <span>₹{((viewSale.items || []).reduce((s, i) => s + ((i.price || i.rate) * i.qty), 0) - (viewSale.items?.reduce((s, i) => s + (parseFloat(i.discount) || 0), 0) || 0)).toFixed(2)}</span>
                  </div>
                  {viewSale.paymentMode && (
                    <div className="flex justify-between text-[11px] font-bold text-gray-500 mt-1">
                      <span>Payment Mode</span>
                      <span className="uppercase">{viewSale.paymentMode}</span>
                    </div>
                  )}
                </div>

                <div className="text-center mt-6 text-[9px] text-gray-500 italic border-t border-dashed border-gray-200 pt-4">
                  <p className="font-bold text-black mb-1">Thank you for shopping!</p>
                  <p>Your elegance is our priority.</p>
                  <p>Please visit again for more unique designs.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    if (showGlobalToast) showGlobalToast('Preparing Receipt', 'Generating your professional bill...');

                    const container = document.createElement('div');
                    container.style.width = '97mm';
                    container.style.padding = '5mm';
                    container.style.color = '#000';
                    container.style.fontFamily = 'monospace';

                    let itemsHtml = viewSale.items.map(item => {
                      const finalTotal = item.rowTotal !== undefined 
                        ? item.rowTotal 
                        : (item.qty * (item.price || item.rate)) * (1 - (item.discount || 0) / 100);
                      const discDisplay = item.rowTotal !== undefined 
                        ? `₹${parseFloat(item.discount || 0).toFixed(0)}` 
                        : `${item.discount || 0}%`;

                      return `
                      <tr>
                        <td style="padding: 4px 8px 4px 0; border-bottom: 1px dashed #eee;">
                          <div style="font-weight: bold; font-size: 11px;">${item.productName.replace(/\s*\(Order #[^)]+\)/g, '')}</div>
                          <div style="font-size: 12px; font-weight: 700; color: #666; margin-top: 1px;">Rate: ₹${item.price || item.rate}</div>
                        </td>
                        <td style="text-align: center; font-size: 11px; padding: 4px 10px;">${item.qty}</td>
                        <td style="text-align: right; font-size: 11px; padding: 4px 10px;">${discDisplay}</td>
                        <td style="text-align: right; font-size: 11px; font-weight: bold; padding: 4px 0 4px 10px;">₹${parseFloat(finalTotal).toFixed(2)}</td>
                      </tr>
                    `}).join('');
                    
                    const subtotal = viewSale.items.reduce((s, i) => s + (i.rate * i.qty), 0);
                    const totDisc = viewSale.items.reduce((s, i) => s + (parseFloat(i.discount) || 0), 0);

                    container.innerHTML = `
                      <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px dashed #000; padding-bottom: 10px;">
                        <img src="/logo-black.png" style="width: 80px; height: auto; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto;" />
                        <h2 style="margin: 0; font-size: 24px; text-transform: uppercase; font-weight: 900; letter-spacing: -0.5px;">Classy Couture</h2>
                        <p style="margin: 2px 0; font-size: 10px;">Be Unique, Be Classy</p>
                        <p style="margin: 2px 0; font-size: 12px;">Ph : 8606154015</p>
                        <div style="margin-top: 8px; font-size: 10px; color: #333;">
                          <p style="margin: 2px 0;">ID: ${viewSale.saleId}</p>
                          <p style="margin: 2px 0;">Date: ${new Date(viewSale.timestamp).toDateString() === new Date().toDateString() ? new Date(viewSale.timestamp).toLocaleString() : new Date(viewSale.timestamp).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div style="margin-bottom: 15px; font-size: 11px;">
                        <p style="margin: 2px 0;"><strong>Customer:</strong> ${viewSale.client?.name || 'Guest'}</p>
                        ${viewSale.client?.phone ? `<p style="margin: 2px 0;"><strong>Tel:</strong> ${viewSale.client.phone}</p>` : ''}
                      </div>

                      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                        <thead>
                          <tr style="border-bottom: 1px dashed #000; font-size: 10px; text-align: left;">
                            <th style="padding: 5px 8px 5px 0; min-width: 30mm;">Item</th>
                            <th style="text-align: center; padding: 5px 10px; white-space: nowrap;">Qty</th>
                            <th style="text-align: right; padding: 5px 10px; white-space: nowrap;">Disc (%)</th>
                            <th style="text-align: right; padding: 5px 0 5px 10px; white-space: nowrap;">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${itemsHtml}
                        </tbody>
                      </table>

                      <div style="border-top: 2px dashed #000; padding-top: 10px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900;">
                          <span>Grand Total</span>
                          <span>₹${(subtotal - totDisc).toFixed(2)}</span>
                        </div>
                        ${viewSale.paymentMode ? `
                        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #555; margin-top: 5px;">
                          <span>Payment Mode</span>
                          <span style="text-transform: uppercase;">${viewSale.paymentMode}</span>
                        </div>
                        ` : ''}
                      </div>

                      <div style="text-align: center; margin-top: 30px; font-size: 10px; border-top: 1px dashed #ccc; padding-top: 15px; font-style: italic; color: #555; line-height:1.2">
                        <p style="margin: 2px 0; font-weight: bold; color: #000;">Thank you for shopping!</p>
                        <p style="margin: 2px 0; font-size:10px">Your elegance is our priority.</p>
                        <p style="margin: 2px 0; font-size:10px">Please visit again for more unique designs.</p>
                      </div>
                    `;

                    const opt = {
                      margin: 0,
                      filename: `Receipt_${viewSale.saleId}.pdf`,
                      image: { type: 'jpeg', quality: 1 },
                      html2canvas: { scale: 3, useCORS: true },
                      jsPDF: { unit: 'mm', format: [97, 200], orientation: 'portrait' }
                    };

                    html2pdf().set(opt).from(container.outerHTML).save().then(() => {
                      if (showGlobalToast) showGlobalToast('Success', 'Receipt downloaded successfully.');
                    });
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] py-3 text-sm font-bold transition hover:bg-[var(--soft)]"
                >
                  <Download size={18} /> Print Bill
                </button>
                <button
                  disabled={isSendingPdf}
                  onClick={async () => {
                    try {
                      setIsSendingPdf(true);
                      if (showGlobalToast) showGlobalToast('Generating', 'Uploading receipt PDF to secure server...');

                      const visualBill = document.getElementById('printable-bill-view');
                      if (!visualBill) {
                        if (showGlobalToast) showGlobalToast('Error', 'Receipt container not found.');
                        return;
                      }

                      const opt = {
                        margin: 0,
                        filename: `Receipt_${viewSale.saleId}.pdf`,
                        image: { type: 'jpeg', quality: 1 },
                        html2canvas: { scale: 2, useCORS: true },
                        jsPDF: { unit: 'mm', format: [97, 200], orientation: 'portrait' }
                      };

                      const fileName = `receipts/${viewSale.saleId}.pdf`;
                      
                      const pdfBlob = await html2pdf().set(opt).from(visualBill.outerHTML).output('blob');

                      const { data, error: uploadError } = await supabase.storage
                        .from('receipts')
                        .upload(fileName, pdfBlob, {
                          contentType: 'application/pdf',
                          cacheControl: '3600',
                          upsert: true
                        });

                      if (uploadError) {
                        console.warn('Supabase Upload Error:', uploadError);
                        alert(`Upload Error: ${uploadError.message || JSON.stringify(uploadError)}`);
                        throw uploadError;
                      }

                      const { data: { publicUrl } } = supabase.storage
                        .from('receipts')
                        .getPublicUrl(fileName);

                      const appUrlObj = new URL(window.location.origin);
                      appUrlObj.searchParams.set('bill', viewSale.saleId);
                      const finalAppUrl = appUrlObj.toString();

                      const greeting = "Thank you for choosing Classy Couture! Your elegance is our priority.";
                      let msg = `*✨ INVOICE: ${viewSale.saleId} ✨*\n`;
                      msg += `------------------------------\n`;
                      msg += `Hello *${viewSale.client?.name || 'Guest'}*,\n`;
                      msg += `${greeting}\n\n`;

                      msg += `*ORDER SUMMARY:*\n`;
                      viewSale.items.forEach(item => {
                        const itemPrice = parseFloat(item.price || 0).toFixed(2);
                        const clientSuffix = item.clientName ? ` (Client: ${item.clientName})` : '';
                        msg += `* ${item.productName}${clientSuffix} (x${item.qty}) - ₹${itemPrice}\n`;
                      });

                      const grandTotal = parseFloat(viewSale.total || 0).toFixed(2);
                      msg += `\nGrand Total: *₹${grandTotal}*\n`;
                      msg += `------------------------------\n`;
                      msg += `📄 *View Digital Receipt:*\n${finalAppUrl}\n\n`;
                      msg += `Visit again for more unique designs!\n`;
                      msg += `*Classy Couture - Be Unique, Be Classy*`;

                      const phone = viewSale.client?.phone ? viewSale.client.phone.replace(/[^0-9]/g, '') : '';
                      const formattedPhone = phone.length === 10 ? `91${phone}` : phone;
                      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                    } catch (err) {
                      console.error('WhatsApp Share Error:', err);
                      const appUrlObj = new URL(window.location.origin);
                      appUrlObj.searchParams.set('bill', viewSale.saleId);
                      const finalAppUrl = appUrlObj.toString();
                      // Fallback: Send message WITH APP link even if PDF upload fails
                      const greeting = "Thank you for choosing Classy Couture! Your elegance is our priority.";
                      let msg = `*✨ INVOICE: ${viewSale.saleId} ✨*\n`;
                      msg += `------------------------------\n`;
                      msg += `Hello *${viewSale.client?.name || 'Guest'}*,\n`;
                      msg += `${greeting}\n\n`;
                       msg += `*ORDER SUMMARY:*\n`;
                      viewSale.items.forEach(item => {
                        const itemPrice = parseFloat(item.price || 0).toFixed(2);
                        const clientSuffix = item.clientName ? ` (Client: ${item.clientName})` : '';
                        msg += `* ${item.productName}${clientSuffix} (x${item.qty}) - ₹${itemPrice}\n`;
                      });
                      const grandTotalFallback = parseFloat(viewSale.total || 0).toFixed(2);
                      msg += `\nGrand Total: *₹${grandTotalFallback}*\n`;
                      msg += `------------------------------\n`;
                      msg += `📄 *View Digital Receipt:*\n${finalAppUrl}\n\n`;
                      msg += `Visit again for more unique designs!\n`;
                      msg += `*Classy Couture - Be Unique, Be Classy*`;

                      const phone = viewSale.client?.phone ? viewSale.client.phone.replace(/[^0-9]/g, '') : '';
                      const formattedPhone = phone.length === 10 ? `91${phone}` : phone;
                      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');

                      if (showGlobalToast) showGlobalToast('Warning', 'Bill sent without PDF link (Supabase storage not ready).');
                    } finally {
                      setIsSendingPdf(false);
                      // CLEANUP stuck html2pdf overlays
                      setTimeout(() => {
                        const stuckOverlays = document.querySelectorAll('.html2pdf__overlay');
                        stuckOverlays.forEach(o => o.remove());
                      }, 500);
                    }
                  }}
                  className={`flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3 text-sm font-bold text-white shadow-lg shadow-[#25D366]/20 transition hover:brightness-95 ${isSendingPdf ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="fill-white"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.4 8.38 8.38 0 0 1 3.8.9L22 4Z" /></svg>
                  {isSendingPdf ? 'Generating Link...' : 'WhatsApp'}
                </button>
              </div>
            </div>

            <button onClick={() => setViewSale(null)} className="w-full rounded-2xl bg-[var(--accent)] py-4 font-bold text-white shadow-xl shadow-[var(--accent)]/30 transition hover:brightness-95">Close Details</button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {saleToDelete && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSaleToDelete(null)}></div>
          <div className="relative w-full max-w-md rounded-3xl bg-[var(--surface)] p-8 shadow-2xl border border-[var(--border)] animate-in fade-in zoom-in duration-200">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 mx-auto">
              <Trash2 size={32} />
            </div>
            <h3 className="mb-2 text-center text-xl font-bold text-[var(--text)]">Confirm Deletion</h3>
            <p className="mb-8 text-center text-[var(--muted)] leading-relaxed">
              Are you sure you want to delete sale <span className="font-bold text-[var(--text)]">{saleToDelete.saleId}</span>?
              Stock for inventory items will be restored and orders will be reverted to 'Completed' status.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setSaleToDelete(null)} className="flex-1 rounded-xl border border-[var(--border)] py-3 font-bold text-[var(--text)] transition hover:bg-[var(--soft)]">Cancel</button>
              <button onClick={handleDeleteConfirm} className="flex-1 rounded-xl bg-red-500 py-3 font-bold text-white transition hover:bg-red-600 shadow-lg shadow-red-200">Delete Sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewSalesPage;
