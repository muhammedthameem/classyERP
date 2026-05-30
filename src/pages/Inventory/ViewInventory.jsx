import React, { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Package, Search, Eye, Pencil, Trash2, Plus } from 'lucide-react'
import supabase from '../../supabase'
import UndoToast from '../../components/UndoToast'

function ViewInventoryPage({ themeStyle, setCurrentPage, currentUser, setSelectedInventoryItem, setInventoryDetailMode, showGlobalToast, highlightInventoryId, setHighlightInventoryId, inventory, setInventory, cloudLoaded }) {
  const rowRefs = useRef({});
  const [searchQuery, setSearchQuery] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);
  const [recentlyDeletedInventory, setRecentlyDeletedInventory] = useState(null);
  const undoTimeoutRef = useRef(null);

  const isDataLoading = !cloudLoaded || !inventory;

  const displayInventory = (inventory || []).filter(inv => inv.id !== recentlyDeletedInventory?.id);

  const filteredInventory = useMemo(() => {
    return [...displayInventory]
      .sort((a, b) => (b.id || 0) - (a.id || 0))
      .filter(item =>
        (item.productId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.productType || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [inventory, searchQuery]);

  // Scroll to highlight logic
  useEffect(() => {
    if (highlightInventoryId) {
      if (searchQuery !== '') setSearchQuery('');

      setTimeout(() => {
        const currentSorted = [...displayInventory].sort((a, b) => (b.id || 0) - (a.id || 0));

        const index = currentSorted.findIndex(item => String(item.productId) === String(highlightInventoryId) || String(item.id) === String(highlightInventoryId));
        if (index !== -1) {
          const page = Math.floor(index / itemsPerPage) + 1;
          setCurrentPageNum(page);
          
          setTimeout(() => {
            const row = rowRefs.current[highlightInventoryId] || rowRefs.current[String(highlightInventoryId)] || rowRefs.current[Number(highlightInventoryId)];
            if (row) {
              row.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setTimeout(() => {
                if (setHighlightInventoryId) setHighlightInventoryId(null);
              }, 3000);
            }
          }, 500);
        }
      }, 100);
    }
  }, [highlightInventoryId, inventory, recentlyDeletedInventory]);

  // Pagination Logic
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const itemsPerPage = 10;

  // Reset pagination to page 1 when search query changes
  useEffect(() => {
    setCurrentPageNum(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);

  useEffect(() => {
    if (totalPages > 0 && currentPageNum > totalPages) {
      setCurrentPageNum(totalPages);
    }
  }, [totalPages, currentPageNum]);

  const paginatedInventory = filteredInventory.slice((currentPageNum - 1) * itemsPerPage, currentPageNum * itemsPerPage);

  const handleDeleteConfirm = async () => {
    if (itemToDelete) {
      const idToDelete = itemToDelete.id;
      const item = { ...itemToDelete };

      setRecentlyDeletedInventory(item);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

      try {
        await supabase.from('erp_inventory').delete().eq('id', idToDelete);
      } catch (err) {
        console.error("Cloud delete failed:", err);
      }

      // 1. Optimistic UI Update (Instant)
      const updated = inventory.filter(inv => inv.id !== idToDelete);
      setInventory(updated);
      setItemToDelete(null);
      if (showGlobalToast) showGlobalToast('Deleted!', `Stock item "${item.productName}" removed.`);

      undoTimeoutRef.current = setTimeout(() => {
        setRecentlyDeletedInventory(null);
      }, 8000);
    }
  };

  const handleUndoDelete = async () => {
    if (!recentlyDeletedInventory) return;

    const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
    await supabase.from('erp_inventory').upsert([{ id: recentlyDeletedInventory.id.toString(), data: clean(recentlyDeletedInventory) }]);

    setInventory(prev => prev.some(i => i.id === recentlyDeletedInventory.id) ? prev : [...prev, recentlyDeletedInventory]);
    if (showGlobalToast) showGlobalToast('Restored', `Stock item "${recentlyDeletedInventory.productName}" has been restored.`);
    setRecentlyDeletedInventory(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  }

  return (
    <div style={themeStyle} className="relative">

      {/* Undo Popup */}
      {recentlyDeletedInventory && (
        <UndoToast
          message="Deleted Inventory"
          highlight={recentlyDeletedInventory.productName}
          onUndo={handleUndoDelete}
          onClose={() => { setRecentlyDeletedInventory(null); if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current); }}
        />
      )}

      {itemToDelete && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-[var(--text)]">Delete Inventory Item</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Are you sure you want to delete <span className="font-semibold text-[var(--text)]">{itemToDelete.productName}</span> (ID: {itemToDelete.productId})? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold transition hover:bg-[var(--soft)]"
                onClick={() => setItemToDelete(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                onClick={handleDeleteConfirm}
              >
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent)] mb-1">
            <Package size={16} /> Fabric & Supplies
          </p>
          <h1 className="text-h1">View Inventory</h1>
          <p className="text-para text-[var(--muted)] mt-2">Manage and search all inventory items</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <label className="flex sm:flex-1 h-11 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm text-[var(--muted)] shadow-sm">
            <Search size={17} />
            <input
              className="w-full bg-transparent outline-none placeholder:text-stone-400"
              placeholder="Search by ID, name, type..."
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition hover:brightness-95 active:scale-95 whitespace-nowrap"
            onClick={() => setCurrentPage('create-inventory')}
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add New Item</span>
            <span className="sm:hidden">Add Item</span>
          </button>
        </div>
      </div>

      <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur overflow-hidden">
        <div className="erp-table-container">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Product Info</th>
                <th>Category</th>
                <th>Stock / Unit</th>
                <th>Price (Final)</th>
                <th>Vendor</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isDataLoading ? (
                // Skeleton Table Rows
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td>
                      <div className="skeleton h-5 w-32 rounded mb-1" />
                      <div className="skeleton h-3 w-20 rounded" />
                    </td>
                    <td><div className="skeleton h-5 w-24 rounded" /></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="skeleton h-2 w-2 rounded-full" />
                        <div className="skeleton h-5 w-16 rounded" />
                      </div>
                    </td>
                    <td><div className="skeleton h-5 w-24 rounded" /></td>
                    <td><div className="skeleton h-5 w-28 rounded" /></td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <div className="skeleton h-8 w-8 rounded-lg" />
                        <div className="skeleton h-8 w-8 rounded-lg" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : paginatedInventory.length > 0 ? (
                paginatedInventory.map((item) => (
                  <tr 
                    key={item.id}
                    ref={el => rowRefs.current[item.id] = el}
                    className={`transition-all duration-1000 ${highlightInventoryId === item.id ? 'bg-[var(--accent-soft)]/50 ring-2 ring-[var(--accent)] ring-inset' : ''}`}
                  >
                    <td>
                      <p className="font-semibold text-[var(--text)]">{item.productName}</p>
                      <p className="text-[10px] text-[var(--muted)]">ID: {item.productId}</p>
                    </td>
                    <td className="text-[var(--muted)]">{item.productType}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${item.quantity > 10 ? 'bg-green-500' : item.quantity > 0 ? 'bg-orange-500' : 'bg-red-500'}`}></span>
                        <span className="font-medium text-[var(--text)]">{item.quantity} {item.unit}</span>
                      </div>
                    </td>
                    <td className="font-semibold text-[var(--accent)]">
                      ₹{item.finalPrice} <span className="text-[10px] text-[var(--muted)]">/ {item.unit}</span>
                    </td>
                    <td className="text-[var(--muted)]">{item.vendorName || '-'}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
                          title="View Details"
                          onClick={() => {
                            setSelectedInventoryItem(item);
                            setInventoryDetailMode('view');
                            setCurrentPage('inventory-detail');
                          }}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
                          title="Edit Item"
                          onClick={() => {
                            setSelectedInventoryItem(item);
                            setInventoryDetailMode('edit');
                            setCurrentPage('inventory-detail');
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        {currentUser?.role === 'Admin' && (
                          <button
                            className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
                            title="Delete Item"
                            onClick={() => setItemToDelete(item)}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center text-[var(--muted)]">
                    No inventory items found matching "{searchQuery}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
            <span className="text-sm text-[var(--muted)]">Showing {(currentPageNum - 1) * itemsPerPage + 1} to {Math.min(currentPageNum * itemsPerPage, filteredInventory.length)} of {filteredInventory.length}</span>
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
    </div>
  );
}

export default ViewInventoryPage;
