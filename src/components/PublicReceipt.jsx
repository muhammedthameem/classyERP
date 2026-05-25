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

        // Strategy 1: match data->>'saleId' (PostgREST JSON operator)
        let { data, error } = await supabase
          .from('erp_sales')
          .select('*')
          .eq('data->>saleId', cleanId)
          .maybeSingle();

        // Strategy 2: match top-level id column as text
        if (!data) {
          const res2 = await supabase
            .from('erp_sales')
            .select('*')
            .eq('id', cleanId)
            .maybeSingle();
          if (res2.data) data = res2.data;
        }

        // Strategy 3: fetch recent sales and scan in JS (most reliable fallback)
        if (!data) {
          const res3 = await supabase
            .from('erp_sales')
            .select('*')
            .order('id', { ascending: false })
            .limit(500);
          if (res3.data) {
            const found = res3.data.find(row => {
              const sale = row.data || row;
              return sale.saleId === cleanId || String(row.id) === cleanId;
            });
            if (found) data = found;
          }
        }

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
        jsPDF: { unit: 'mm', format: [97, 200], orientation: 'portrait' }
      };
      
      // Generate Blob instead of forcing .save() immediately
      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      
      // Mobile iOS/Android Fallback: Use Native Web Share API
      try {
        const file = new File([pdfBlob], `Receipt_${sale.saleId}.pdf`, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Receipt - ${sale.saleId}`
          });
          setIsGenerating(false);
          return; // Shared successfully (or user cancelled, either way we are done)
        }
      } catch (shareErr) {
        console.warn("Share API error (often just user cancellation):", shareErr);
      }

      // Desktop or browsers without Share API fallback
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Receipt_${sale.saleId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      
    } catch (err) {
      console.error("PDF Generation Error:", err);
      alert("Could not generate PDF on this device. Please take a screenshot of the receipt instead.");
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

  if (!sale) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f7f2ec] p-6">
        <div className="text-center max-w-sm">
          <div className="h-20 w-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/10">
            <Package size={40} />
          </div>
          <h2 className="text-2xl font-black mb-2">Receipt Not Found</h2>
          <p className="text-stone-500 text-sm mb-6 leading-relaxed">
            We couldn't load this receipt. It may not have synced to the cloud yet, or the link may be invalid.
          </p>
          <p className="text-stone-400 text-xs mb-8 leading-relaxed">
            Please contact the boutique with your bill ID: <span className="font-bold text-stone-700">{billId}</span>
          </p>
          <button
            onClick={() => {
              if (onClear) onClear();
              window.history.replaceState({}, '', '/');
            }}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#8B4513] text-white rounded-2xl font-bold text-sm shadow-xl hover:brightness-110 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

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

        <div id="printable-bill" className="mb-8 bg-white p-4 text-black shadow-inner overflow-hidden mx-auto" style={{ width: '97mm', minHeight: '120mm', fontFamily: 'monospace' }}>
          <div className="text-center mb-4 border-b-2 border-dashed border-gray-300 pb-4">
            <img src="/logo-black.png" alt="Logo" className="w-28 h-32 mx-auto mb-4 object-contain" />
            <h3 className="uppercase tracking-tight !text-[24px] !font-extrabold">Classy Couture</h3>
            <p className="text-[10px] font-medium">Be Unique, Be Classy</p>
            <p style={{ margin: '2px 0', fontSize: '12px' }}>Ph : 8606154015</p>
            <div className="mt-2 text-gray-500">
              <p className='!text-[10px]'>Order ID: {sale.saleId}</p>
              <p className='!text-[10px]'>{new Date(sale.timestamp).toDateString() === new Date().toDateString() ? new Date(sale.timestamp).toLocaleString() : new Date(sale.timestamp).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mb-4 text-[11px]">
            <p className="font-bold">Customer: {sale.client?.name || 'Guest'}</p>
            {sale.client?.phone && <p>Tel: {sale.client.phone}</p>}
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
              {(sale.items || []).map((item, idx) => {
                const rowTotal = item.rowTotal !== undefined
                  ? item.rowTotal
                  : (item.qty * (item.price || item.rate)) * (1 - (item.discount || 0) / 100);
                
                return (
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
                    <td className="py-2 text-right pl-3 font-bold">₹{parseFloat(rowTotal).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="border-t-2 border-dashed border-gray-300 pt-3 space-y-1">
            <div className="flex justify-between text-sm font-black">
              <span>Grand Total</span>
              <span>₹{((sale.items || []).reduce((s, i) => s + ((i.price || i.rate) * i.qty), 0) - (sale.items?.reduce((s, i) => s + (parseFloat(i.discount) || 0), 0) || 0)).toFixed(2)}</span>
            </div>
          </div>

          <div className="text-center mt-6 text-[10px] text-gray-500 italic border-t border-dashed border-gray-200 pt-4">
            <p className="font-bold text-black mb-1">Thank you for shopping!</p>
            <p>Your elegance is our priority.</p>
            <p>Please visit again for more unique designs.</p>
            <p className="mt-2 text-[9px]">This is a computer generated receipt.</p>
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
