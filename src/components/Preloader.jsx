import React from 'react';

/**
 * Global Preloader Component
 * High-end glassmorphism design with premium animations.
 */
const Preloader = () => {
  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-[#f7f2ec]">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--accent)] opacity-[0.03] blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--jewel)] opacity-[0.03] blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative flex flex-col items-center">
        {/* Outer Glow Circle */}
        <div className="absolute inset-[-40px] rounded-full bg-[var(--accent)] opacity-[0.05] blur-[40px] animate-pulse" />

        {/* Logo Container */}
        <div className="relative w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-white p-2">
          <div className="w-full h-full bg-black rounded-full flex items-center justify-center overflow-hidden">
            <img
              src="/logo192.png"
              alt="Classy ERP"
              className="w-16 h-16 object-contain animate-in fade-in zoom-in duration-1000"
            />
          </div>

          {/* Rotating Progress Ring */}
          <div className="absolute inset-[-8px] rounded-full border-2 border-transparent border-t-[var(--accent)] animate-spin duration-[2000ms]" />
        </div>
      </div>
    </div>
  );
};

export default Preloader;
