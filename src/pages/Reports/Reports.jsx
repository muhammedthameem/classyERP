import React, { useState, useEffect, useRef } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, ShoppingBag, TrendingUp, UsersRound, Download, Clock, BarChart3 } from 'lucide-react'
import html2pdf from 'html2pdf.js'
import { stats, orders } from '../../utils/constants'
import ReportStatCard from '../../components/ReportStatCard'

function ReportsPage({ themeStyle, showGlobalToast }) {
  const [sales, setSales] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [filter, setFilter] = useState('all'); // all, today, month, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination State
  const [salesPage, setSalesPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setSales(JSON.parse(localStorage.getItem('sales') || '[]'));
    setOrders(JSON.parse(localStorage.getItem('orders') || '[]'));
    setClients(JSON.parse(localStorage.getItem('clients') || '[]'));
    setInventory(JSON.parse(localStorage.getItem('inventory') || '[]'));
    // Reset pages when filter changes
    setSalesPage(1);
    setOrdersPage(1);
  }, [filter, startDate, endDate]);

  const getFilteredData = (data) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return data.filter(item => {
      const dateStr = item.timestamp || item.createdAt;
      if (!dateStr) return true;
      const itemDate = new Date(dateStr).getTime();

      if (filter === 'today') return itemDate >= today;
      if (filter === 'month') return itemDate >= firstOfMonth;
      if (filter === 'custom' && startDate && endDate) {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        return itemDate >= start && itemDate <= end;
      }
      return true;
    }).sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
  };

  const filteredSales = getFilteredData(sales);
  const filteredOrders = getFilteredData(orders);
  const filteredInventory = getFilteredData(inventory);

  // Paginated Data
  const paginatedSales = filteredSales.slice((salesPage - 1) * itemsPerPage, salesPage * itemsPerPage);
  const paginatedOrders = filteredOrders.slice((ordersPage - 1) * itemsPerPage, ordersPage * itemsPerPage);

  const totalSalesPages = Math.ceil(filteredSales.length / itemsPerPage);
  const totalOrdersPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const stats = {
    totalRevenue: filteredSales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0),
    totalInvestment: filteredInventory.reduce((sum, i) => sum + (parseFloat(i.purchasePrice || 0) * (parseFloat(i.quantity) || 0)), 0),
    salesCount: filteredSales.length,
    pendingOrders: filteredOrders.filter(o => o.status === 'Not Ready' || o.status === 'Pending').length,
    totalClients: clients.length
  };

  const downloadPDF = () => {
    if (showGlobalToast) showGlobalToast('Generating Report', 'Building your professional business report...');

    const container = document.createElement('div');
    container.style.padding = '40px';
    container.style.color = '#111827';
    container.style.fontFamily = 'system-ui, -apple-system, sans-serif';

    let html = `
      <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #8e4431; padding-bottom: 20px;">
        <h1 style="margin: 0; color: #8e4431; font-size: 28px; letter-spacing: 2px;">CLASSY BOUTIQUE</h1>
        <p style="margin: 5px 0 0 0; color: #6b7280; text-transform: uppercase; font-size: 12px; font-weight: 700; letter-spacing: 1px;">Business Intelligence Report</p>
        <p style="margin: 15px 0 0 0; font-size: 14px; color: #374151;">Filter: <strong>${filter.toUpperCase()}</strong> | Date: <strong>${new Date().toLocaleDateString()}</strong></p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px;">
        <div style="background: #f0fdf4; border: 1px solid #bcf0da; padding: 15px; border-radius: 12px; text-align: center;">
          <p style="margin: 0; font-size: 10px; color: #166534; font-weight: 800; text-transform: uppercase;">Total Revenue</p>
          <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: 900; color: #14532d;">₹${stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div style="background: #eff6ff; border: 1px solid #dbeafe; padding: 15px; border-radius: 12px; text-align: center;">
          <p style="margin: 0; font-size: 10px; color: #1e40af; font-weight: 800; text-transform: uppercase;">Sales Count</p>
          <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: 900; color: #1e3a8a;">${stats.salesCount}</p>
        </div>
        <div style="background: #fff7ed; border: 1px solid #ffedd5; padding: 15px; border-radius: 12px; text-align: center;">
          <p style="margin: 0; font-size: 10px; color: #9a3412; font-weight: 800; text-transform: uppercase;">Pending Orders</p>
          <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: 900; color: #7c2d12;">${stats.pendingOrders}</p>
        </div>
        <div style="background: #faf5ff; border: 1px solid #f3e8ff; padding: 15px; border-radius: 12px; text-align: center;">
          <p style="margin: 0; font-size: 10px; color: #6b21a8; font-weight: 800; text-transform: uppercase;">Purchase Investment</p>
          <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: 900; color: #581c87;">₹${stats.totalInvestment.toLocaleString()}</p>
        </div>
      </div>

      <div style="margin-bottom: 40px;">
        <h3 style="font-size: 16px; color: #111827; border-left: 4px solid #8e4431; padding-left: 12px; margin-bottom: 20px;">Purchase & Inventory Details</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Date</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Product</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Vendor</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Purchase Cost</th>
            </tr>
          </thead>
          <tbody>
            ${filteredInventory.length > 0 ? filteredInventory.map(i => `
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">${new Date(i.createdAt).toLocaleDateString()}</td>
                <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">${i.productName}</td>
                <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">${i.vendorName || 'N/A'}</td>
                <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: bold;">₹${(parseFloat(i.purchasePrice || 0) * (parseFloat(i.quantity) || 0)).toLocaleString()}</td>
              </tr>
            `).join('') : '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #9ca3af;">No purchase records found</td></tr>'}
          </tbody>
        </table>
      </div>

      <div style="margin-bottom: 40px;">
        <h3 style="font-size: 16px; color: #111827; border-left: 4px solid #8e4431; padding-left: 12px; margin-bottom: 20px;">Sales Summary</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Date</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Sale ID</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Customer</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSales.length > 0 ? filteredSales.map(s => `
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">${new Date(s.timestamp).toLocaleDateString()}</td>
                <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; font-family: monospace; font-weight: bold;">${s.saleId}</td>
                <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">${s.client?.name || 'Guest'}</td>
                <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: bold;">₹${parseFloat(s.total).toFixed(2)}</td>
              </tr>
            `).join('') : '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #9ca3af;">No sales records found</td></tr>'}
          </tbody>
        </table>
      </div>

      <div>
        <h3 style="font-size: 16px; color: #111827; border-left: 4px solid #8e4431; padding-left: 12px; margin-bottom: 20px;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Order ID</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Product</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Status</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${filteredOrders.length > 0 ? filteredOrders.map(o => `
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; font-weight: bold;">#${o.id}</td>
                <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">${o.product}</td>
                <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">
                  <span style="background: #f3f4f6; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase;">${o.status}</span>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: bold;">${o.price}</td>
              </tr>
            `).join('') : '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #9ca3af;">No order records found</td></tr>'}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 60px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 20px;">
        Generated by Classy Couture ERP System | © ${new Date().getFullYear()}
      </div>
    `;

    container.innerHTML = html;

    const opt = {
      margin: 10,
      filename: `Classy_Boutique_Report_${filter}_${new Date().toLocaleDateString()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(container).save().then(() => {
      if (showGlobalToast) showGlobalToast('Download Complete', 'Business report saved successfully.');
    });
  };

  const downloadCSV = (type) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    if (type === 'sales') {
      csvContent += "Date,Sale ID,Customer,Total\n";
      filteredSales.forEach(s => {
        csvContent += `${new Date(s.timestamp).toLocaleDateString()},${s.saleId},${s.client?.name || 'Guest'},${s.total}\n`;
      });
    } else if (type === 'orders') {
      csvContent += "Date,Order ID,Customer,Product,Status,Price\n";
      filteredOrders.forEach(o => {
        csvContent += `${new Date(o.createdAt).toLocaleDateString()},${o.id},${o.clientName},${o.product},${o.status},${o.price}\n`;
      });
    } else if (type === 'inventory') {
      csvContent += "Date,Product ID,Product Name,Vendor,Purchase Price,Quantity,Total Purchase\n";
      filteredInventory.forEach(i => {
        csvContent += `${new Date(i.createdAt).toLocaleDateString()},${i.productId},${i.productName},${i.vendorName || ''},${i.purchasePrice},${i.quantity},${parseFloat(i.purchasePrice || 0) * (parseFloat(i.quantity) || 0)}\n`;
      });
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${type}_report_${filter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showGlobalToast) showGlobalToast('Report Downloaded', `${type.toUpperCase()} report is ready.`);
  };

  return (
    <div style={themeStyle} className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent)] mb-1">
            <BarChart3 size={16} /> Business Analytics
          </p>
          <h1 className="text-3xl font-semibold">Reports & Insights</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Analyze your boutique performance and financial growth.</p>
        </div>
        <button
          onClick={downloadPDF}
          className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition hover:brightness-95 active:scale-95"
        >
          <Download size={18} /> Export Full Report
        </button>
      </div>

      <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' }
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === btn.id ? 'bg-[var(--accent)] text-white shadow-lg' : 'bg-[var(--soft)] text-[var(--muted)] hover:text-[var(--text)]'}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filter === 'custom' && (
        <div className="flex flex-wrap items-center gap-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 animate-in slide-in-from-top-2 duration-300 shadow-sm">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-[var(--muted)] ml-1">Start Date</p>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-bold outline-none focus:border-[var(--accent)]" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-[var(--muted)] ml-1">End Date</p>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-bold outline-none focus:border-[var(--accent)]" />
          </div>
          <div className="mt-5 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <CalendarDays size={20} />
          </div>
        </div>
      )}

      {/* Printable Wrapper */}
      <div id="report-content" className="space-y-8 p-1">
        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <ReportStatCard icon={<TrendingUp className="text-green-500" />} label="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} color="green" />
          <ReportStatCard icon={<ShoppingBag className="text-blue-500" />} label="Total Purchase" value={`₹${stats.totalInvestment.toLocaleString()}`} color="red" />
          <ReportStatCard icon={<Clock className="text-orange-500" />} label="Pending Orders" value={stats.pendingOrders} color="orange" />
          <ReportStatCard icon={<UsersRound className="text-purple-500" />} label="Total Customers" value={stats.totalClients} color="purple" />
        </div>

        <div className="grid gap-8 lg:grid-cols-1">
          {/* Purchase & Inventory Analysis */}
          <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] lg:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Purchase Analysis</h3>
                <p className="text-xs text-[var(--muted)]">Filtered entries: ${filteredInventory.length}</p>
              </div>
              <button onClick={() => downloadCSV('inventory')} className="flex items-center gap-2 rounded-xl bg-[var(--soft)] px-4 py-2 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white">
                <Download size={14} /> Export CSV
              </button>
            </div>
            <div className="erp-table-container">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Vendor</th>
                    <th className="text-right">Unit Cost</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Total Purchase</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map(i => (
                    <tr key={i.id}>
                      <td>{new Date(i.createdAt).toLocaleDateString()}</td>
                      <td className="font-bold">{i.productName}</td>
                      <td className="font-medium text-[var(--muted)]">{i.vendorName || 'N/A'}</td>
                      <td className="text-right">₹{parseFloat(i.purchasePrice || 0).toFixed(2)}</td>
                      <td className="text-right">{i.quantity} {i.unit}</td>
                      <td className="text-right font-black text-red-500">₹{(parseFloat(i.purchasePrice || 0) * (parseFloat(i.quantity) || 0)).toLocaleString()}</td>
                    </tr>
                  ))}
                  {filteredInventory.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center text-[var(--muted)]">No purchase records found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Sales Analysis Table */}
          <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] lg:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Sales Analysis</h3>
                <p className="text-xs text-[var(--muted)]">Filtered results: ${filteredSales.length}</p>
              </div>
              <button onClick={() => downloadCSV('sales')} className="flex items-center gap-2 rounded-xl bg-[var(--soft)] px-4 py-2 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white">
                <Download size={14} /> Export CSV
              </button>
            </div>
            <div className="erp-table-container">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Sale ID</th>
                    <th>Customer</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSales.map(s => (
                    <tr key={s.id}>
                      <td>{new Date(s.timestamp).toLocaleDateString()}</td>
                      <td className="font-mono font-bold text-[var(--muted)]">{s.saleId}</td>
                      <td className="font-medium">{s.client?.name || 'Guest'}</td>
                      <td className="text-right font-black text-[var(--accent)]">₹{parseFloat(s.total).toFixed(2)}</td>
                    </tr>
                  ))}
                  {paginatedSales.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center text-[var(--muted)]">No sales found for this period</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalSalesPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-4">
                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Page ${salesPage} of ${totalSalesPages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={salesPage === 1}
                    onClick={() => setSalesPage(prev => prev - 1)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] transition hover:bg-[var(--soft)] disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={salesPage === totalSalesPages}
                    onClick={() => setSalesPage(prev => prev + 1)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] transition hover:bg-[var(--soft)] disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Order Tracking Table */}
          <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] lg:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Order Tracking</h3>
                <p className="text-xs text-[var(--muted)]">Filtered results: ${filteredOrders.length}</p>
              </div>
              <button onClick={() => downloadCSV('orders')} className="flex items-center gap-2 rounded-xl bg-[var(--soft)] px-4 py-2 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white">
                <Download size={14} /> Export CSV
              </button>
            </div>
            <div className="erp-table-container">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Product</th>
                    <th>Status</th>
                    <th className="text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map(o => (
                    <tr key={o.id}>
                      <td className="font-bold">#${o.id}</td>
                      <td>{o.product}</td>
                      <td>
                        <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${o.status === 'Completed' ? 'bg-green-100 text-green-700' : o.status === 'Sold' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="text-right font-bold">{o.price}</td>
                    </tr>
                  ))}
                  {paginatedOrders.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center text-[var(--muted)]">No orders found for this period</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalOrdersPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-4">
                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Page ${ordersPage} of ${totalOrdersPages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={ordersPage === 1}
                    onClick={() => setOrdersPage(prev => prev - 1)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] transition hover:bg-[var(--soft)] disabled:opacity-30"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={ordersPage === totalOrdersPages}
                    onClick={() => setOrdersPage(prev => prev + 1)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] transition hover:bg-[var(--soft)] disabled:opacity-30"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;
