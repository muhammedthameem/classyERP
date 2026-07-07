import React, { useState, useEffect } from 'react';
import { BellRing, X } from 'lucide-react';
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

export default function PushPermissionModal() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if notifications are supported and not yet decided
    if ('Notification' in window && 'serviceWorker' in navigator && Notification.permission === 'default') {
      // Delay showing the prompt by 3 seconds so it's not too aggressive on load
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        
        if (!existingSubscription) {
          const VAPID_PUBLIC_KEY = "BH-uiaZXOxtpYiydH9LHpPpc_8H_eGWePFk7nGOmGp-D4n8FizuiuhyPMNDwaJuGtv0nrrawXkzzEj4QaNUl1t8";
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
          
          await supabase.from('erp_push_subscriptions').insert([
            { subscription: subscription.toJSON() }
          ]);
          console.log("Push Notification Subscription saved to Supabase.");
        }
      }
    } catch (e) {
      console.error("Failed to subscribe for push notifications", e);
    } finally {
      setLoading(false);
      setShow(false); // Hide regardless of outcome so we don't block UI
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[4000] max-w-sm w-full animate-in slide-in-from-bottom-10 duration-500">
      <div className="relative overflow-hidden rounded-[24px] bg-[#2a211d] border-2 border-[#e6c9b8]/30 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] text-white">
        
        <button 
          onClick={() => setShow(false)}
          className="absolute top-3 right-3 p-1.5 rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-[#e6c9b8] p-3 text-[#2a211d] shadow-lg animate-pulse">
            <BellRing size={24} />
          </div>
          <div className="flex-1 pr-4">
            <h3 className="text-base font-black tracking-tight text-white mb-1">
              Enable Background Alerts
            </h3>
            <p className="text-xs font-medium text-white/70 mb-4 leading-relaxed">
              Get delivery reminders even when the app is completely closed.
            </p>
            <button
              onClick={handleEnable}
              disabled={loading}
              className="w-full rounded-xl bg-[#e6c9b8] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#2a211d] shadow-md transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Enabling..." : "Enable Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
