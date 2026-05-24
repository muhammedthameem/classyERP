import React, { useState, useEffect } from 'react'
import { ChevronDown, CircleDollarSign, Package, Search, Sparkles, Trash2 } from 'lucide-react'

function CreateInventoryPage({ themeStyle, setCurrentPage, showGlobalToast, inventory, setInventory, productTypes, setProductTypes, inventoryUnits, setInventoryUnits, saveConfig }) {
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [productType, setProductType] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');

  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('nos');
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');

  const [purchasePrice, setPurchasePrice] = useState('');
  const [totalPurchasePrice, setTotalPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [totalSellingPrice, setTotalSellingPrice] = useState('');
  const [gst, setGst] = useState('');
  const [discount, setDiscount] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [priceEntryMode, setPriceEntryMode] = useState('per-unit');
  const [purchaseEntryMode, setPurchaseEntryMode] = useState('per-unit');

  const getCalculatedUnitPrice = () => {
    let b = parseFloat(sellingPrice) || 0;
    const taxAmt = (b * (parseFloat(gst) || 0)) / 100;
    const discAmt = (b * (parseFloat(discount) || 0)) / 100;
    return b + taxAmt - discAmt;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const unitPrice = getCalculatedUnitPrice();

    const newInventoryItem = {
      id: Date.now(),
      productId,
      productName,
      productType,
      quantity: parseFloat(quantity) || 0,
      initialQuantity: parseFloat(quantity) || 0,
      unit,
      purchasePrice: parseFloat(purchasePrice) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
      gst: parseFloat(gst) || 0,
      discount: parseFloat(discount) || 0,
      finalPrice: unitPrice.toFixed(2),
      vendorName,
      note,
      createdAt: new Date().toISOString()
    };

    setInventory([...inventory, newInventoryItem]);

    if (showGlobalToast) showGlobalToast('Stock Added', `New item: ${productName} (${productId})`);

    setProductId('');
    setProductName('');
    setProductType('');
    setQuantity('');
    setUnit('nos');
    setPurchasePrice('');
    setSellingPrice('');
    setGst('');
    setDiscount('');
    setVendorName('');
    setNote('');
    setCurrentPage('view-inventory');
  };

  return (
    <div style={themeStyle} className="relative">
      <div className="mb-6">
        <h1 className="text-h1">Create Inventory</h1>
        <p className="text-para text-[var(--muted)] mt-2">Add a new product to your inventory</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-12">
        <section className="relative z-12 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
          <h2 className="text-h2 mb-6 flex items-center gap-2 text-[var(--accent)]">
            <Package size={20} /> Product Details
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-[var(--text)]">Product ID</span>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                type="text"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
                placeholder="e.g. FAB-001"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[var(--text)]">Product Name</span>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
                placeholder="e.g. Raw Silk White"
              />
            </label>
            <div className="block sm:col-span-2 relative">
              <span className="text-sm font-medium text-[var(--text)]">Product Category / Type</span>
              <div className="relative mt-2">
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-left outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 ${!productType ? 'text-[var(--muted)]' : 'text-[var(--text)]'}`}
                  onClick={() => {
                    setShowTypeDropdown(!showTypeDropdown)
                    setTypeSearch('')
                  }}
                >
                  {productType || 'Select or search product type...'}
                  <ChevronDown size={16} className={`transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showTypeDropdown && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-2 shadow-2xl backdrop-blur">
                    <div className="relative mb-2">
                      <Search size={16} className="absolute left-3 top-3 text-[var(--muted)]" />
                      <input
                        type="text"
                        placeholder="Search type or add new..."
                        className="w-full rounded-xl border border-[var(--border)] bg-transparent py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[var(--accent)]"
                        value={typeSearch}
                        onChange={(e) => setTypeSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto pr-1 space-y-1">
                      {productTypes.filter(type => type.toLowerCase().includes(typeSearch.toLowerCase())).map(type => (
                        <button
                          key={type}
                          type="button"
                          className="w-full flex justify-between items-center rounded-xl px-4 py-3 text-left text-sm transition hover:bg-[var(--soft)]"
                          onClick={() => {
                            setProductType(type)
                            setShowTypeDropdown(false)
                          }}
                        >
                          <span className="font-semibold">{type}</span>
                          {type === productType && <span className="h-2 w-2 rounded-full bg-[var(--accent)]"></span>}
                        </button>
                      ))}

                      {typeSearch && !productTypes.some(type => type.toLowerCase() === typeSearch.toLowerCase()) && (
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-xl bg-[var(--accent-soft)] px-4 py-3 text-left text-sm font-semibold text-[var(--accent)] transition hover:brightness-95 mt-1"
                          onClick={() => {
                            const newType = typeSearch.trim()
                            setProductTypes([...productTypes, newType])
                            setProductType(newType)
                            setShowTypeDropdown(false)
                            if (showGlobalToast) showGlobalToast('Success!', `Added new product type: ${newType}`)
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          Add "{typeSearch}"
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-11 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
          <h2 className="text-h2 mb-6 flex items-center gap-2 text-[var(--accent)]">
            <CircleDollarSign size={20} /> Stock & Pricing
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex gap-3">
              <label className="block flex-1">
                <span className="text-sm font-medium text-[var(--text)]">Initial Quantity</span>
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => {
                    const qty = e.target.value;
                    setQuantity(qty);
                    const sPrice = parseFloat(sellingPrice) || 0;
                    const pPrice = parseFloat(purchasePrice) || 0;
                    const qVal = parseFloat(qty) || 0;
                    if (qVal > 0) {
                      setTotalSellingPrice((sPrice * qVal).toFixed(2));
                      setTotalPurchasePrice((pPrice * qVal).toFixed(2));
                    } else {
                      setTotalSellingPrice('0.00');
                      setTotalPurchasePrice('0.00');
                    }
                  }}
                  required
                  placeholder="0.00"
                />
              </label>
              <div className="block w-32 relative">
                <span className="text-sm font-medium text-[var(--text)]">Unit</span>
                <div className="relative mt-2">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-left outline-none transition focus:border-[var(--accent)]"
                    onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                  >
                    {unit}
                    <ChevronDown size={14} />
                  </button>
                  {showUnitDropdown && (
                    <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-2 shadow-xl">
                      <input
                        type="text"
                        className="mb-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs outline-none"
                        placeholder="Search/Add..."
                        value={unitSearch}
                        onChange={(e) => setUnitSearch(e.target.value)}
                        autoFocus
                      />
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {inventoryUnits.filter(u => u.toLowerCase().includes(unitSearch.toLowerCase())).map(u => (
                          <div key={u} className="flex items-center gap-1 group">
                            <button
                              type="button"
                              className="flex-1 rounded-lg px-3 py-2 text-left text-xs transition hover:bg-[var(--soft)]"
                              onClick={() => {
                                setUnit(u)
                                setShowUnitDropdown(false)
                              }}
                            >
                              {u}
                            </button>
                            <button
                              type="button"
                              className="p-2 text-red-500 hover:text-red-700 transition"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = inventoryUnits.filter(item => item !== u);
                                setInventoryUnits(updated);
                                if (saveConfig) saveConfig("inventoryUnits", updated);
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        {unitSearch && !inventoryUnits.includes(unitSearch.toLowerCase()) && (
                          <button
                            type="button"
                            className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                            onClick={() => {
                              const newUnit = unitSearch.toLowerCase().trim()
                              setInventoryUnits([...inventoryUnits, newUnit])
                              setUnit(newUnit)
                              setShowUnitDropdown(false)
                            }}
                          >
                            + Add "{unitSearch}"
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="block">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text)]">Pricing Details <span className="text-red-500">*</span></span>
                <div className="flex gap-1 rounded-lg bg-[var(--soft)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setPriceEntryMode('per-unit')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${priceEntryMode === 'per-unit' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)]'}`}
                  >
                    UNIT PRICE
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceEntryMode('total')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${priceEntryMode === 'total' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)]'}`}
                  >
                    TOTAL PRICE
                  </button>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">₹</span>
                <input
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] py-3 pl-8 pr-4 outline-none transition focus:border-[var(--accent)]"
                  type="number"
                  required
                  value={priceEntryMode === 'per-unit' ? sellingPrice : totalSellingPrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    const qty = parseFloat(quantity) || 0;
                    if (priceEntryMode === 'per-unit') {
                      setSellingPrice(val);
                      if (qty > 0) setTotalSellingPrice((parseFloat(val) * qty).toFixed(2));
                    } else {
                      setTotalSellingPrice(val);
                      if (qty > 0) setSellingPrice((parseFloat(val) / qty).toFixed(2));
                    }
                  }}
                  placeholder={priceEntryMode === 'per-unit' ? "Price per unit..." : "Total batch price..."}
                />
              </div>
              <div className="mt-2 flex items-center justify-between px-1">
                <p className="text-[10px] font-bold text-[var(--muted)] uppercase">
                  {priceEntryMode === 'per-unit' 
                    ? `Total: ₹${totalSellingPrice || '0.00'}` 
                    : `Per ${unit || 'unit'}: ₹${sellingPrice || '0.00'}`}
                </p>
                {parseFloat(quantity) > 0 && sellingPrice && (
                  <p className="text-[10px] font-black text-[var(--accent)]">
                    Auto-calculated
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="relative rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
          <h2 className="text-h2 mb-6 flex items-center gap-2 text-[var(--accent)]">
            <Sparkles size={20} /> Tax, Discount & Vendor
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-[var(--text)]">GST (%)</span>
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                  type="number"
                  value={gst}
                  onChange={(e) => setGst(e.target.value)}
                  placeholder="e.g. 18"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[var(--text)]">Discount (%)</span>
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="e.g. 5"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-[var(--text)]">Vendor / Supplier Name</span>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. Reliance Fabrics"
              />
            </label>
            <div className="block">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text)]">Purchase from Vendor</span>
                <div className="flex gap-1 rounded-lg bg-[var(--soft)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setPurchaseEntryMode('per-unit')}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition ${purchaseEntryMode === 'per-unit' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)]'}`}
                  >
                    UNIT
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurchaseEntryMode('total')}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition ${purchaseEntryMode === 'total' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)]'}`}
                  >
                    TOTAL
                  </button>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">₹</span>
                <input
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] py-3 pl-8 pr-4 outline-none transition focus:border-[var(--accent)]"
                  type="number"
                  value={purchaseEntryMode === 'per-unit' ? purchasePrice : totalPurchasePrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    const qty = parseFloat(quantity) || 0;
                    if (purchaseEntryMode === 'per-unit') {
                      setPurchasePrice(val);
                      if (qty > 0) setTotalPurchasePrice((parseFloat(val) * qty).toFixed(2));
                    } else {
                      setTotalPurchasePrice(val);
                      if (qty > 0) setPurchasePrice((parseFloat(val) / qty).toFixed(2));
                    }
                  }}
                  placeholder={purchaseEntryMode === 'per-unit' ? "Cost per unit..." : "Total amount paid..."}
                />
              </div>
              <div className="mt-1 flex items-center justify-between px-1 text-[9px] font-bold uppercase text-[var(--muted)]">
                 <span>{purchaseEntryMode === 'per-unit' ? `Total Batch Cost: ₹${totalPurchasePrice || '0.00'}` : `Per ${unit}: ₹${purchasePrice || '0.00'}`}</span>
              </div>
            </div>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-[var(--text)]">Additional Notes</span>
              <textarea
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)] resize-none"
                rows="3"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Details about quality, color variants, or storage location..."
              />
            </label>
          </div>
        </section>

        <section className="rounded-[32px] border-2 border-[var(--accent)] bg-[var(--accent-soft)]/10 p-6 sm:p-8 shadow-xl backdrop-blur relative overflow-hidden">
          {/* Decorative Background Element */}
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[var(--accent)]/5 blur-3xl"></div>
          
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between relative z-10">
            <div className="text-center lg:text-left">
              <h3 className="text-h3 text-[var(--accent)]">Inventory Summary</h3>
              <p className="text-sm font-medium text-[var(--muted)]">Live pricing calculation</p>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:flex lg:items-center lg:gap-12">
              <div className="flex flex-col items-center lg:items-end">
                <span className="mb-1 text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Purchase Value</span>
                <span className="text-xl font-bold text-stone-600">₹{(parseFloat(purchasePrice || 0) * (parseFloat(quantity) || 1)).toLocaleString()}</span>
                <p className="mt-0.5 text-[9px] font-bold text-[var(--muted)] bg-stone-100 px-2 py-0.5 rounded-full">₹{purchasePrice || '0'} / {unit}</p>
              </div>
              
              <div className="hidden sm:block h-10 w-px bg-[var(--border)] lg:h-12"></div>
              <div className="block sm:hidden h-px w-full bg-[var(--border)]/50"></div>

              <div className="flex flex-col items-center lg:items-end">
                <span className="mb-1 text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Selling Batch</span>
                <span className="text-xl font-bold text-[var(--text)]">₹{parseFloat(totalSellingPrice || 0).toLocaleString()}</span>
                <p className="mt-0.5 text-[9px] font-bold text-[var(--muted)]">Target Revenue</p>
              </div>

              <div className="hidden sm:block h-10 w-px bg-[var(--border)] lg:h-12"></div>
              <div className="block sm:hidden h-px w-full bg-[var(--border)]/50"></div>

              <div className="flex flex-col items-center lg:items-end">
                <span className="mb-1 text-[10px] font-black uppercase tracking-widest text-green-600">Est. Profit Margin</span>
                <div className="flex flex-col items-center lg:items-end">
                  <span className="text-xl font-black text-green-600">₹{( (getCalculatedUnitPrice() - parseFloat(purchasePrice || 0)) * (parseFloat(quantity) || 0) ).toLocaleString()}</span>
                  <p className="mt-0.5 text-[9px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                    +₹{(getCalculatedUnitPrice() - parseFloat(purchasePrice || 0)).toFixed(2)} per {unit}
                  </p>
                </div>
              </div>

              <div className="hidden sm:block h-10 w-px bg-[var(--border)] lg:h-12"></div>
              <div className="block sm:hidden h-px w-full bg-[var(--border)]/50"></div>

              <div className="flex flex-col items-center lg:items-end">
                <span className="mb-1 text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">Final Unit Price</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[var(--accent)]">₹{getCalculatedUnitPrice().toFixed(2)}</span>
                </div>
                <p className="text-[10px] font-bold text-[var(--accent)] opacity-80 uppercase tracking-tighter">Per {unit}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col items-end gap-2">
          <p className="text-xs font-semibold text-[var(--muted)]">
            Confirming: <span className="text-[var(--accent)]">₹{getCalculatedUnitPrice().toFixed(2)}</span> per {unit || 'unit'}
          </p>
          <div className="flex justify-end gap-3">
            <button
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-6 py-3 font-semibold transition hover:bg-[var(--soft)]"
              type="button"
              onClick={() => {
                setProductId('');
                setProductName('');
                setProductType('');
                setQuantity('');
                setUnit('nos');
                setPurchasePrice('');
                setSellingPrice('');
                setGst('');
                setDiscount('');
                setVendorName('');
                setNote('');
              }}
            >
              Cancel
            </button>
            <button
              className="rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white shadow-lg shadow-[var(--accent)]/25 transition hover:brightness-95"
              type="submit"
            >
              Submit Inventory
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default CreateInventoryPage;
