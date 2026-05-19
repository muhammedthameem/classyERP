import React, { useEffect, useState } from 'react';
import supabase from '../supabase';
import { CheckCircle, Download, Package } from 'lucide-react';
import html2pdf from 'html2pdf.js';

function PublicReceipt({ billId, onClear }) {
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchSale = async () => {
      try {
        const cleanId = billId ? billId.trim() : '';
        if (!cleanId) {
          setLoading(false);
          return;
        }

        // Search by ID or by saleId inside the data JSON (Use quotes for strings in .or)
        const { data, error } = await supabase
          .from('erp_sales')
          .select('*')
          .or(`id.eq."${cleanId}",data->>saleId.eq."${cleanId}"`)
          .maybeSingle();

        if (data) {
          setSale(data.data || data);
        }
      } catch (error) {
        console.error("Error fetching sale:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSale();
  }, [billId]);

  const handleDownload = async () => {
    const element = document.getElementById('printable-bill');
    if (!element || isGenerating) return;
    
    try {
      setIsGenerating(true);
      const opt = {
        margin: 0,
        filename: `Receipt_${sale.saleId}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: [80, 200], orientation: 'portrait' }
      };
      
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF Generation Error:", err);
      alert("Failed to generate PDF. Please try again or take a screenshot.");
    } finally {
      setIsGenerating(false);
      // Clean up any potential html2pdf overlays
      setTimeout(() => {
        const overlays = document.querySelectorAll('.html2pdf__overlay');
        overlays.forEach(o => o.remove());
      }, 500);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#f7f2ec]">
      <div className="text-center">
        <div className="h-12 w-12 border-4 border-[#8B4513] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">Loading Receipt...</p>
      </div>
    </div>
  );

  if (!sale) return (
    <div className="flex h-screen items-center justify-center bg-[#f7f2ec] p-6">
      <div className="text-center max-w-sm">
        <div className="h-20 w-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-rose-500/10">
          <Package size={40} />
        </div>
        <h2 className="text-2xl font-black mb-2">Receipt Not Found</h2>
        <p className="text-stone-500 text-sm mb-8 leading-relaxed">We couldn't find a digital receipt with ID <span className="text-stone-900 font-bold">#{billId}</span>. Please check the link or contact the shop.</p>
        <button
          onClick={() => {
            if (onClear) onClear();
            window.history.replaceState({}, '', '/');
          }}
          className="inline-block px-8 py-4 bg-stone-900 text-white rounded-2xl font-bold text-sm shadow-xl hover:brightness-110 transition"
        >
          Go to Login
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f2ec] p-4 lg:p-10 flex flex-col items-center">
      <div className="w-full max-w-lg mb-8 text-center">
        <div className="flex items-center justify-center gap-2 text-[#8B4513] mb-2">
          <CheckCircle size={18} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Digital Receipt</span>
        </div>
        <h1 className="text-3xl font-black mb-2 text-stone-900">Classy Couture</h1>
        <p className="text-stone-500 text-sm">Thank you for your purchase!</p>
      </div>

      <div id="printable-bill" className="mb-8 bg-white p-6 text-black shadow-2xl rounded-sm overflow-hidden mx-auto" style={{ width: '80mm', minHeight: '120mm', fontFamily: 'monospace' }}>
        <div className="text-center mb-6 border-b-2 border-dashed border-gray-300 pb-6">
          <img src="/logo-black.png" alt="Logo" className="w-24 h-24 mx-auto mb-4 object-contain" />
          <h3 className="text-lg font-bold uppercase tracking-tight">Classy Couture</h3>
          <p className="text-[9px] font-medium">Be Unique, Be Classy</p>
          <p style={{ margin: '2px 0', fontSize: '9px' }}>Ph : 8606154015</p>
          <div className="mt-4 text-[9px] text-gray-500">
            <p>Order ID: {sale.saleId}</p>
            <p>{new Date(sale.timestamp).toLocaleString()}</p>
          </div>
        </div>

        <div className="mb-6 text-[11px]">
          <p className="font-bold">Customer: {sale.client?.name || 'Guest'}</p>
          {sale.client?.phone && <p>Tel: {sale.client.phone}</p>}
        </div>

        <table className="w-full text-[10px] mb-6">
          <thead>
            <tr className="border-b border-dashed border-gray-300 text-left uppercase">
              <th className="py-2">Item</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Disc</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-gray-200">
            {(sale.items || []).map((item, idx) => {
              const rowTotal = item.rowTotal !== undefined
                ? item.rowTotal
                : (item.qty * item.price) * (1 - (item.discount || 0) / 100);
              const discDisplay = item.rowTotal !== undefined
                ? `₹${parseFloat(item.discount || 0).toFixed(0)}`
                : `${item.discount || 0}%`;

              return (
                <tr key={idx}>
                  <td className="py-3 pr-2">
                    <p className="font-bold">{item.productName}</p>
                    <p className="text-[8px] opacity-60">Rate: ₹{item.rate}{item.clientName ? ` • Client: ${item.clientName}` : ''}</p>
                  </td>
                  <td className="py-3 text-center">{item.qty}</td>
                  <td className="py-3 text-right text-[9px]">{discDisplay}</td>
                  <td className="py-3 text-right font-bold">₹{parseFloat(rowTotal).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="border-t-2 border-dashed border-gray-300 pt-4 mb-6">
          <div className="flex justify-between text-base font-black">
            <span>GRAND TOTAL</span>
            <span>₹{parseFloat(sale.total || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="text-center mt-6 text-[9px] text-gray-500 italic border-t border-dashed border-gray-200 pt-6">
          <p>This is a computer generated receipt.</p>
          <p>No signature required.</p>
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={isGenerating}
        className={`flex items-center gap-3 px-10 py-5 text-white rounded-3xl font-bold shadow-2xl transition-all ${isGenerating ? 'bg-stone-400 cursor-not-allowed' : 'bg-stone-900 hover:scale-105 active:scale-95'}`}
      >
        {isGenerating ? (
          <>
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Generating PDF...
          </>
        ) : (
          <>
            <Download size={20} /> Download PDF Receipt
          </>
        )}
      </button>

      <p className="mt-8 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
        Powered by Classy ERP
      </p>
    </div>
  );
}

export default PublicReceipt;
