import React, { useState, useEffect } from 'react';
import { BellRing, X, Clock, Navigation } from 'lucide-react';

function DeliveryAlertModal({ orders }) {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);

  useEffect(() => {
    // 1. Get Today's Date in Indian Format (YYYY-MM-DD)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // 2. Find Orders due Today that are NOT finished
    const dueToday = (orders || []).filter(order => {
      const isFinished = order.status === 'Completed' || order.status === 'Sold' || order.status === 'Closed';
      const isDueToday = order.deliveryDate === today;
      const isNotDismissed = !dismissedIds.includes(order.id);
      
      return isDueToday && !isFinished && isNotDismissed;
    });

    if (dueToday.length > 0 && dueToday.length !== activeAlerts.length) {
      setActiveAlerts(dueToday);
      playAlertSound();
    }
  }, [orders, dismissedIds]);

  const playAlertSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play();
    } catch (e) {
      console.warn("Audio play failed:", e);
    }
  };

  const dismissAlert = (id) => {
    setDismissedIds(prev => [...prev, id]);
    setActiveAlerts(prev => prev.filter(a => a.id !== id));
  };

  if (activeAlerts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-4 max-w-sm w-full animate-in slide-in-from-right-10 duration-500">
      {activeAlerts.map((alert) => (
        <div 
          key={alert.id}
          className="relative overflow-hidden rounded-[24px] bg-[#2a211d] border-2 border-[#e6c9b8]/30 p-5 shadow-2xl shadow-black/40 text-white group"
        >
          {/* Animated Background Pulse */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent opacity-50"></div>
          
          <div className="relative flex items-start gap-4">
            <div className="bg-red-500 rounded-2xl p-3 shadow-lg shadow-red-500/20 animate-pulse">
              <BellRing size={24} className="text-white" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 flex items-center gap-1">
                  <Clock size={10} /> Urgent Delivery
                </span>
                <button 
                  onClick={() => dismissAlert(alert.id)}
                  className="text-white/40 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              </div>
              
              <p className="text-sm font-bold leading-tight mb-2">
                Order <span className="text-[#e6c9b8]">{alert.clientName}</span> need to delivery in {alert.deliveryDate} hurry !!!
              </p>
              
              <div className="flex items-center justify-between mt-4">
                <div className="text-[10px] font-medium text-white/60">
                  ID: #{alert.id} • {alert.product}
                </div>
                <button 
                  onClick={() => dismissAlert(alert.id)}
                  className="bg-white text-[#2a211d] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-[#e6c9b8] transition active:scale-95"
                >
                  I'm on it!
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default DeliveryAlertModal;
