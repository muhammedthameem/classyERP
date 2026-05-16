import React, { useState, useEffect } from 'react';

/**
 * IOSInstallPrompt Component
 * 
 * Since iOS Safari does not support the 'beforeinstallprompt' API, 
 * this component provides a guided UI to help users add the app to their home screen.
 */
const IOSInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect if the device is an iPhone/iPad/iPod
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // Detect if the app is already running in standalone mode (installed)
    const isStandaloneMode = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

    setIsIOS(isIOSDevice);
    setIsStandalone(isStandaloneMode);

    // Optional: Auto-show logic could go here
    // For now, we'll let the user trigger it via a button or custom logic
  }, []);

  const handleOpen = () => {
    if (isStandalone) {
      alert("App is already installed and running from your home screen!");
      return;
    }
    setShowPrompt(true);
  };

  const handleClose = () => {
    setShowPrompt(false);
  };

  if (isStandalone) return null;

  return (
    <>
      {/* Example Button to trigger the prompt - You can place this anywhere in your UI */}
      <button 
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 bg-[#2a211d] text-white rounded-xl font-semibold shadow-lg hover:bg-[#3d312b] transition-all active:scale-95"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Install App
      </button>

      {/* The Actual Guidance UI */}
      {showPrompt && (
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end items-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div 
            className="relative w-full max-w-md bg-[#f7f2ec] rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-500 ease-out"
            style={{ 
              border: '1px solid rgba(42, 33, 29, 0.1)',
              background: 'linear-gradient(135deg, #f7f2ec 0%, #fff 100%)'
            }}
          >
            {/* Close Button */}
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2a211d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-[#2a211d] rounded-2xl flex items-center justify-center shadow-inner mb-2">
                <img src="/logo192.png" alt="App Logo" className="w-12 h-12 object-contain" />
              </div>

              <h3 className="text-xl font-bold text-[#2a211d]">Install Classy ERP</h3>
              <p className="text-[#5d5450] text-sm leading-relaxed">
                Add this app to your home screen for a full-screen experience and quick access.
              </p>

              <div className="w-full space-y-4 pt-2">
                <div className="flex items-center gap-4 text-left p-3 bg-white/50 rounded-2xl border border-black/5">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#2a211d]">
                    1. Tap the <span className="text-[#007AFF] font-bold">Share</span> button below
                  </p>
                </div>

                <div className="flex items-center gap-4 text-left p-3 bg-white/50 rounded-2xl border border-black/5">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2a211d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="12" y1="8" x2="12" y2="16"></line>
                      <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#2a211d]">
                    2. Select <span className="font-bold">"Add to Home Screen"</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Pointer Arrow (pointing to where the share button usually is) */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rotate-45 bg-[#f7f2ec] border-r border-b border-black/10 shadow-lg"></div>
          </div>
        </div>
      )}
    </>
  );
};

export default IOSInstallPrompt;
