import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, Search, Settings, ShoppingBag, Pencil, Trash2, Plus, Package, Info, Calendar, UsersRound, CheckCircle } from 'lucide-react'
import { formatDateDDMMYY, getIndianDate, orders, products } from '../../utils/constants'
import CustomDatePicker from '../../components/CustomDatePicker'

function AddOrderPage({ themeStyle, setCurrentPage, showGlobalToast, orders, setOrders, clients, inventory, setInventory, orderTypes, setOrderTypes, productTypes, setProductTypes, inventoryUnits, setInventoryUnits, saveOrder, saveConfig }) {
  const [clientName, setClientName] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [clientsList, setClientsList] = useState(clients)
  const [allOrders, setAllOrders] = useState(orders)

  // Global order metadata
  const [photoPreview, setPhotoPreview] = useState(null)
  const [notes, setNotes] = useState('')
  // Multiple Products (Order Items)
  const [orderItems, setOrderItems] = useState([
    {
      id: Date.now(),
      product: '',
      orderType: '',
      price: '',
      quantity: '',
      unit: 'nos',
      sourceOfMaterial: 'Outside',
      internalItems: [],
      notes: '',
      showTypeDropdown: false,
      showProductTypeDropdown: false,
      showInventoryDropdown: null,
      orderDate: getIndianDate(),
      deliveryDate: ''
    }
  ])

  const lastItemRef = useRef(null)
  const isInitialMount = useRef(true)
  const prevLengthRef = useRef(orderItems.length)

  // Auto-scroll to current last item (Addition or Deletion) - Ignore initial mount & no-change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevLengthRef.current = orderItems.length;
      return;
    }

    if (orderItems.length !== prevLengthRef.current) {
      if (lastItemRef.current) {
        lastItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      prevLengthRef.current = orderItems.length;
    }
  }, [orderItems.length]);

  const productTypesList = productTypes || []
  const unitsList = inventoryUnits || []

  const [dailyOrderLimit, setDailyOrderLimit] = useState(6)
  const [specificDateLimits, setSpecificDateLimits] = useState({})
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [settingsDate, setSettingsDate] = useState("")
  const [settingsDateLimit, setSettingsDateLimit] = useState("")

  const [typeSearch, setTypeSearch] = useState('')
  const [productTypeSearch, setProductTypeSearch] = useState('')
  const [unitSearch, setUnitSearch] = useState('')
  const [inventorySearch, setInventorySearch] = useState('')
  const [dropdownLimit, setDropdownLimit] = useState(15)

  useEffect(() => {
    setClientsList(clients)
    setAllOrders(orders)

    const savedLimit = localStorage.getItem("dailyOrderLimit")
    if (savedLimit) setDailyOrderLimit(parseInt(savedLimit, 10))
    const savedSpecific = localStorage.getItem("specificDateLimits")
    if (savedSpecific) setSpecificDateLimits(JSON.parse(savedSpecific))

    const prefillClient = localStorage.getItem("prefillOrderClientName")
    if (prefillClient) {
      setClientName(prefillClient)
      localStorage.removeItem("prefillOrderClientName")
    }
  }, [clients, orders])

  const addOrderItem = () => {
    setOrderItems(prev => [...prev, {
      id: Date.now() + prev.length,
      product: '',
      orderType: '',
      price: '',
      quantity: '',
      unit: 'nos',
      sourceOfMaterial: 'Outside',
      internalItems: [],
      notes: '',
      showTypeDropdown: false,
      showProductTypeDropdown: false,
      showInventoryDropdown: null,
      orderDate: getIndianDate(),
      deliveryDate: ''
    }])
  }

  const removeOrderItem = (index) => {
    if (orderItems.length === 1) {
      showGlobalToast('Error', 'At least one product is required.')
      return
    }
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const updateOrderItem = (index, updates) => {
    setOrderItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], ...updates }
      return updated
    })
  }

  const handleSave = (e) => {
    e.preventDefault()
    if (!clientName) {
      if (showGlobalToast) showGlobalToast('Error', 'Please select a client.')
      return
    }

    const incompleteItem = orderItems.find(item => !item.product || !item.orderType || !item.deliveryDate || !item.orderDate)
    if (incompleteItem) {
      if (showGlobalToast) showGlobalToast('Error', 'Please fill product, type, order date and delivery date for all items.')
      return
    }

    // New validation for internal items
    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      const itemLabel = item.product || `Product #${i + 1}`;

      if (!item.price || parseFloat(item.price) < 0) {
        if (showGlobalToast) showGlobalToast('Error', `Please enter a valid price for "${itemLabel}".`);
        return;
      }

      if (item.sourceOfMaterial === 'Internal') {
        if (!item.internalItems || item.internalItems.length === 0) {
          if (showGlobalToast) showGlobalToast('Error', `Please add at least one material for "${itemLabel}".`);
          return;
        }
        for (const mat of item.internalItems) {
          // Check for productName or IDs to confirm selection
          if (!mat.productName && !mat.productId && !mat.inventoryId) {
            if (showGlobalToast) showGlobalToast('Error', `Please select a material for all items in "${itemLabel}".`);
            return;
          }
          const q = parseFloat(mat.quantity);
          if (!mat.quantity || isNaN(q) || q <= 0) {
            if (showGlobalToast) showGlobalToast('Error', `Please enter a valid quantity for "${mat.productName || 'material'}" in "${itemLabel}".`);
            return;
          }
        }
      }
    }

    // Group items by date to check limits
    const itemsByDate = orderItems.reduce((acc, item) => {
      acc[item.deliveryDate] = (acc[item.deliveryDate] || 0) + 1;
      return acc;
    }, {});

    for (const [date, count] of Object.entries(itemsByDate)) {
      const existingCount = orders.filter(o => o.deliveryDate === date).length;
      const limit = specificDateLimits[date] !== undefined ? specificDateLimits[date] : dailyOrderLimit;
      if (existingCount + count > limit) {
        if (showGlobalToast) showGlobalToast('Limit Reached', `Maximum ${limit} orders allowed for ${date}. You are trying to add ${count} more.`);
        return;
      }
    }

    // Save each item as a separate order record
    const baseId = Date.now()
    const newOrders = orderItems.map((item, idx) => ({
      id: baseId + idx,
      clientName,
      product: item.product,
      orderType: item.orderType,
      price: item.price,
      size: `${item.quantity} ${item.unit}`,
      sourceOfMaterial: item.sourceOfMaterial,
      internalItems: item.sourceOfMaterial === 'Internal' ? item.internalItems : [],
      materialPhoto: item.materialPhoto,
      notes: item.notes || notes,
      orderDate: item.orderDate,
      deliveryDate: item.deliveryDate,
      photo: photoPreview,
      status: 'Not Ready'
    }))

    // Deduct inventory for internal materials
    let updatedInventory = [...inventory];
    orderItems.forEach(item => {
      if (item.sourceOfMaterial === 'Internal') {
        item.internalItems.forEach(mat => {
          updatedInventory = updatedInventory.map(invItem => {
            // Match by unique ID or Product ID
            if (invItem.id === mat.inventoryId || (mat.productId && invItem.productId === mat.productId)) {
              const currentQty = parseFloat(invItem.quantity) || 0;
              const usedQty = parseFloat(mat.quantity) || 0;
              return { ...invItem, quantity: Math.max(0, currentQty - usedQty) };
            }
            return invItem;
          });
        });
      }
    });

    setInventory(updatedInventory);
    setOrders([...orders, ...newOrders]);

    // Instant Cloud Save
    if (saveOrder) {
      newOrders.forEach(o => saveOrder(o));
    }

    if (showGlobalToast) showGlobalToast('Success', `${orderItems.length} product(s) added for ${clientName}`);

    // Reset form
    setClientName('')
    setOrderItems([{
      id: Date.now(),
      product: '',
      orderType: '',
      price: '',
      quantity: '',
      unit: 'nos',
      sourceOfMaterial: 'Outside',
      internalItems: [],
      notes: '',
      showTypeDropdown: false,
      showProductTypeDropdown: false,
      showInventoryDropdown: null,
      orderDate: getIndianDate(),
      deliveryDate: ''
    }])
    setPhotoPreview(null)
    setNotes('')
    setCurrentPage('view-orders')
  }

  const allProductTypes = Array.from(new Set([
    ...productTypesList,
    ...inventory.map(item => item.productType).filter(Boolean)
  ]))

  return (
    <div style={themeStyle} className="relative">
      {/* Settings Modal - Kept Same */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Settings size={20} className="text-[var(--accent)]" /> Order Settings
              </h2>
              <div className="mb-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--text)]">Global Daily Maximum</span>
                  <input
                    type="number"
                    min="1"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                    value={dailyOrderLimit}
                    onChange={(e) => setDailyOrderLimit(parseInt(e.target.value, 10))}
                  />
                </label>
                <div className="border-t border-[var(--border)] pt-4">
                  <span className="mb-2 block text-sm font-medium text-[var(--text)]">Specific Date Override</span>
                  <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                    <CustomDatePicker value={settingsDate} onChange={setSettingsDate} placeholder="Select date" />
                    <input
                      type="number"
                      placeholder="Limit"
                      className="w-24 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 outline-none transition focus:border-[var(--accent)]"
                      value={settingsDateLimit}
                      onChange={(e) => setSettingsDateLimit(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="mt-3 w-full rounded-xl bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:brightness-95"
                    onClick={() => {
                      if (!settingsDate || !settingsDateLimit) return
                      setSpecificDateLimits({ ...specificDateLimits, [settingsDate]: parseInt(settingsDateLimit, 10) })
                      setSettingsDate(''); setSettingsDateLimit('')
                    }}
                  >
                    Add Override
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold" onClick={() => setShowSettingsModal(false)}>Cancel</button>
                <button
                  type="button"
                  className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-lg"
                  onClick={() => {
                    localStorage.setItem('dailyOrderLimit', dailyOrderLimit.toString())
                    localStorage.setItem('specificDateLimits', JSON.stringify(specificDateLimits))
                    setShowSettingsModal(false)
                    if (showGlobalToast) showGlobalToast('Success', 'Order settings updated.')
                  }}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h1">Create Order</h1>
          <p className="text-para text-[var(--muted)] mt-2">Add multiple products to a single client order.</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-[var(--soft)]"
          onClick={() => setShowSettingsModal(true)}
        >
          <Settings size={16} className="text-[var(--muted)]" /> Settings
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Step 1: Client Selection */}
        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur relative z-9">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <UsersRound size={24} />
              </div>
              <div>
                <h2 className="text-h2">Client & Timeline</h2>
                <p className="text-para text-[var(--muted)]">Identify client and set delivery expectations</p>
              </div>
            </div>
            {clientName && (
              <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-1.5 text-xs font-bold text-green-600 border border-green-500/20">
                <CheckCircle size={14} /> Client Verified
              </div>
            )}
          </div>

          <div className="grid gap-6">
            <div className="relative">
              <span className="mb-2 block text-sm font-medium text-[var(--text)]">Client Name</span>
              <button
                type="button"
                className={`flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-left outline-none transition focus:border-[var(--accent)] ${!clientName ? 'text-[var(--muted)]' : 'text-[var(--text)]'}`}
                onClick={() => { setShowClientDropdown(!showClientDropdown); setClientSearch('') }}
              >
                {clientName || 'Select Client...'}
                <ChevronDown size={16} className={`transition-transform ${showClientDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showClientDropdown && (
                <>
                  <div className="fixed inset-0 z-[90]" onClick={() => setShowClientDropdown(false)} />
                  <div className="absolute left-0 top-full z-[100] mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-2 shadow-2xl backdrop-blur">
                    <div className="relative mb-2">
                      <Search size={16} className="absolute left-3 top-3 text-[var(--muted)]" />
                      <input
                        type="text"
                        placeholder="Search client..."
                        className="w-full rounded-xl border border-[var(--border)] bg-transparent py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[var(--accent)]"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const searchVal = clientSearch.trim();
                            const filtered = (clientsList || []).filter(c => (c.name || '').toLowerCase().includes(searchVal.toLowerCase()));

                            if (filtered.length > 0) {
                              setClientName(filtered[0].name);
                              setShowClientDropdown(false);
                            } else if (searchVal) {
                              localStorage.setItem('prefillClientName', searchVal);
                              setCurrentPage('add-clients');
                            }
                          }
                        }}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto pr-1 space-y-1">
                      {(clientsList || []).filter(c => (c.name || '').toLowerCase().includes((clientSearch || '').toLowerCase())).map(c => (
                        <button
                          key={c.id || c.mobile}
                          type="button"
                          className="w-full rounded-xl px-4 py-3 text-left text-sm transition hover:bg-[var(--soft)] flex justify-between items-center"
                          onClick={() => { setClientName(c.name); setShowClientDropdown(false) }}
                        >
                          <div>
                            <p className="font-semibold text-[var(--text)]">{c.name || 'Unnamed'}</p>
                            <p className="text-xs text-[var(--muted)]">{c.mobile || 'No contact'}</p>
                          </div>
                        </button>
                      ))}

                      {clientSearch && !(clientsList || []).some(c => (c.name || '').toLowerCase() === clientSearch.toLowerCase()) && (
                        <button
                          type="button"
                          className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-[var(--accent)] bg-[var(--accent-soft)] transition hover:brightness-95 flex items-center gap-2 mt-2"
                          onClick={() => {
                            localStorage.setItem('prefillClientName', clientSearch);
                            setCurrentPage('add-clients');
                          }}
                        >
                          <Plus size={16} /> Add New Client: "{clientSearch}"
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Client History Timeline */}
          {clientName && (
            <div className="mt-10 border-t border-[var(--border)] pt-8">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--muted)]">Order History: {clientName}</h3>
                <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-[10px] font-bold text-[var(--muted)]">
                  {allOrders.filter(o => o.clientName === clientName).length} Past Orders
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allOrders
                  .filter(o => o.clientName === clientName)
                  .sort((a, b) => {
                    const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0
                    const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0
                    return dateB - dateA
                  })
                  .slice(0, 3)
                  .map((pastOrder) => (
                    <div key={pastOrder.id} className="relative rounded-2xl border border-[var(--border)] bg-[var(--soft)]/20 p-4 transition hover:bg-[var(--soft)]/40 group">
                      <div className="flex items-center gap-3">
                        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-bold text-white shadow-sm ${pastOrder.status === 'Closed' || pastOrder.status === 'Sold' ? 'bg-green-500' : 'bg-[var(--accent)]'
                          }`}>
                          {(pastOrder.product || 'P')[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[var(--text)]">{pastOrder.product}</p>
                          <p className="text-[10px] font-medium text-[var(--muted)]">{formatDateDDMMYY(pastOrder.orderDate)} • {pastOrder.status}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-[var(--accent)]">{pastOrder.price}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                {allOrders.filter(o => o.clientName === clientName).length === 0 && (
                  <div className="col-span-full py-10 text-center rounded-2xl border-2 border-dashed border-[var(--border)]">
                    <p className="text-sm font-medium text-[var(--muted)]">New Client • First Order</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Step 2: Order Items */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-1 gap-4">
            <h2 className="text-h2 flex items-center gap-2">
              <ShoppingBag size={20} className="text-[var(--accent)]" /> Products to Stitch
            </h2>
            <button
              type="button"
              onClick={addOrderItem}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition hover:brightness-95 active:scale-95"
            >
              <Plus size={18} /> Add New Product
            </button>
          </div>

          <div className="grid gap-6">
            {orderItems.map((item, idx) => (
              <div
                key={item.id}
                ref={idx === orderItems.length - 1 ? lastItemRef : null}
                className="relative rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] transition-all group scroll-mt-24"
              >
                <div className="absolute -left-2 top-6 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-black text-white shadow-lg">
                  {idx + 1}
                </div>

                <button
                  type="button"
                  onClick={() => removeOrderItem(idx)}
                  className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-500 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500 hover:text-white"
                  title="Remove this product"
                >
                  <Trash2 size={16} />
                </button>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="relative">
                        <span className="mb-2 block text-sm font-medium text-[var(--text)]">Product Type</span>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-left outline-none transition focus:border-[var(--accent)]"
                          onClick={() => {
                            const updated = [...orderItems];
                            updated[idx].showProductTypeDropdown = !item.showProductTypeDropdown;
                            setOrderItems(updated);
                            setProductTypeSearch('');
                          }}
                        >
                          <span className="truncate text-sm font-medium">{item.product || 'Select...'}</span>
                          <ChevronDown size={16} />
                        </button>
                        {item.showProductTypeDropdown && (
                          <>
                            <div className="fixed inset-0 z-[70]" onClick={() => updateOrderItem(idx, { showProductTypeDropdown: false })} />
                            <div className="absolute left-0 top-full z-[80] mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-2 shadow-2xl backdrop-blur">
                              <input
                                type="text"
                                placeholder="Search..."
                                className="mb-2 w-full rounded-xl border border-[var(--border)] bg-transparent py-2 px-3 text-sm outline-none"
                                value={productTypeSearch}
                                onChange={(e) => setProductTypeSearch(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const nt = productTypeSearch.trim();
                                    if (nt && !productTypes.some(t => t.toLowerCase() === nt.toLowerCase())) {
                                      const updatedList = [...productTypes, nt];
                                      setProductTypes(updatedList);
                                      if (saveConfig) saveConfig("productTypes", updatedList);
                                      updateOrderItem(idx, { product: nt, showProductTypeDropdown: false });
                                      if (showGlobalToast) showGlobalToast('Added', `New product "${nt}" created.`);
                                    } else if (nt) {
                                      const ex = productTypes.find(t => t.toLowerCase().includes(nt.toLowerCase()));
                                      if (ex) updateOrderItem(idx, { product: ex, showProductTypeDropdown: false });
                                    }
                                  }
                                }}
                                autoFocus
                              />
                              <div className="max-h-48 overflow-y-auto space-y-1">
                                {allProductTypes.filter(t => t.toLowerCase().includes(productTypeSearch.toLowerCase())).map(t => (
                                  <div key={t} className="flex items-center gap-1 group">
                                    <button
                                      type="button"
                                      className="flex-1 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--soft)]"
                                      onClick={() => {
                                        updateOrderItem(idx, { product: t, showProductTypeDropdown: false })
                                      }}
                                    >
                                      {t}
                                    </button>
                                    <button
                                      type="button"
                                      className="p-2 text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const updated = productTypesList.filter(item => item !== t);
                                        setProductTypes(updated);
                                        if (saveConfig) saveConfig("productTypes", updated);
                                        if (showGlobalToast) showGlobalToast('Removed', `"${t}" deleted.`);
                                      }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}

                                {productTypeSearch && !allProductTypes.some(t => t.toLowerCase() === productTypeSearch.toLowerCase()) && (
                                  <button
                                    type="button"
                                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-[var(--accent)] bg-[var(--accent-soft)] transition hover:brightness-95 flex items-center gap-2 mt-1"
                                    onClick={() => {
                                      const nt = productTypeSearch.trim();
                                      if (nt) {
                                        const updatedList = [...productTypesList, nt];
                                        setProductTypes(updatedList);
                                        if (saveConfig) saveConfig("productTypes", updatedList);
                                        updateOrderItem(idx, { product: nt, showProductTypeDropdown: false });
                                        if (showGlobalToast) showGlobalToast('Added', `New product "${nt}" created.`);
                                      }
                                    }}
                                  >
                                    <Plus size={14} /> Add New Product: "{productTypeSearch}"
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>



                      <div className="relative">
                        <span className="mb-2 block text-sm font-medium text-[var(--text)]">Order Type</span>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-left outline-none transition focus:border-[var(--accent)]"
                          onClick={() => {
                            const updated = [...orderItems];
                            updated[idx].showTypeDropdown = !item.showTypeDropdown;
                            setOrderItems(updated);
                            setTypeSearch('');
                          }}
                        >
                          <span className="truncate text-sm font-medium">{item.orderType || 'Select...'}</span>
                          <ChevronDown size={16} />
                        </button>
                        {item.showTypeDropdown && (
                          <>
                            <div className="fixed inset-0 z-[70]" onClick={() => updateOrderItem(idx, { showTypeDropdown: false })} />
                            <div className="absolute left-0 top-full z-[80] mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-2 shadow-2xl backdrop-blur">
                              <input
                                type="text"
                                placeholder="Search..."
                                className="mb-2 w-full rounded-xl border border-[var(--border)] bg-transparent py-2 px-3 text-sm outline-none"
                                value={typeSearch}
                                onChange={(e) => setTypeSearch(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const nt = typeSearch.trim();
                                    if (nt && !orderTypes.some(t => t.toLowerCase() === nt.toLowerCase())) {
                                      setOrderTypes([...orderTypes, nt]);
                                      updateOrderItem(idx, { orderType: nt, showTypeDropdown: false });
                                      if (showGlobalToast) showGlobalToast('Added', `New type "${nt}" created.`);
                                    } else if (nt) {
                                      const ex = orderTypes.find(t => t.toLowerCase().includes(nt.toLowerCase()));
                                      if (ex) updateOrderItem(idx, { orderType: ex, showTypeDropdown: false });
                                    }
                                  }
                                }}
                                autoFocus
                              />
                              <div className="max-h-48 overflow-y-auto space-y-1">
                                {orderTypes.filter(t => t.toLowerCase().includes(typeSearch.toLowerCase())).map(t => (
                                  <div key={t} className="flex items-center gap-1 group">
                                    <button
                                      type="button"
                                      className="flex-1 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--soft)]"
                                      onClick={() => {
                                        updateOrderItem(idx, { orderType: t, showTypeDropdown: false })
                                      }}
                                    >
                                      {t}
                                    </button>
                                    <button
                                      type="button"
                                      className="p-2 text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const updated = orderTypes.filter(item => item !== t);
                                        setOrderTypes(updated);
                                        if (showGlobalToast) showGlobalToast('Removed', `"${t}" deleted.`);
                                      }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}

                                {typeSearch && !orderTypes.some(t => t.toLowerCase() === typeSearch.toLowerCase()) && (
                                  <button
                                    type="button"
                                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-[var(--accent)] bg-[var(--accent-soft)] transition hover:brightness-95 flex items-center gap-2 mt-1"
                                    onClick={() => {
                                      const nt = typeSearch.trim();
                                      if (nt) {
                                        setOrderTypes([...orderTypes, nt]);
                                        updateOrderItem(idx, { orderType: nt, showTypeDropdown: false });
                                        if (showGlobalToast) showGlobalToast('Added', `New type "${nt}" created.`);
                                      }
                                    }}
                                  >
                                    <Plus size={14} /> Add New Type: "{typeSearch}"
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="relative">
                        <span className="mb-2 block text-sm font-medium text-[var(--text)]">Order Date</span>
                        <CustomDatePicker
                          value={item.orderDate}
                          onChange={(val) => updateOrderItem(idx, { orderDate: val })}
                        />
                      </div>
                      <div className="relative">
                        <span className="mb-2 block text-sm font-medium text-[var(--text)]">Delivery Date <span className="text-red-500">*</span></span>
                        <CustomDatePicker
                          value={item.deliveryDate}
                          onChange={(val) => updateOrderItem(idx, { deliveryDate: val })}
                          minDate={item.orderDate}
                          placeholder="Select date"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 mb-4">
                      <div>
                        <span className="mb-2 block text-sm font-medium text-[var(--text)]">Quantity</span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. 1, 2, 5"
                            className={`w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] ${item.sourceOfMaterial === 'Internal' ? 'opacity-60 cursor-not-allowed font-bold' : ''}`}
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(idx, { quantity: e.target.value })}
                            disabled={item.sourceOfMaterial === 'Internal'}
                          />
                          <div className="relative w-28">
                            <button
                              type="button"
                              className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2.5 text-left outline-none transition focus:border-[var(--accent)]"
                              onClick={() => {
                                const updated = [...orderItems];
                                updated[idx].showUnitDropdown = !item.showUnitDropdown;
                                setOrderItems(updated);
                                setUnitSearch('');
                              }}
                              disabled={item.sourceOfMaterial === 'Internal'}
                            >
                              <span className="truncate text-sm font-medium">{item.unit || 'nos'}</span>
                              <ChevronDown size={14} />
                            </button>

                            {item.showUnitDropdown && (
                              <>
                                <div className="fixed inset-0 z-[70]" onClick={() => updateOrderItem(idx, { showUnitDropdown: false })} />
                                <div className="absolute left-0 top-full z-[80] mt-2 w-48 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-2 shadow-2xl backdrop-blur">
                                  <input
                                    type="text"
                                    placeholder="Unit..."
                                    className="mb-2 w-full rounded-xl border border-[var(--border)] bg-transparent py-2 px-3 text-sm outline-none"
                                    value={unitSearch}
                                    onChange={(e) => setUnitSearch(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const nu = unitSearch.trim();
                                        if (nu && !unitsList.some(u => u.toLowerCase() === nu.toLowerCase())) {
                                          const updated = [...unitsList, nu];
                                          setInventoryUnits(updated);
                                          if (saveConfig) saveConfig("inventoryUnits", updated);
                                          updateOrderItem(idx, { unit: nu, showUnitDropdown: false });
                                        }
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <div className="max-h-48 overflow-y-auto space-y-1">
                                    {unitsList.filter(u => u.toLowerCase().includes(unitSearch.toLowerCase())).map(u => (
                                      <div key={u} className="flex items-center gap-1 group">
                                        <button
                                          type="button"
                                          className="flex-1 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--soft)]"
                                          onClick={() => {
                                            updateOrderItem(idx, { unit: u, showUnitDropdown: false })
                                          }}
                                        >
                                          {u}
                                        </button>
                                        <button
                                          type="button"
                                          className="p-2 text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const updated = unitsList.filter(item => item !== u);
                                            setInventoryUnits(updated);
                                            if (saveConfig) saveConfig("inventoryUnits", updated);
                                          }}
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    ))}
                                    {unitSearch && !unitsList.some(u => u.toLowerCase() === unitSearch.toLowerCase()) && (
                                      <button
                                        type="button"
                                        className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-[var(--accent)] bg-[var(--accent-soft)] transition hover:brightness-95"
                                        onClick={() => {
                                          const nu = unitSearch.trim();
                                          if (nu) {
                                            const updated = [...unitsList, nu];
                                            setInventoryUnits(updated);
                                            if (saveConfig) saveConfig("inventoryUnits", updated);
                                            updateOrderItem(idx, { unit: nu, showUnitDropdown: false });
                                          }
                                        }}
                                      >
                                        + Add Unit: "{unitSearch}"
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="mb-2">
                          <span className="text-sm font-medium text-[var(--text)]">Stitching Cost</span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--muted)]">₹</span>
                          <input
                            type="number"
                            placeholder="0.00"
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] py-2.5 pl-9 pr-4 text-sm font-semibold text-[var(--accent)] outline-none transition focus:border-[var(--accent)]"
                            value={item.price}
                            onChange={(e) => updateOrderItem(idx, { price: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="mb-2 block text-sm font-medium text-[var(--text)]">Material Source</span>
                      <div className="flex gap-2">
                        {['Outside', 'Internal'].map(source => (
                          <button
                            key={source}
                            type="button"
                            onClick={() => {
                              const updates = { sourceOfMaterial: source };
                              if (source === 'Outside') {
                                // Reset quantity and unit when switching to manual mode
                                updates.quantity = '';
                                updates.unit = 'nos';
                              } else {
                                // Re-sync quantity and unit from materials when switching back to internal
                                // Re-summing ALL material quantities correctly
                                const totalMatQ = item.internalItems.reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0);
                                updates.quantity = totalMatQ > 0 ? totalMatQ.toString() : '';
                                if (item.internalItems.length > 0) {
                                  updates.unit = item.internalItems[0].unit;
                                }
                              }
                              updateOrderItem(idx, updates);
                            }}
                            className={`flex-1 rounded-xl border py-3 text-sm font-bold transition-all ${item.sourceOfMaterial === source ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm' : 'border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)] hover:bg-[var(--soft)]'}`}
                          >
                            {source === 'Outside' ? 'Client Provided' : 'Studio Inventory'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    {item.sourceOfMaterial === 'Internal' ? (
                      <div className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--soft)]/30 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">Internal Materials</h4>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedItems = [...item.internalItems, { productId: '', productName: '', quantity: 1, unit: 'nos', unitPrice: 0, totalPrice: 0 }];
                              updateOrderItem(idx, { internalItems: updatedItems });
                            }}
                            className="text-xs font-bold text-[var(--accent)] hover:underline"
                          >
                            + Add Item
                          </button>
                        </div>

                        <div className="space-y-2 pr-1 custom-scrollbar">
                          {item.internalItems.map((mat, midx) => (
                            <div key={midx} className="relative flex items-center gap-2 bg-[var(--surface)] p-2 rounded-xl border border-[var(--border)]">
                              <div className="flex-1 min-w-0">
                                <button
                                  type="button"
                                  className="w-full text-left rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs font-medium truncate"
                                  onClick={() => {
                                    const updated = [...orderItems];
                                    updated[idx].showInventoryDropdown = updated[idx].showInventoryDropdown === midx ? null : midx;
                                    setOrderItems(updated);
                                    setInventorySearch('');
                                    setDropdownLimit(15);
                                  }}
                                >
                                  {mat.productName || 'Material...'}
                                </button>
                                {item.showInventoryDropdown === midx && (
                                  <>
                                    <div className="fixed inset-0 z-[80]" onClick={() => updateOrderItem(idx, { showInventoryDropdown: null })} />
                                    <div className="relative z-[90] mt-2 mb-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-2 shadow-sm">
                                      <input
                                        type="text"
                                        className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-xs"
                                        placeholder="Search..."
                                        value={inventorySearch}
                                        onChange={(e) => {
                                          setInventorySearch(e.target.value);
                                          setDropdownLimit(15);
                                        }}
                                        autoFocus
                                      />
                                      <div className="max-h-32 overflow-y-auto mt-1 space-y-1">
                                        {inventory
                                          .filter(p => p.productName.toLowerCase().includes(inventorySearch.toLowerCase()))
                                          .slice(0, dropdownLimit)
                                          .map(p => {
                                            const usedInOrder = orderItems.reduce((totalUsed, oi) => {
                                              return totalUsed + oi.internalItems.reduce((matUsed, m) => {
                                                if (m.inventoryId === p.id || m.productId === p.productId) {
                                                  return matUsed + (parseFloat(m.quantity) || 0);
                                                }
                                                return matUsed;
                                              }, 0);
                                            }, 0);

                                            const currentItemUsage = (mat.inventoryId === p.id || mat.productId === p.productId) ? (parseFloat(mat.quantity) || 0) : 0;
                                            const availableStock = (parseFloat(p.quantity) || 0) - (usedInOrder - currentItemUsage);

                                            const isOutOfStock = availableStock <= 0;
                                            return (
                                              <button
                                                key={p.id}
                                                type="button"
                                                disabled={isOutOfStock}
                                                className={`w-full rounded-lg px-2 py-1.5 text-left text-[10px] flex justify-between items-center transition ${isOutOfStock ? 'opacity-40 cursor-not-allowed bg-stone-100' : 'hover:bg-[var(--soft)]'}`}
                                                onClick={() => {
                                                  const mats = [...item.internalItems];
                                                  const priceValue = parseFloat(p.finalPrice) || 0;
                                                  mats[midx] = {
                                                    ...mats[midx],
                                                    inventoryId: p.id,
                                                    productId: p.productId,
                                                    productName: p.productName,
                                                    unit: p.unit,
                                                    unitPrice: priceValue,
                                                    totalPrice: priceValue * (mats[midx].quantity || 1)
                                                  };

                                                  const totalMatQ = mats.reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0);
                                                  updateOrderItem(idx, {
                                                    internalItems: mats,
                                                    unit: p.unit,
                                                    quantity: totalMatQ.toString(),
                                                    showInventoryDropdown: null
                                                  });
                                                }}
                                              >
                                                <div className="min-w-0 flex-1 pr-2">
                                                  <div className="flex items-center gap-1.5">
                                                    <p className="font-bold truncate">{p.productName}</p>
                                                    {usedInOrder > 0 && (
                                                      <span className="px-1 py-0.5 rounded bg-blue-100 text-blue-600 text-[8px] font-black uppercase">In Cart</span>
                                                    )}
                                                  </div>
                                                  <p className={`text-[9px] font-black ${isOutOfStock ? 'text-red-500' : 'text-[var(--accent)]'}`}>
                                                    Available: {availableStock.toFixed(2)} {p.unit}
                                                    <span className="text-stone-400 font-normal ml-1">(Total: {p.quantity})</span>
                                                  </p>
                                                </div>
                                                <span className="font-bold whitespace-nowrap">₹{p.finalPrice}</span>
                                              </button>
                                            );
                                          })}
                                        {inventory.filter(p => p.productName.toLowerCase().includes(inventorySearch.toLowerCase())).length > dropdownLimit && (
                                          <button
                                            type="button"
                                            className="w-full py-2 text-[10px] font-bold text-[var(--accent)] hover:bg-[var(--soft)] rounded-lg transition"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDropdownLimit(prev => prev + 20);
                                            }}
                                          >
                                            Load More Results...
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                              <input
                                type="number"
                                className="w-12 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[10px] font-bold"
                                value={mat.quantity}
                                onChange={(e) => {
                                  const q = parseFloat(e.target.value) || 0;
                                  const mats = [...item.internalItems];
                                  mats[midx].quantity = q;
                                  mats[midx].totalPrice = q * mats[midx].unitPrice;

                                  const totalMatQ = mats.reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0);
                                  // Sync with main quantity (SUM of all materials)
                                  updateOrderItem(idx, {
                                    internalItems: mats,
                                    quantity: totalMatQ.toString()
                                  });
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const mats = item.internalItems.filter((_, i) => i !== midx);
                                  const updates = { internalItems: mats };
                                  if (mats.length === 0) updates.price = '';
                                  updateOrderItem(idx, updates);
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                        {item.internalItems.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-dashed border-[var(--border)] flex justify-between items-center text-[10px] font-bold text-[var(--accent)]">
                            <span>TOTAL MAT. COST</span>
                            <span>₹{item.internalItems.reduce((s, m) => s + (m.totalPrice || 0), 0).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--soft)]/20 p-6 flex flex-col items-center justify-center text-center group">
                        <div className="mb-4 relative">
                          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-sm border border-[var(--border)] overflow-hidden">
                            {item.materialPhoto ? (
                              <img src={item.materialPhoto} className="h-full w-full object-cover" alt="Material" />
                            ) : (
                              <Info size={32} className="text-[var(--accent)] opacity-40" />
                            )}
                          </div>
                          <label className="absolute -bottom-2 -right-2 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-[var(--accent)] text-white shadow-lg transition hover:scale-110 active:scale-95">
                            <Plus size={16} />
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    updateOrderItem(idx, { materialPhoto: reader.result });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                        <h4 className="text-sm font-bold text-[var(--text)] mb-1 uppercase tracking-wider">Client Material</h4>
                        <p className="text-[10px] text-[var(--muted)] leading-relaxed max-w-[200px] mb-4">
                          Upload a photo of the client's fabric for verification.
                        </p>
                        <div className="w-full">
                          <input
                            type="text"
                            placeholder="Fabric details (color, pattern)..."
                            className="w-full text-center text-[10px] bg-transparent border-b border-[var(--border)] pb-1 outline-none focus:border-[var(--accent)]"
                            value={item.notes || ''}
                            onChange={(e) => updateOrderItem(idx, { notes: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t border-[var(--border)] pt-4">
                  <span className="mb-2 block text-sm font-medium text-[var(--text)]">Special Instructions / Product Notes</span>
                  <textarea
                    placeholder="Enter any specific requirements for this product..."
                    className="w-full h-20 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-sm outline-none transition focus:border-[var(--accent)] resize-none"
                    value={item.notes}
                    onChange={(e) => updateOrderItem(idx, { notes: e.target.value })}
                  />
                </div>

              </div>
            ))}
          </div>
        </section>

        {/* Global Details */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Info size={18} className="text-[var(--accent)]" /> Global Order Notes
            </h3>
            <textarea
              placeholder="Shared instructions for the entire order..."
              className="w-full h-24 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 text-sm outline-none transition focus:border-[var(--accent)]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package size={18} className="text-[var(--accent)]" /> Reference Photo
            </h3>
            {!photoPreview ? (
              <label className="flex flex-col items-center justify-center w-full h-24 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-strong)] hover:bg-[var(--soft)] transition cursor-pointer">
                <Plus size={24} className="text-[var(--muted)] mb-1" />
                <p className="text-[10px] font-bold text-[var(--muted)] uppercase">Upload Reference</p>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = (event) => setPhotoPreview(event.target.result);
                    reader.readAsDataURL(e.target.files[0]);
                  }
                }} />
              </label>
            ) : (
              <div className="relative h-24 w-full">
                <img src={photoPreview} alt="Preview" className="h-full w-full object-cover rounded-xl border border-[var(--border)]" />
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-lg bg-red-500 text-white shadow-lg"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Grand Summary & Actions */}
        <section className="mt-8 flex flex-col md:flex-row gap-8 items-center justify-between rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-2xl relative z-40 overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent)]" />

          <div className="flex flex-wrap gap-8 items-center">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Total Volume</p>
              <p className="text-xl font-bold text-[var(--text)] flex items-baseline gap-1">
                {orderItems.reduce((s, i) => {
                  const mainQ = parseFloat(i.quantity) || 0;
                  const matQ = i.sourceOfMaterial === 'Internal'
                    ? i.internalItems.reduce((sm, m) => sm + (parseFloat(m.quantity) || 0), 0)
                    : 0;
                  // For internal, materials count. For outside, main quantity counts.
                  return s + (i.sourceOfMaterial === 'Internal' ? matQ : mainQ);
                }, 0)}
                <span className="text-xs font-medium text-[var(--muted)] lowercase">units</span>
              </p>
            </div>

            <div className="h-10 w-px bg-[var(--border)] hidden sm:block" />

            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Total Stitching</p>
              <p className="text-xl font-bold text-[var(--text)]">
                ₹{orderItems.reduce((s, i) => s + (parseFloat(i.price) || 0), 0).toFixed(2)}
              </p>
            </div>

            <div className="h-10 w-px bg-[var(--border)] hidden sm:block" />

            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Materials Cost</p>
              <p className="text-xl font-bold text-orange-500">
                ₹{orderItems.reduce((s, item) => {
                  if (item.sourceOfMaterial !== 'Internal') return s;
                  return s + item.internalItems.reduce((sm, m) => sm + (m.totalPrice || 0), 0);
                }, 0).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-5 w-full md:w-auto pt-6 md:pt-0 border-t md:border-t-0 border-[var(--border)]">
            <div className="text-center md:text-right">
              <p className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.2em] mb-1">Final Grand Total</p>
              <h2 className="text-5xl font-black text-[var(--text)] tracking-tighter">
                ₹{(
                  orderItems.reduce((s, i) => s + (parseFloat(i.price) || 0), 0) +
                  orderItems.reduce((s, item) => {
                    if (item.sourceOfMaterial !== 'Internal') return s;
                    return s + item.internalItems.reduce((sm, m) => sm + (m.totalPrice || 0), 0);
                  }, 0)
                ).toFixed(2)}
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setCurrentPage('view-orders')}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-8 py-4 font-bold transition hover:bg-[var(--soft)] text-center active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[var(--accent)] px-10 py-4 font-bold text-white shadow-xl shadow-[var(--accent)]/25 transition hover:brightness-95 flex items-center justify-center gap-2 active:scale-95"
              >
                <CheckCircle size={20} /> Confirm Order
              </button>
            </div>
          </div>
        </section>
      </form>
    </div>
  )
}

export default AddOrderPage;
