import React, { useState, useEffect } from 'react';
import { Printer, X, ExternalLink } from 'lucide-react';
import { formatDateDDMMYY, getIndianDate } from '../utils/constants';
import { printOrderThermalTag } from '../utils/thermalPrinter';

export default function ThermalTagModal({ order, client, onClose, onPrintSuccess }) {
  const [format, setFormat] = useState('80mm'); // '80mm' | '58mm'
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !isPrinting) {
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [order, client, format, isPrinting]);

  if (!order) return null;

  const orderId = order.orderId || order.id || 'N/A';
  const clientName = order.clientName || client?.name || 'Walk-in Customer';
  const clientPhone = client?.mobile || client?.phone || order.clientPhone || '';
  const orderDateStr = order.orderDate ? formatDateDDMMYY(order.orderDate) : formatDateDDMMYY(getIndianDate());
  const deliveryDateStr = order.deliveryDate ? formatDateDDMMYY(order.deliveryDate) : 'NOT SPECIFIED';

  // Calculate urgency & days left
  let urgencyText = 'STANDARD TIMELINE';
  if (order.deliveryDate) {
    const today = new Date(getIndianDate());
    today.setHours(0, 0, 0, 0);
    const target = new Date(order.deliveryDate);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      urgencyText = `⚠️ OVERDUE BY ${Math.abs(diffDays)} DAYS ⚠️`;
    } else if (diffDays === 0) {
      urgencyText = '⚡ DUE TODAY - CRITICAL ⚡';
    } else if (diffDays === 1) {
      urgencyText = '⚡ DUE TOMORROW - EXPEDITE ⚡';
    } else if (diffDays <= 3) {
      urgencyText = `⚡ DUE IN ${diffDays} DAYS (PRIORITY) ⚡`;
    } else {
      urgencyText = `TARGET: ${diffDays} DAYS REMAINING`;
    }
  }

  const handlePrint = (usePopup = false) => {
    setIsPrinting(true);
    printOrderThermalTag(order, client, { format, usePopup });
    setTimeout(() => {
      setIsPrinting(false);
      if (onPrintSuccess) onPrintSuccess();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl p-4 sm:p-6 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xs">
              <Printer size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-[var(--text)] leading-tight">Order Tag</h3>
              <p className="text-xs text-[var(--muted)] font-medium">ATPOS 80 / POS-80 Roll Compatible</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--soft)] transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Paper Format Selector */}
        <div className="flex items-center justify-between gap-2 p-1.5 bg-[var(--soft)] rounded-2xl mb-3 border border-[var(--border)]">
          <span className="text-xs font-bold text-[var(--muted)] pl-2">Paper Roll:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFormat('80mm')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                format === '80mm'
                  ? 'bg-[var(--surface-strong)] text-[var(--accent)] shadow-xs border border-[var(--border)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              80mm (ATPOS 80)
            </button>
            <button
              type="button"
              onClick={() => setFormat('58mm')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                format === '58mm'
                  ? 'bg-[var(--surface-strong)] text-[var(--accent)] shadow-xs border border-[var(--border)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              58mm (Compact 2")
            </button>
          </div>
        </div>

        {/* Thermal Sticker Live Preview (Clean Minimal Tag: Only Order ID, Item, Customer Name, Dates) */}
        <div className="bg-stone-200/90 dark:bg-stone-950 p-3 sm:p-5 rounded-2xl border border-stone-300 dark:border-stone-800 flex justify-center max-h-[60vh] overflow-y-auto">
          <div
            className={`bg-white text-black p-4 pb-6 rounded-lg shadow-xl font-mono text-left transition-all ${
              format === '58mm' ? 'w-[240px] text-[10px]' : 'w-[290px] text-[11px]'
            }`}
            style={{
              boxShadow: '0 6px 24px -2px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.06)',
              lineHeight: '1.3'
            }}
          >
            {/* Header */}
            <div className="text-center border-b-2 border-dashed border-black pb-2 mb-2">
              <div className="text-base font-black tracking-wider uppercase">CLASSY COUTURE</div>
              <div className="text-[10px] font-black tracking-wider uppercase text-black mt-0.5">ORDER TAG</div>
            </div>

            {/* 1. Order ID & 3. Order Date */}
            <div className="flex justify-between items-center text-[10px] font-bold py-1 border-b border-dashed border-black">
              <span>Order ID: <b className="font-black text-[12px]">#{orderId}</b></span>
              <span>Order Date: <b className="font-black text-[11px]">{orderDateStr}</b></span>
            </div>

            {/* 2. Customer Name (Clean White BG, Bold Border Box) */}
            <div className="bg-white text-black border-2 border-black rounded-md p-2 my-2.5 text-center">
              <div className="text-[9px] font-black uppercase tracking-wider text-stone-600">CUSTOMER NAME</div>
              <div className="text-lg font-black tracking-wide text-black uppercase leading-snug mt-0.5">{clientName}</div>
              {clientPhone && (
                <div className="text-[10px] font-black text-black mt-0.5">Ph: {clientPhone}</div>
              )}
            </div>

            {/* 4. Delivery Date / Customer Date (Clean White BG, Extra Bold Box) */}
            <div className="bg-white text-black border-[2.5px] border-black rounded-md p-2.5 my-2.5 text-center">
              <div className="text-[9.5px] font-black uppercase tracking-wider text-black">★★★ DELIVERY DATE ★★★</div>
              <div className="text-2xl font-black tracking-tight text-black my-0.5 leading-tight">{deliveryDateStr}</div>
              <div className="text-[10px] font-black uppercase text-black tracking-wide">{urgencyText}</div>
            </div>

            {/* 5. Item Details */}
            <div className="border-t border-dashed border-black pt-2 mt-2">
              <div className="text-[9px] font-bold text-stone-600 uppercase">ITEM</div>
              <div className="text-base font-black leading-tight mt-0.5">{order.product || 'Custom Garment'}</div>
              
              <div className="flex justify-between text-[11px] font-bold mt-1.5">
                <span>Type: {order.orderType || 'Stitching'}</span>
                <span>Qty: {order.quantity || order.size || '1'}</span>
              </div>

              {order.notes && (
                <div className="mt-2 p-1.5 bg-stone-100 border-l-2 border-black text-[9.5px] font-bold">
                  <span className="underline">Notes:</span> {order.notes}
                </div>
              )}
            </div>

            {/* Clean Bottom Tear Line */}
            <div className="border-b-2 border-dashed border-black mt-3"></div>
          </div>
        </div>

        {/* Action Buttons - Clean Single-Row Futuristic Layout */}
        <div className="pt-3 border-t border-[var(--border)] mt-3">
          <div className="flex items-center gap-2 w-full">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--soft)] text-xs font-bold transition text-center cursor-pointer active:scale-95"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handlePrint(true)}
              className="h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--soft)] transition flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 shrink-0"
              title="Open in dedicated print window (fallback)"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Popup</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrint(false)}
              disabled={isPrinting}
              className="flex-[2] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-xs shadow-md shadow-indigo-500/25 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Printer size={15} />
              <span>{isPrinting ? 'Opening...' : 'Print Order Tag (ATPOS 80)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
