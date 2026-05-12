import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, Search, Settings, ShoppingBag, Pencil, Trash2, Plus, Package, Info, Calendar, UsersRound, CheckCircle } from 'lucide-react'
import { formatDateDDMMYY, getIndianDate, orders, products } from '../../utils/constants'
import CustomDatePicker from '../../components/CustomDatePicker'

function AddOrderPage({ themeStyle, setCurrentPage, showGlobalToast }) {
  const [clientName, setClientName] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [clientsList, setClientsList] = useState([])
  const [allOrders, setAllOrders] = useState([])

  // Global order metadata
  const [orderDate, setOrderDate] = useState(getIndianDate())
  const [deliveryDate, setDeliveryDate] = useState('')
  const [photoPreview, setPhotoPreview] = useState(null)
  const [notes, setNotes] = useState('')

  // Multiple Products (Order Items)
  const [orderItems, setOrderItems] = useState([
    {
      id: Date.now(),
      product: '',
      orderType: '',
      price: '',
      size: '',
      sizeUnit: 'nos',
      sourceOfMaterial: 'Outside',
      internalItems: [],
      notes: '',
      showTypeDropdown: false,
      showProductTypeDropdown: false,
      showInventoryDropdown: null // Index of internal item
    }
  ])

  const [inventory, setInventory] = useState([])
  const [orderTypesList, setOrderTypesList] = useState([])
  const [productTypesList, setProductTypesList] = useState(() => {
    const saved = localStorage.getItem("productTypes")
    if (saved) return JSON.parse(saved)
    return [
      "Shirt", "T-Shirt", "Blouse", "Kurta", "Pants", "Jeans", "Trousers", "Dress", "Saree",
      "Salwar Kameez", "Lehenga", "Blazer", "Suit", "Jacket", "Coat", "Skirt", "Shorts",
      "Sweater", "Cardigan", "Anarkali",
    ]
  })
  const [unitsList, setUnitsList] = useState(() => {
    const saved = localStorage.getItem("inventoryUnits")
    if (saved) return JSON.parse(saved)
    return ["nos", "mtr", "kg", "yd", "set"]
  })

  const [dailyOrderLimit, setDailyOrderLimit] = useState(6)
  const [specificDateLimits, setSpecificDateLimits] = useState({})
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [settingsDate, setSettingsDate] = useState("")
  const [settingsDateLimit, setSettingsDateLimit] = useState("")

  const [typeSearch, setTypeSearch] = useState('')
  const [productTypeSearch, setProductTypeSearch] = useState('')
  const [inventorySearch, setInventorySearch] = useState('')
  const [dropdownLimit, setDropdownLimit] = useState(15)

  useEffect(() => {
    setClientsList(JSON.parse(localStorage.getItem("clients") || "[]"))
    setOrderTypesList(JSON.parse(localStorage.getItem("orderTypes") || "[\"Customisation\", \"Stitching\"]"))
    const inv = JSON.parse(localStorage.getItem('inventory') || '[]')
    setInventory(inv)

    const savedLimit = localStorage.getItem("dailyOrderLimit")
    if (savedLimit) setDailyOrderLimit(parseInt(savedLimit, 10))
    const savedSpecific = localStorage.getItem("specificDateLimits")
    if (savedSpecific) setSpecificDateLimits(JSON.parse(savedSpecific))

    const prefillClient = localStorage.getItem("prefillOrderClientName")
    if (prefillClient) {
      setClientName(prefillClient)
      localStorage.removeItem("prefillOrderClientName")
    }

    setAllOrders(JSON.parse(localStorage.getItem("orders") || "[]"))
  }, [])

  const addOrderItem = () => {
    setOrderItems(prev => [...prev, {
      id: Date.now() + prev.length,
      product: '',
      orderType: '',
      price: '',
      size: '',
      sizeUnit: 'nos',
      sourceOfMaterial: 'Outside',
      internalItems: [],
      notes: '',
      showTypeDropdown: false,
      showProductTypeDropdown: false,
      showInventoryDropdown: null
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
    if (!deliveryDate) {
      if (showGlobalToast) showGlobalToast('Error', 'Please select a delivery date.')
      return
    }

    const incompleteItem = orderItems.find(item => !item.product || !item.orderType)
    if (incompleteItem) {
      if (showGlobalToast) showGlobalToast('Error', 'Please fill product and order type for all items.')
      return
    }

    // New validation for internal items
    for (const item of orderItems) {
      if (item.sourceOfMaterial === 'Internal') {
        if (item.internalItems.length === 0) {
          if (showGlobalToast) showGlobalToast('Error', `Please add at least one material for "${item.product}"`);
          return;
        }
        for (const mat of item.internalItems) {
          if (!mat.productId) {
            if (showGlobalToast) showGlobalToast('Error', 'Please select a material for all items.');
            return;
          }
          if (mat.quantity <= 0) {
            if (showGlobalToast) showGlobalToast('Error', `Invalid quantity for ${mat.productName}.`);
            return;
          }
        }
      }
    }

    const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]')
    const ordersOnDate = existingOrders.filter(o => o.deliveryDate === deliveryDate).length
    const limitForDate = specificDateLimits[deliveryDate] !== undefined ? specificDateLimits[deliveryDate] : dailyOrderLimit

    if (ordersOnDate + orderItems.length > limitForDate) {
      if (showGlobalToast) showGlobalToast('Limit Reached', `Maximum ${limitForDate} orders allowed for ${deliveryDate}. Adding ${orderItems.length} more would exceed this.`)
      return
    }

    // Save each item as a separate order record
    const baseId = Date.now()
    const newOrders = orderItems.map((item, idx) => ({
      id: baseId + idx,
      clientName,
      product: item.productType,
      orderType: item.orderType,
      price: item.price,
      size: `${item.size} ${item.sizeUnit}`,
      sourceOfMaterial: item.sourceOfMaterial,
      internalItems: item.sourceOfMaterial === 'Internal' ? item.internalItems : [],
      materialPhoto: item.materialPhoto,
      notes: item.notes || notes, 
      orderDate,
      deliveryDate,
      photo: photoPreview,
      status: 'Not Ready'
    }))

    const updatedOrders = [...existingOrders, ...newOrders]
    localStorage.setItem('orders', JSON.stringify(updatedOrders))

    if (showGlobalToast) showGlobalToast('Success', `${orderItems.length} product(s) added for ${clientName}`);
    
    // Reset form
    setClientName('')
    setOrderItems([{
      id: Date.now(),
      product: '',
      orderType: '',
      price: '',
      size: '',
      sizeUnit: 'nos',
      sourceOfMaterial: 'Outside',
      internalItems: [],
      notes: '',
      showTypeDropdown: false,
      showProductTypeDropdown: false,
      showInventoryDropdown: null
    }])
    setOrderDate(getIndianDate())
    setDeliveryDate('')
    setPhotoPreview(null)
    setNotes('')
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
          <h1 className="text-3xl font-semibold">Create Order</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Add multiple products to a single client order.</p>
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
        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur relative z-[60]">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <UsersRound size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Client & Timeline</h2>
                <p className="text-sm text-[var(--muted)] font-medium">Identify client and set delivery expectations</p>
              </div>
            </div>
            {clientName && (
              <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-1.5 text-xs font-bold text-green-600 border border-green-500/20">
                <CheckCircle size={14} /> Client Verified
              </div>
            )}
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
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
                <div className="absolute left-0 top-full z-[100] mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-2 shadow-2xl backdrop-blur">
                  <div className="relative mb-2">
                    <Search size={16} className="absolute left-3 top-3 text-[var(--muted)]" />
                    <input
                      type="text"
                      placeholder="Search client..."
                      className="w-full rounded-xl border border-[var(--border)] bg-transparent py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[var(--accent)]"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto pr-1 space-y-1">
                    {clientsList.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                      <button
                        key={c.id || c.mobile}
                        type="button"
                        className="w-full rounded-xl px-4 py-3 text-left text-sm transition hover:bg-[var(--soft)] flex justify-between items-center"
                        onClick={() => { setClientName(c.name); setShowClientDropdown(false) }}
                      >
                        <div>
                          <p className="font-semibold text-[var(--text)]">{c.name}</p>
                          <p className="text-xs text-[var(--muted)]">{c.mobile || 'No contact'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-[var(--text)]">Order Date</span>
              <CustomDatePicker value={orderDate} onChange={setOrderDate} />
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-[var(--text)]">Delivery Date <span className="text-red-500">*</span></span>
              <CustomDatePicker value={deliveryDate} onChange={setDeliveryDate} minDate={orderDate} placeholder="Required" />
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
                        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-bold text-white shadow-sm ${
                          pastOrder.status === 'Closed' || pastOrder.status === 'Sold' ? 'bg-green-500' : 'bg-[var(--accent)]'
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
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ShoppingBag size={20} className="text-[var(--accent)]" /> Products to Stitch
            </h2>
            <button
              type="button"
              onClick={addOrderItem}
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-95 active:scale-95"
            >
              <Plus size={16} /> Add Product
            </button>
          </div>

          <div className="grid gap-6">
            {orderItems.map((item, idx) => (
              <div key={item.id} className="relative rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] transition-all group">
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
                          <div className="absolute left-0 top-full z-[80] mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-2 shadow-2xl backdrop-blur">
                            <input
                              type="text"
                              placeholder="Search..."
                              className="mb-2 w-full rounded-xl border border-[var(--border)] bg-transparent py-2 px-3 text-sm outline-none"
                              value={productTypeSearch}
                              onChange={(e) => setProductTypeSearch(e.target.value)}
                              autoFocus
                            />
                            <div className="max-h-48 overflow-y-auto space-y-1">
                              {allProductTypes.filter(t => t.toLowerCase().includes(productTypeSearch.toLowerCase())).map(t => (
                                <button
                                  key={t}
                                  type="button"
                                  className="w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--soft)]"
                                  onClick={() => {
                                    updateOrderItem(idx, { product: t, showProductTypeDropdown: false })
                                  }}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>
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
                          <div className="absolute left-0 top-full z-[80] mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-2 shadow-2xl backdrop-blur">
                            <input
                              type="text"
                              placeholder="Search..."
                              className="mb-2 w-full rounded-xl border border-[var(--border)] bg-transparent py-2 px-3 text-sm outline-none"
                              value={typeSearch}
                              onChange={(e) => setTypeSearch(e.target.value)}
                              autoFocus
                            />
                            <div className="max-h-48 overflow-y-auto space-y-1">
                              {orderTypesList.filter(t => t.toLowerCase().includes(typeSearch.toLowerCase())).map(t => (
                                <button
                                  key={t}
                                  type="button"
                                  className="w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--soft)]"
                                  onClick={() => {
                                    updateOrderItem(idx, { orderType: t, showTypeDropdown: false })
                                  }}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <span className="mb-2 block text-sm font-medium text-[var(--text)]">Size</span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="32, M"
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent)]"
                            value={item.size}
                            onChange={(e) => updateOrderItem(idx, { size: e.target.value })}
                          />
                          <select
                            className="w-20 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-2 text-sm outline-none"
                            value={item.sizeUnit}
                            onChange={(e) => updateOrderItem(idx, { sizeUnit: e.target.value })}
                          >
                            {unitsList.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <span className="mb-2 block text-sm font-medium text-[var(--text)]">Price</span>
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
                            onClick={() => updateOrderItem(idx, { sourceOfMaterial: source })}
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

                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
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
                                  <div className="absolute left-0 right-0 top-full z-[90] mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-2 shadow-2xl">
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
                                          const isOutOfStock = (parseFloat(p.stock) || 0) <= 0;
                                          return (
                                            <button
                                              key={p.id}
                                              type="button"
                                              disabled={isOutOfStock}
                                              className={`w-full rounded-lg px-2 py-1.5 text-left text-[10px] flex justify-between items-center transition ${isOutOfStock ? 'opacity-40 cursor-not-allowed bg-stone-100' : 'hover:bg-[var(--soft)]'}`}
                                              onClick={() => {
                                                const mats = [...item.internalItems];
                                                mats[midx] = { ...mats[midx], productId: p.productId, productName: p.productName, unit: p.unit, unitPrice: parseFloat(p.finalPrice), totalPrice: parseFloat(p.finalPrice) * mats[midx].quantity };
                                                updateOrderItem(idx, { internalItems: mats, showInventoryDropdown: null });
                                              }}
                                            >
                                              <div className="min-w-0 flex-1 pr-2">
                                                <p className="font-bold truncate">{p.productName}</p>
                                                <p className={`text-[9px] font-black ${isOutOfStock ? 'text-red-500' : 'text-[var(--accent)]'}`}>
                                                  Stock: {p.stock} {p.unit}
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
                                  updateOrderItem(idx, { internalItems: mats });
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const mats = item.internalItems.filter((_, i) => i !== midx);
                                  updateOrderItem(idx, { internalItems: mats });
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

        {/* Action Bar */}
        <div className="mt-8 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl sticky bottom-4 z-50 lg:bottom-8">
          <div className="hidden sm:block">
            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Total Order Value</span>
            <p className="text-2xl font-bold text-[var(--accent)]">
              ₹{orderItems.reduce((s, i) => s + (parseFloat(i.price) || 0), 0).toFixed(2)}
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              type="button"
              className="flex-1 sm:flex-none rounded-xl border border-[var(--border)] px-6 py-2.5 font-semibold hover:bg-[var(--soft)] transition"
              onClick={() => setCurrentPage('view-orders')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none rounded-xl bg-[var(--accent)] px-8 py-2.5 font-bold text-white shadow-lg shadow-[var(--accent)]/30 transition hover:brightness-95"
            >
              Save Order
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default AddOrderPage;
