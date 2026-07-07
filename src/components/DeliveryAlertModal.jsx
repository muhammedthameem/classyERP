import React, { useState, useEffect, useRef } from 'react';
import { BellRing, X, Clock, BellOff, Volume2 } from 'lucide-react';

import supabase from '../supabase';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

function DeliveryAlertModal({ orders }) {
  const [currentAlert, setCurrentAlert] = useState(null);
  const [dismissedIds, setDismissedIds] = useState([]);
  const [snoozed, setSnoozed] = useState({}); // { id: wakeupTimestamp }
  const audioRef = useRef(null);

  // 0. INITIALIZE PERSISTENT DISMISSALS AND NOTIFICATION PERMISSION
  useEffect(() => {
    const todayStr = new Date().toDateString();
    const stored = localStorage.getItem('erp_dismissed_alerts');
    if (stored) {
      const { date, ids } = JSON.parse(stored);
      if (date === todayStr) {
        setDismissedIds(ids);
      } else {
        localStorage.removeItem('erp_dismissed_alerts');
      }
    }

    // Request notification permission and subscribe to Web Push
    if ('Notification' in window && 'serviceWorker' in navigator) {
      Notification.requestPermission().then(async (permission) => {
        if (permission === 'granted') {
          try {
            const registration = await navigator.serviceWorker.ready;
            const existingSubscription = await registration.pushManager.getSubscription();
            
            if (!existingSubscription) {
              const VAPID_PUBLIC_KEY = "BH-uiaZXOxtpYiydH9LHpPpc_8H_eGWePFk7nGOmGp-D4n8FizuiuhyPMNDwaJuGtv0nrrawXkzzEj4QaNUl1t8";
              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
              });
              
              // Save to Supabase
              await supabase.from('erp_push_subscriptions').insert([
                { subscription: subscription.toJSON() }
              ]);
              console.log("Push Notification Subscription saved to Supabase.");
            }
          } catch (e) {
            console.error("Failed to subscribe for push notifications", e);
          }
        }
      });
    }
  }, []);

  // 1. SOUND LOGIC
  useEffect(() => {
    // Initialize audio once
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 2. MAIN LOGIC: Filter, Sort, and Pick the FIRST alert
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const todayObj = new Date();
      todayObj.setHours(0, 0, 0, 0);

      // Filter for due orders (Today, Tomorrow, +2 Days)
      const allDue = (orders || []).filter(order => {
        if (!order.deliveryDate || order.status === 'Completed' || order.status === 'Sold' || order.status === 'Closed') return false;

        // Skip permanently dismissed for today
        if (dismissedIds.includes(order.id)) return false;

        // Skip if snoozed and wakeup time hasn't arrived
        if (snoozed[order.id] && now < snoozed[order.id]) return false;

        const dDate = new Date(order.deliveryDate);
        dDate.setHours(0, 0, 0, 0);
        const diffTime = dDate.getTime() - todayObj.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays >= 0 && diffDays <= 2;
      });

      // Sort by ID (First Created = First Shown)
      const sorted = allDue.sort((a, b) => a.id - b.id);
      const nextOne = sorted.length > 0 ? sorted[0] : null;

      if (nextOne?.id !== currentAlert?.id) {
        setCurrentAlert(nextOne);
        if (nextOne) {
          audioRef.current?.play().catch(e => console.warn("Audio play blocked:", e));
          
          // Trigger System Notification
          if ('Notification' in window && Notification.permission === 'granted') {
            const dDate = new Date(nextOne.deliveryDate);
            dDate.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((dDate.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));
            const statusText = diffDays === 0 ? "TODAY" : (diffDays === 1 ? "TOMORROW" : "IN 2 DAYS");
            
            try {
              const notification = new Notification(`Delivery Due ${statusText}`, {
                body: `Order #${nextOne.id} for ${nextOne.clientName} - ${nextOne.product}`,
                icon: '/icon-192x192.png',
                tag: `delivery-alert-${nextOne.id}`,
                requireInteraction: true
              });
              
              notification.onclick = () => {
                window.focus();
                window.dispatchEvent(new CustomEvent('erp-global-nav', { detail: { type: 'order', id: nextOne.id } }));
                notification.close();
              };
            } catch (error) {
              console.error("System notification failed", error);
            }
          }
        } else {
          audioRef.current?.pause();
        }
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(timer);
  }, [orders, dismissedIds, snoozed, currentAlert]);

  const handleStop = (id) => {
    const todayStr = new Date().toDateString();
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem('erp_dismissed_alerts', JSON.stringify({ date: todayStr, ids: newDismissed }));
    setCurrentAlert(null);
    audioRef.current?.pause();
  };

  const handleSnooze = (id) => {
    const wakeupTime = Date.now() + 10 * 60 * 1000; // 10 Minutes
    setSnoozed(prev => ({ ...prev, [id]: wakeupTime }));
    setCurrentAlert(null);
    audioRef.current?.pause();
  };

  if (!currentAlert) return null;

  const dDate = new Date(currentAlert.deliveryDate);
  dDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((dDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const statusText = diffDays === 0 ? "TODAY" : (diffDays === 1 ? "TOMORROW" : "IN 2 DAYS");
  const statusColor = diffDays === 0 ? "text-red-400" : (diffDays === 1 ? "text-orange-400" : "text-yellow-400");
  const accentColor = diffDays === 0 ? "bg-red-500" : (diffDays === 1 ? "bg-orange-500" : "bg-yellow-600");

  return (
    <div className="fixed bottom-6 right-6 z-[3000] max-w-sm w-full animate-in slide-in-from-bottom-10 duration-500">
      <div className="relative overflow-hidden rounded-[32px] bg-[#2a211d] border-4 border-[#e6c9b8]/50 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-white ring-4 ring-black/20">
        <div className={`absolute inset-0 opacity-20 ${diffDays === 0 ? 'bg-red-600' : 'bg-orange-600'}`}></div>

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className={`${accentColor} rounded-2xl p-4 shadow-xl animate-bounce`}>
              <BellRing size={28} className="text-white" />
            </div>
            <div className="text-right">
              <span className={`text-[12px] font-black uppercase tracking-[0.2em] ${statusColor} flex items-center justify-end gap-1 mb-1`}>
                <Clock size={12} /> DUE {statusText}
              </span>
              <div className="flex items-center gap-1.5 justify-end text-[var(--muted)]">
                <Volume2 size={12} className="animate-pulse" />
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Alarm Active</span>
              </div>
            </div>
          </div>

          <div 
            className="space-y-2 mb-6 cursor-pointer group hover:bg-white/5 p-2 -mx-2 rounded-xl transition-colors"
            title="Click to view this order"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('erp-global-nav', { detail: { type: 'order', id: currentAlert.id } }));
              handleSnooze(currentAlert.id);
            }}
          >
            <h3 className="text-lg font-black leading-tight group-hover:text-[#e6c9b8] transition-colors">
              Delivery for <span className="text-[#e6c9b8] underline decoration-wavy decoration-[#e6c9b8]/30 underline-offset-4">{currentAlert.clientName}</span>
            </h3>
            <p className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
              Order #{currentAlert.id} • {currentAlert.product}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSnooze(currentAlert.id)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-xs font-bold transition hover:bg-white/20 active:scale-95"
            >
              <BellOff size={14} /> Snooze 10m
            </button>
            <button
              onClick={() => handleStop(currentAlert.id)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#e6c9b8] px-4 py-3 text-xs font-black text-[#2a211d] shadow-lg transition hover:brightness-110 active:scale-95"
            >
              <CheckCircle size={14} /> Stop Alarm
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

const CheckCircle = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

export default DeliveryAlertModal;
