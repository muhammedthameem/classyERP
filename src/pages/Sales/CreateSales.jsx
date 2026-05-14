import React, { useState, useEffect, useRef } from 'react'
import { Package, Search, TrendingUp, UsersRound, Trash2, Download, ShoppingCart, CheckCircle, Plus } from 'lucide-react'
import html2pdf from 'html2pdf.js'
import { orders } from '../../utils/constants'

function CreateSalesPage({ themeStyle, setCurrentPage, showGlobalToast, inventory, setInventory, clients, setClients, orders, setOrders, sales, setSales, saveSale, saveOrder }) {
  const [cart, setCart] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [stockWarning, setStockWarning] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [selectionMode, setSelectionMode] = useState('inventory');
  const [showReceipt, setShowReceipt] = useState(null);
  const [cartAlert, setCartAlert] = useState(null); // { title: '', message: '', type: 'warning'|'error' }


  useEffect(() => {
    if (cart.length === 0) {
      setSelectedClient(null);
      setClientSearch('');
    }
  }, [cart.length]);

  const parsePrice = (priceStr) => {
    if (typeof priceStr !== 'string') return parseFloat(priceStr) || 0;
    return parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
  };

  const filteredProducts = (inventory || []).filter(p =>
    (p?.productName?.toLowerCase() || '').includes(productSearch.toLowerCase()) ||
    (p?.productId?.toLowerCase() || '').includes(productSearch.toLowerCase())
  );

  const readyOrders = (orders || []).filter(o =>
    o.status === 'Completed' &&
    ((o.clientName?.toLowerCase() || '').includes(productSearch.toLowerCase()) ||
      (o.id?.toString() || '').includes(productSearch))
  );

  const filteredClients = (clients || []).filter(c =>
    (c?.name?.toLowerCase() || '').includes(clientSearch.toLowerCase()) ||
    (c?.phone || '').includes(clientSearch)
  );

  const handleAddGuest = () => {
    if (!clientSearch) return;
    const isPhone = /^[0-9]+$/.test(clientSearch);
    const newClient = {
      id: Date.now(),
      name: isPhone ? `Guest (${clientSearch})` : clientSearch,
      phone: isPhone ? clientSearch : '',
      address: '',
      measurements: [],
      createdAt: new Date().toISOString()
    };

    const updatedClients = [...clients, newClient];
    localStorage.setItem('clients', JSON.stringify(updatedClients));
    setClients(updatedClients);
    setCart([]); // Clear cart for new guest
    setSelectedClient(newClient);
    setClientSearch(newClient.name);
    setIsSearchingClient(false);
    if (showGlobalToast) showGlobalToast('Guest Added', `${newClient.name} linked to sale.`);
  };
  const addToCart = (item, type) => {
    if (type === 'order') {
      const existing = cart.find(i => i.orderId === item.id);
      if (existing) {
        setCartAlert({
          title: 'Order Already in Cart',
          message: `Order #${item.id} for ${item.clientName} is already added to your current selection.`,
          type: 'warning'
        });
        return;
      }

      if (selectedClient && item.clientName !== selectedClient.name) {
        setCartAlert({
          title: 'Client Mismatch',
          message: `This order belongs to ${item.clientName}. You cannot add it to a sale linked to ${selectedClient.name}. Please clear the current sale first.`,
          type: 'error'
        });
        return;
      }

      const price = parsePrice(item.price);
      setCart([...cart, {
        id: `ORD-${item.id}`,
        productId: `ORD-${item.id}`,
        orderId: item.id,
        productName: `${item.product} (Order #${item.id})`,
        qty: 1,
        unit: 'nos',
        rate: price,
        discount: 0,
        finalPrice: price,
        type: 'order'
      }]);

      if (!selectedClient) {
        const client = clients.find(c => c.name === item.clientName);
        if (client) setSelectedClient(client);
      }
    } else {
      const existing = cart.find(i => i.id === item.id);
      if (existing) {
        if (existing.qty + 1 > item.quantity) {
          setStockWarning({ name: item.name, stock: item.quantity });
          return;
        }
        setCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      } else {
        if (item.quantity < 1) {
          setStockWarning({ name: item.name, stock: 0 });
          return;
        }
        setCart([...cart, {
          ...item,
          qty: 1,
          rate: item.finalPrice,
          discount: item.discount || 0,
          type: 'inventory'
        }]);
      }
    }
  };

  const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));

  const updateQty = (id, newQty) => {
    const cartItem = cart.find(i => i.id === id);
    if (cartItem.type === 'order') return;
    const product = inventory.find(p => p.id === id);
    if (newQty > product.quantity) {
      setStockWarning({ name: product.name, stock: product.quantity });
      return;
    }
    setCart(cart.map(item => item.id === id ? { ...item, qty: Math.max(1, newQty) } : item));
  };

  const calculateSubtotal = () => {
    const total = cart.reduce((sum, item) => {
      const itemTotal = parseFloat(item.finalPrice) * item.qty;
      const discountAmount = itemTotal * ((parseFloat(item.discount) || 0) / 100);
      return sum + (itemTotal - discountAmount);
    }, 0);
    return Number(total.toFixed(2));
  };

  const updateDiscount = (id, newDiscount) => {
    setCart(cart.map(item => item.id === id ? { ...item, discount: parseFloat(newDiscount) || 0 } : item));
  };

  const updatePrice = (id, newPrice) => {
    setCart(cart.map(item => item.id === id ? { ...item, finalPrice: parseFloat(newPrice) || 0 } : item));
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      setCartAlert({
        title: 'Empty Cart',
        message: 'Please add at least one inventory item or completed order to proceed with the sale.',
        type: 'error'
      });
      return;
    }

    const updatedInventory = inventory.map(p => {
      const cartItem = cart.find(item => item.id === p.id && item.type === 'inventory');
      if (cartItem) return { ...p, quantity: p.quantity - cartItem.qty };
      return p;
    });

    const updatedOrders = orders.map(o => {
      const cartItem = cart.find(item => item.orderId === o.id);
      if (cartItem) return { ...o, status: 'Sold', soldDate: new Date().toISOString() };
      return o;
    });

    setInventory(updatedInventory);
    setOrders(updatedOrders);

    // Sync sold orders to cloud
    updatedOrders.forEach(o => {
      const isSoldNow = cart.some(item => item.orderId === o.id);
      if (isSoldNow && saveOrder) {
        saveOrder(o);
      }
    });

    const newSale = {
      id: Date.now(),
      saleId: `SALE-${Math.floor(1000 + Math.random() * 9000)}`,
      client: selectedClient ? { id: selectedClient.id, name: selectedClient.name, phone: selectedClient.phone } : { name: 'Guest', phone: '' },
      items: cart.map(item => ({
        id: item.productId || item.id,
        productName: item.productName,
        qty: item.qty,
        unit: item.unit || 'nos',
        rate: item.rate,
        discount: item.discount || 0,
        price: item.finalPrice,
        type: item.type
      })),
      total: calculateSubtotal(),
      timestamp: new Date().toISOString()
    };
    // Instant Cloud Save
    if (saveSale) saveSale(newSale);

    setSales([...sales, newSale]);
    setShowReceipt(newSale);

    if (showGlobalToast) showGlobalToast('Sale Processed', `Sale ${newSale.saleId} for ₹${parseFloat(newSale.total).toFixed(2)} (${newSale.client.name})`);
    
    setCart([]);
    setSelectedClient(null);
    setClientSearch('');
  };

  const handlePrint = () => {
    if (!showReceipt) return;
    if (showGlobalToast) showGlobalToast('Preparing Receipt', 'Generating your professional bill...');

    const container = document.createElement('div');
    container.style.width = '80mm';
    container.style.padding = '5mm';
    container.style.color = '#000';
    container.style.fontFamily = 'monospace';

    let itemsHtml = showReceipt.items.map(item => `
      <tr>
        <td style="padding: 4px 0; border-bottom: 1px dashed #eee;">
          <div style="font-weight: bold; font-size: 11px;">${item.productName}</div>
          <div style="font-size: 9px; color: #666;">Rate: ₹${item.rate}</div>
        </td>
        <td style="text-align: center; font-size: 11px;">${item.qty}</td>
        <td style="text-align: right; font-size: 11px;">${item.discount}%</td>
        <td style="text-align: right; font-size: 11px; font-weight: bold;">₹${parseFloat(item.price).toFixed(2)}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px dashed #000; padding-bottom: 10px;">
        <h2 style="margin: 0; font-size: 20px; text-transform: uppercase;">Classy Couture</h2>
        <p style="margin: 2px 0; font-size: 10px;">Be Unique, Be Classy</p>
         <p style="margin: 2px 0; font-size: 10px;">Ph : 8606154015</p>
        <div style="margin-top: 8px; font-size: 9px; color: #333;">
          <p style="margin: 2px 0;">ID: ${showReceipt.saleId}</p>
          <p style="margin: 2px 0;">Date: ${new Date(showReceipt.timestamp).toLocaleString()}</p>
        </div>
      </div>

      <div style="margin-bottom: 15px; font-size: 11px;">
        <p style="margin: 2px 0;"><strong>Customer:</strong> ${showReceipt.client.name}</p>
        ${showReceipt.client.phone ? `<p style="margin: 2px 0;"><strong>Tel:</strong> ${showReceipt.client.phone}</p>` : ''}
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
        <thead>
          <tr style="border-bottom: 1px dashed #000; font-size: 10px; text-align: left;">
            <th style="padding: 5px 0;">Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Disc</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="border-top: 2px dashed #000; padding-top: 10px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px;">
          <span>Grand Total:</span>
          <span>₹${parseFloat(showReceipt.total).toFixed(2)}</span>
        </div>
      </div>

      <div style="text-align: center; margin-top: 20px; font-size: 9px; border-top: 1px dashed #eee; padding-top: 10px;">
        <p style="margin: 2px 0; font-weight: bold;">Thank You for Shopping!</p>
        <p style="margin: 2px 0;">Please visit again.</p>
      </div>
    `;

    const opt = {
      margin: 0,
      filename: `Receipt_${showReceipt.saleId}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 3, useCORS: true },
      jsPDF: { unit: 'mm', format: [80, 200], orientation: 'portrait' }
    };

    html2pdf().set(opt).from(container).save().then(() => {
      if (showGlobalToast) showGlobalToast('Success', 'Receipt downloaded successfully.');
    }).catch(err => {
      console.error('PDF Error:', err);
      if (showGlobalToast) showGlobalToast('Export Failed', 'Please try again or contact support.');
    });
  };

  const handleWhatsApp = () => {
    const greeting = "Thank you for choosing Classy Couture! Your elegance is our priority.";
    let message = `*✨ INVOICE: ${showReceipt.saleId} ✨*%0A`;
    message += `*------------------------------*%0A`;
    message += `Hello *${showReceipt.client.name}*,%0A`;
    message += `${greeting}%0A%0A`;

    message += `*ORDER SUMMARY:*%0A`;
    showReceipt.items.forEach(item => {
      message += `• ${item.productName} (x${item.qty}) - ₹${item.price}%0A`;
    });

    message += `%0A*Grand Total: ₹${parseFloat(showReceipt.total).toFixed(2)}*%0A`;
    message += `*------------------------------*%0A`;
    message += `📄 *Download Digital Receipt:*%0A`;
    message += `https://classy-erp.vercel.app/?bill=${showReceipt.saleId}%0A%0A`;
    message += `*Visit again for more unique designs!*%0A`;
    message += `_Classy Couture - Be Unique, Be Classy_`;

    const phone = showReceipt.client.phone ? showReceipt.client.phone.replace(/[^0-9]/g, '') : '';
    // Adding a prefix if not present (assuming Indian numbers if 10 digits)
    const formattedPhone = phone.length === 10 ? `91${phone}` : phone;

    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  const handleSMS = () => {
    if (!showReceipt) return;

    let itemsText = showReceipt.items.map(item => `${item.productName} (x${item.qty}) - ₹${item.price}`).join(', ');

    let message = `Hi ${showReceipt.client.name}, %0a%0a`;
    message += `Items: ${itemsText}%0a`;
    message += `Grand Total: ₹${parseFloat(showReceipt.total).toFixed(2)}%0a%0a`;
    message += `Thank you for shopping!%0a`;
    message += `Your elegance is our priority.%0a`;
    message += `Please visit again for more unique designs.%0a%0a`;
    message += `Digital Receipt: https://classy-couture.web.app/bill/${showReceipt.saleId}`;

    const phone = showReceipt.client.phone ? showReceipt.client.phone.replace(/[^0-9]/g, '') : '';
    window.location.href = `sms:${phone}?body=${message}`;
  };

  const handleShare = async () => {
    if (!showReceipt) return;
    if (showGlobalToast) showGlobalToast('Preparing Share', 'Generating PDF for sharing...');

    const container = document.createElement('div');
    container.style.width = '80mm';
    container.style.padding = '5mm';
    container.style.color = '#000';
    container.style.fontFamily = 'monospace';

    let itemsHtml = showReceipt.items.map(item => `
      <tr>
        <td style="padding: 4px 0; border-bottom: 1px dashed #eee;">
          <div style="font-weight: bold; font-size: 11px;">${item.productName}</div>
          <div style="font-size: 9px; color: #666;">Rate: ₹${item.rate}</div>
        </td>
        <td style="text-align: center; font-size: 11px;">${item.qty}</td>
        <td style="text-align: right; font-size: 11px;">${item.discount}%</td>
        <td style="text-align: right; font-size: 11px; font-weight: bold;">₹${parseFloat(item.price).toFixed(2)}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px dashed #000; padding-bottom: 10px;">
        <h2 style="margin: 0; font-size: 20px; text-transform: uppercase;">Classy Couture</h2>
        <p style="margin: 2px 0; font-size: 10px;">Be Unique, Be Classy</p>
        <p style="margin: 2px 0; font-size: 10px;">Ph : 8606154015</p>
      </div>
      <div style="margin-bottom: 15px; font-size: 11px;">
        <p style="margin: 2px 0;"><strong>Customer:</strong> ${showReceipt.client.name}</p>
        <p style="margin: 2px 0;"><strong>Bill:</strong> ${showReceipt.saleId}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
        <thead>
          <tr style="border-bottom: 1px dashed #000; font-size: 10px; text-align: left;">
            <th style="padding: 5px 0;">Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Disc</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="border-top: 2px dashed #000; padding-top: 10px; font-size: 12px; font-weight: bold; text-align: right;">
        Grand Total: ₹${parseFloat(showReceipt.total).toFixed(2)}
      </div>
    `;

    const opt = {
      margin: 0,
      filename: `Receipt_${showReceipt.saleId}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: [80, 150], orientation: 'portrait' }
    };

    try {
      const pdfBlob = await html2pdf().set(opt).from(container).output('blob');
      const file = new File([pdfBlob], `Bill_${showReceipt.saleId}.pdf`, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Classy Couture Bill',
          text: `Hi ${showReceipt.client.name}, here is your bill from Classy Couture.`
        });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Bill_${showReceipt.saleId}.pdf`;
        a.click();
        if (showGlobalToast) showGlobalToast('Download Started', 'Sharing not supported on this device.');
      }
    } catch (err) {
      console.error('Share error:', err);
      if (showGlobalToast) showGlobalToast('Error', 'Could not share the file.');
    }
  };



  return (
    <div style={themeStyle} className="space-y-6">
      {/* Cart Alert Modal (Generic) */}
      {cartAlert && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCartAlert(null)}></div>
          <div className="relative w-full max-w-sm rounded-[32px] bg-[var(--surface)] p-8 shadow-2xl border border-[var(--border)] animate-in zoom-in duration-300 text-center">
            <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl mx-auto ${cartAlert.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
              <Package size={32} />
            </div>
            <h3 className="mb-2 text-xl font-bold text-[var(--text)]">{cartAlert.title}</h3>
            <p className="mb-8 text-[var(--muted)] text-sm leading-relaxed">{cartAlert.message}</p>
            <button
              onClick={() => setCartAlert(null)}
              className="w-full rounded-2xl bg-[var(--text)] py-4 font-bold text-white transition hover:brightness-110 shadow-lg"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Stock Warning Modal */}
      {stockWarning && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setStockWarning(null)}></div>
          <div className="relative w-full max-w-sm rounded-[32px] bg-[var(--surface)] p-8 shadow-2xl border border-red-100 animate-in zoom-in duration-300">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 mx-auto">
              <Package size={32} />
            </div>
            <h3 className="mb-2 text-center text-xl font-bold text-[var(--text)]">Insufficient Stock</h3>
            <p className="mb-8 text-center text-[var(--muted)] text-sm leading-relaxed">
              Sorry! <span className="font-bold text-[var(--text)]">{stockWarning.name}</span> only has <span className="font-bold text-red-500">{stockWarning.stock}</span> units available in inventory.
            </p>
            <button
              onClick={() => setStockWarning(null)}
              className="w-full rounded-2xl bg-[var(--text)] py-4 font-bold text-white transition hover:brightness-110 shadow-lg"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setCurrentPage('view-sales')}></div>
          <div className="relative w-full max-w-2xl rounded-[32px] bg-[var(--surface)] p-8 shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh]">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-[var(--accent)] mb-1">
                  <CheckCircle size={20} />
                  <span className="text-sm font-bold uppercase tracking-widest">Transaction Successful</span>
                </div>
                <h2 className="text-3xl font-black">Sales Receipt</h2>
              </div>
              <button onClick={() => setCurrentPage('view-sales')} className="h-12 w-12 grid place-items-center rounded-2xl hover:bg-[var(--soft)] transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div id="printable-bill" className="mb-8 bg-white p-4 text-black shadow-inner overflow-hidden mx-auto" style={{ width: '80mm', minHeight: '120mm', fontFamily: 'monospace' }}>
              <div className="text-center mb-4 border-b-2 border-dashed border-gray-300 pb-4">
                <img src="/logo-black.png" alt="Logo" className="w-28 h-32 mx-auto mb-4 object-contain" />
                <h3 className="text-xl font-bold uppercase tracking-tight">Classy Couture</h3>
                <p className="text-[10px] font-medium">Be Unique, Be Classy</p>
                <p style={{ margin: '2px 0', fontSize: '10px' }}>Ph : 8606154015</p>
                <div className="mt-2 text-[10px] text-gray-500">
                  <p>Order ID: {showReceipt.saleId}</p>
                  <p>{new Date(showReceipt.timestamp).toLocaleString()}</p>
                </div>
              </div>

              <div className="mb-4 text-[11px]">
                <p className="font-bold">Customer: {showReceipt.client.name}</p>
                {showReceipt.client.phone && <p>Tel: {showReceipt.client.phone}</p>}
              </div>

              <table className="w-full text-[10px] mb-4">
                <thead>
                  <tr className="border-b border-dashed border-gray-300 text-left">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center px-2">Qty</th>
                    <th className="py-1 text-right px-2">Disc (%)</th>
                    <th className="py-1 text-right px-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-gray-200">
                  {showReceipt.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 pr-1">
                        <p className="font-bold">{item.productName}</p>
                        <p className="text-[8px] opacity-70">Rate: ₹{item.rate}</p>
                      </td>
                      <td className="py-2 text-center px-2">{item.qty}</td>
                      <td className="py-2 text-right px-2">{item.discount}%</td>
                      <td className="py-2 text-right px-2 font-bold">₹{((item.qty * item.price) * (1 - (item.discount || 0) / 100)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t-2 border-dashed border-gray-300 pt-3 space-y-1">
                <div className="flex justify-between text-sm font-black">
                  <span>Grand Total</span>
                  <span>₹{showReceipt.total}</span>
                </div>
              </div>

              <div className="text-center mt-6 text-[9px] text-gray-500 italic border-t border-dashed border-gray-200 pt-4">
                <p className="font-bold text-black mb-1">Thank you for shopping!</p>
                <p>Your elegance is our priority.</p>
                <p>Please visit again for more unique designs.</p>
              </div>
            </div>

            <div className="mb-6 p-4 rounded-2xl bg-[var(--surface-strong)] border border-[var(--border)]">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-2">WhatsApp / SMS Number</label>
              <div className="flex gap-2">
                <input 
                  type="tel" 
                  value={showReceipt.client.phone || ''} 
                  onChange={(e) => setShowReceipt({
                    ...showReceipt,
                    client: { ...showReceipt.client, phone: e.target.value }
                  })}
                  placeholder="Enter phone number"
                  className="flex-1 bg-transparent border-b border-[var(--border)] py-2 outline-none text-sm font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <button onClick={handlePrint} className="flex items-center justify-center gap-3 rounded-2xl border-2 border-[var(--border)] py-4 font-bold transition hover:bg-[var(--soft)]">
                <Download size={20} /> Print Bill
              </button>
              <button onClick={handleShare} className="flex items-center justify-center gap-3 rounded-2xl border-2 border-[var(--border)] py-4 font-bold transition hover:bg-[var(--soft)] text-[var(--accent)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                Share File
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={handleSMS} className="flex items-center justify-center gap-3 rounded-2xl bg-[var(--text)] py-4 font-bold text-white shadow-xl transition hover:brightness-110">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                Send SMS
              </button>
              <button onClick={handleWhatsApp} className="flex items-center justify-center gap-3 rounded-2xl bg-[#25D366] py-4 font-bold text-white shadow-xl shadow-[#25D366]/20 transition hover:brightness-95">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="fill-white"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.4 8.38 8.38 0 0 1 3.8.9L22 4Z" /></svg>
                Send WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent)] mb-1">
            <TrendingUp size={16} /> Checkout Terminal
          </p>
          <h1 className="text-3xl font-semibold">Create Sales</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Process boutique inventory or collect cash for finished orders.</p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {/* Selection Source Toggle */}
          <div className="flex flex-wrap gap-2 rounded-2xl bg-[var(--surface-strong)] p-1.5 border border-[var(--border)] w-full sm:w-fit">
            <button
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${selectionMode === 'inventory' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
              onClick={() => { setSelectionMode('inventory'); setProductSearch(''); }}
            >
              Inventory Items
            </button>
            <button
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${selectionMode === 'orders' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
              onClick={() => { setSelectionMode('orders'); setProductSearch(''); }}
            >
              Finished Orders
            </button>
          </div>

          {/* Quick Add Client Orders Reminder */}
          {selectedClient && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="rounded-[24px] border border-[var(--accent)]/20 bg-[var(--accent-soft)]/20 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.1em] text-[var(--accent)]">
                    Collections for {selectedClient.name}
                  </h4>
                  {orders.filter(o => o.clientName === selectedClient.name && o.status === 'Completed' && !cart.some(ci => ci.orderId === o.id)).length > 0 && (
                    <span className="flex h-5 w-5 animate-bounce items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white shadow-lg">
                      {orders.filter(o => o.clientName === selectedClient.name && o.status === 'Completed' && !cart.some(ci => ci.orderId === o.id)).length}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  {orders.filter(o => o.clientName === selectedClient.name && o.status === 'Completed' && !cart.some(ci => ci.orderId === o.id)).map(o => (
                    <button
                      key={o.id}
                      onClick={() => addToCart(o, 'order')}
                      className="group flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-sm transition-all hover:border-[var(--accent)] hover:shadow-md active:scale-95"
                    >
                      <div className="relative">
                        <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                        <div className="absolute inset-0 h-2.5 w-2.5 animate-ping rounded-full bg-green-500 opacity-75" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black text-[var(--text)]">{o.product}</p>
                        <p className="text-[10px] font-bold text-[var(--muted)]">Order #{o.id} • ₹{o.price}</p>
                      </div>
                      <Plus size={16} className="text-[var(--accent)] transition-transform group-hover:rotate-90" />
                    </button>
                  ))}

                  {orders.filter(o => o.clientName === selectedClient.name && o.status === 'Completed' && !cart.some(ci => ci.orderId === o.id)).length === 0 && (
                    <div className="flex w-full items-center gap-2 text-xs font-medium text-[var(--muted)] italic py-2">
                      <CheckCircle size={14} className="text-green-500 opacity-50" />
                      No pending collections for this client.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Item Selection */}
          <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart size={20} className="text-[var(--accent)]" /> {selectionMode === 'inventory' ? 'Stock Selection' : 'Order Collection'}
              </h3>
              <div className="relative w-full max-w-md">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder={selectionMode === 'inventory' ? "Click to see items..." : "Click to see orders..."}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] py-2.5 pl-12 pr-4 outline-none focus:border-[var(--accent)]"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setIsSearchingProduct(true);
                  }}
                  onFocus={() => setIsSearchingProduct(true)}
                />
                {isSearchingProduct && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-2 shadow-2xl backdrop-blur">
                    <div className="flex justify-between items-center px-4 py-2 border-b border-[var(--border)] mb-1">
                      <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Select {selectionMode}</span>
                      <button onClick={() => setIsSearchingProduct(false)} className="text-[var(--accent)] text-xs font-bold">Close</button>
                    </div>
                    {selectionMode === 'inventory' ? (
                      filteredProducts.length > 0 ? filteredProducts.map(p => (
                        <button
                          key={p.id}
                          className="flex w-full items-center justify-between rounded-xl p-4 text-left transition hover:bg-[var(--soft)]"
                          onClick={() => {
                            addToCart(p, 'inventory');
                            setIsSearchingProduct(false);
                            setProductSearch('');
                          }}
                        >
                          <div>
                            <p className="font-semibold">{p.productName}</p>
                            <p className="text-xs text-[var(--muted)]">Stock: {p.quantity} {p.unit}</p>
                          </div>
                          <p className="font-bold text-[var(--accent)]">₹{p.finalPrice}</p>
                        </button>
                      )) : (
                        <p className="p-4 text-center text-xs text-[var(--muted)]">No inventory items found.</p>
                      )
                    ) : (
                      readyOrders.length > 0 ? readyOrders.map(o => (
                        <button
                          key={o.id}
                          className="flex w-full items-center justify-between rounded-xl p-4 text-left transition hover:bg-[var(--soft)]"
                          onClick={() => {
                            addToCart(o, 'order');
                            setIsSearchingProduct(false);
                            setProductSearch('');
                          }}
                        >
                          <div>
                            <p className="font-semibold">{o.clientName}</p>
                            <p className="text-xs text-[var(--muted)]">Order #{o.id} | {o.product}</p>
                          </div>
                          <p className="font-bold text-[var(--accent)]">₹{o.price}</p>
                        </button>
                      )) : (
                        <p className="p-4 text-center text-xs text-[var(--muted)]">No completed orders found.</p>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Add Client Orders */}

            <div className="erp-table-container">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Item Details</th>
                    <th>Qty</th>
                    <th>Rate/Price</th>
                    <th>Disc (%)</th>
                    <th className="text-right">Total</th>
                    <th className="text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length > 0 ? cart.map((item) => (
                    <tr key={item.id} className="group">
                      <td>
                        <p className="font-bold text-[var(--text)]">{item.productName}</p>
                        <p className="text-[10px] text-[var(--muted)] uppercase tracking-tight">
                          {item.productId ? `ID: ${item.productId}` : ''} {item.type === 'order' ? '• Order' : ''}
                        </p>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {item.type === 'inventory' ? (
                            <input
                              type="number"
                              className="w-12 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-1 font-bold text-[var(--text)]"
                              value={item.qty}
                              onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 0)}
                            />
                          ) : <span className="font-bold text-[var(--text)]">{item.qty}</span>}
                          <span className="text-[10px] font-bold text-[var(--muted)] uppercase">{item.unit}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <span className="text-[var(--muted)]">₹</span>
                          <input
                            type="number"
                            className="w-20 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-1 font-bold text-[var(--text)]"
                            value={item.finalPrice}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updatePrice(item.id, e.target.value)}
                          />
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="w-16 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-1 font-bold text-[var(--accent)]"
                          value={item.discount || 0}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => updateDiscount(item.id, e.target.value)}
                        />
                      </td>
                      <td className="text-right font-bold text-[var(--accent)]">
                        ₹{((item.finalPrice * item.qty) * (1 - (item.discount || 0) / 100)).toFixed(2)}
                      </td>
                      <td className="text-right">
                        <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 transition p-2 hover:bg-red-50 rounded-lg">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="text-center text-[var(--muted)] font-medium">No items in cart</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {/* Client Selection */}
          <section className="rounded-[24px] relative z-9 border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <UsersRound size={20} className="text-[var(--accent)]" /> Client Info
            </h3>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search or add client..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] py-2.5 pl-12 pr-4 outline-none focus:border-[var(--accent)]"
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setIsSearchingClient(true);
                }}
                onFocus={() => setIsSearchingClient(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (filteredClients.length > 0) {
                      const c = filteredClients[0];
                      if (selectedClient && selectedClient.id !== c.id && cart.length > 0) {
                        setCart([]);
                        if (showGlobalToast) showGlobalToast('Cart Cleared', 'Switched to different client.');
                      }
                      setSelectedClient(c);
                      setClientSearch(c.name);
                      setIsSearchingClient(false);
                    } else if (clientSearch) {
                      handleAddGuest();
                    }
                  }
                }}
              />
              {isSearchingClient && (
                <div className="absolute top-full left-0 right-0 z-[100] mt-2 max-h-60 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-2 shadow-2xl">
                  <div className="flex justify-between items-center px-3 py-1 border-b border-[var(--border)] mb-1">
                    <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Select Client</span>
                    <button onClick={() => setIsSearchingClient(false)} className="text-[var(--accent)] text-xs font-bold">Close</button>
                  </div>
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      className="flex w-full items-center justify-between rounded-xl p-3 text-left transition hover:bg-[var(--soft)]"
                      onClick={() => {
                        if (selectedClient && selectedClient.id !== c.id && cart.length > 0) {
                          setCart([]);
                          if (showGlobalToast) showGlobalToast('Cart Cleared', 'Switched to different client.');
                        }
                        setSelectedClient(c);
                        setClientSearch(c.name);
                        setIsSearchingClient(false);
                      }}
                    >
                      <div>
                        <p className="font-semibold text-sm">{c.name}</p>
                        <p className="text-[10px] text-[var(--muted)]">{c.phone}</p>
                      </div>
                    </button>
                  ))}
                  {clientSearch && filteredClients.length === 0 && (
                    <button
                      className="flex w-full items-center gap-2 rounded-xl bg-[var(--accent-soft)] p-3 text-left text-sm font-bold text-[var(--accent)] transition hover:brightness-95"
                      onClick={handleAddGuest}
                    >
                      <Plus size={16} />
                      {/^[0-9]+$/.test(clientSearch) ? `Use Phone: ${clientSearch}` : `Add "${clientSearch}" as Guest`}
                    </button>
                  )}
                </div>
              )}
            </div>
            {selectedClient && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--accent-soft)] p-3 border border-[var(--accent)]/10">
                <div>
                  <p className="text-xs font-bold uppercase text-[var(--accent)] opacity-70">Linking Sale To</p>
                  <p className="font-bold text-[var(--accent)]">{selectedClient.name}</p>
                </div>
                <button onClick={() => { setSelectedClient(null); setCart([]); setClientSearch(''); }} className="text-[var(--accent)] hover:scale-110 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            )}
          </section>

          {/* Summary */}
          <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur">
            <h3 className="text-lg font-bold mb-6">Payment Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Total Items</span>
                <span className="font-bold">{cart.reduce((s, i) => s + i.qty, 0)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-4">
                <span className="text-lg font-bold">Grand Total</span>
                <span className="text-3xl font-black text-[var(--accent)]">₹{calculateSubtotal().toFixed(2)}</span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full rounded-2xl bg-[var(--accent)] py-4 text-lg font-bold text-white shadow-xl shadow-[var(--accent)]/30 transition hover:brightness-95 disabled:opacity-50"
              >
                Complete Transaction
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default CreateSalesPage;
