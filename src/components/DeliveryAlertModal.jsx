import React, { useState, useEffect } from 'react';
import { BellRing, X, Clock } from 'lucide-react';

function DeliveryAlertModal({ orders }) {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);

  useEffect(() => {
    const todayObj = new Date();
    todayObj.setHours(0,0,0,0);

    const dueSoon = (orders || []).filter(order => {
      if (!order.deliveryDate) return false;
      
      const isFinished = order.status === 'Completed' || order.status === 'Sold' || order.status === 'Closed';
      if (isFinished || dismissedIds.includes(order.id)) return false;

      const dDate = new Date(order.deliveryDate);
      dDate.setHours(0,0,0,0);
      
      const diffTime = dDate.getTime() - todayObj.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays >= 0 && diffDays <= 2;
    });

    if (dueSoon.length > 0 && dueSoon.length !== activeAlerts.length) {
      setActiveAlerts(dueSoon);
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
      {activeAlerts.map((alert) => {
        const dDate = new Date(alert.deliveryDate);
        dDate.setHours(0,0,0,0);
        const today = new Date();
        today.setHours(0,0,0,0);
        const diffDays = Math.ceil((dDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        const statusText = diffDays === 0 ? "TODAY" : (diffDays === 1 ? "TOMORROW" : "IN 2 DAYS");
        const statusColor = diffDays === 0 ? "text-red-400" : (diffDays === 1 ? "text-orange-400" : "text-yellow-400");
        const accentColor = diffDays === 0 ? "bg-red-500" : (diffDays === 1 ? "bg-orange-500" : "bg-yellow-600");

        return (
          <div 
            key={alert.id}
            className="relative overflow-hidden rounded-[24px] bg-[#2a211d] border-2 border-[#e6c9b8]/30 p-5 shadow-2xl shadow-black/40 text-white group"
          >
            <div className={`absolute inset-0 opacity-10 ${diffDays === 0 ? 'bg-red-500' : 'bg-orange-500'}`}></div>
            <div className="relative flex items-start gap-4">
              <div className={`${accentColor} rounded-2xl p-3 shadow-lg animate-pulse`}>
                <BellRing size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${statusColor} flex items-center gap-1`}>
                    <Clock size={10} /> DUE {statusText}
                  </span>
                  <button onClick={() => dismissAlert(alert.id)} className="text-white/40 hover:text-white transition">
                    <X size={18} />
                  </button>
                </div>
                <p className="text-sm font-bold leading-tight mb-2">
                  Order for <span className="text-[#e6c9b8]">{alert.clientName}</span> is due {diffDays === 0 ? 'today!' : (diffDays === 1 ? 'tomorrow!' : 'in 2 days.')}
                </p>
                <div className="flex items-center justify-between mt-4">
                  <div className="text-[10px] font-medium text-white/60">
                     #{alert.id} • {alert.product}
                  </div>
                  <button onClick={() => dismissAlert(alert.id)} className="bg-white text-[#2a211d] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-[#e6c9b8] transition active:scale-95">
                    I'm on it!
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DeliveryAlertModal;
