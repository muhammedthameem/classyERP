import React, { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

function UndoToast({ message, highlight, onUndo, onClose }) {
  const [countdown, setCountdown] = useState(8)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    if (countdown === 0 && onClose) {
      onClose()
    }
  }, [countdown, onClose])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[3000] animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-5 py-3.5 text-sm font-medium text-[var(--text)] shadow-2xl backdrop-blur-md">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/10 text-xs font-black text-[var(--accent)] tabular-nums">
          {countdown}
        </div>
        <span>{message} <strong className="text-[var(--accent)]">{highlight}</strong></span>
        <button
          onClick={onUndo}
          className="rounded-lg bg-[var(--accent)] px-4 py-1.5 font-bold text-white transition hover:opacity-90 active:scale-95 shadow-sm"
        >
          Undo
        </button>
        <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)] transition ml-2">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

export default UndoToast
