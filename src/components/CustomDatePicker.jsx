import React, { useState, useEffect, useRef } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateDDMMYY } from '../utils/constants'

function CustomDatePicker({ value, onChange, placeholder, minDate, maxDate, position = 'bottom' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date())

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  return (
    <div className="relative">
      <button
        type="button"
        className={`flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-left outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 ${!value ? 'text-[var(--muted)]' : 'text-[var(--text)]'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {value ? formatDateDDMMYY(value) : placeholder}
        <CalendarDays size={16} className="text-[var(--muted)]" />
      </button>

      {isOpen && (
        <div className={`absolute left-0 z-50 w-72 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-2xl backdrop-blur ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              className="p-1 hover:bg-[var(--soft)] rounded-lg transition"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
            <button
              type="button"
              className="p-1 hover:bg-[var(--soft)] rounded-lg transition"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-medium text-[var(--muted)]">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12)
              const dateStr = d.toISOString().split('T')[0]
              const isSelected = value === dateStr
              const isToday = new Date().toISOString().split('T')[0] === dateStr
              const isDisabled = (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  className={`h-8 w-8 rounded-lg text-sm flex items-center justify-center transition-colors ${isSelected ? 'bg-[var(--accent)] text-white font-semibold shadow-md' : isToday ? 'bg-[var(--soft)] text-[var(--accent)] font-semibold border border-[var(--accent)]' : isDisabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[var(--soft)]'}`}
                  onClick={() => {
                    onChange(dateStr)
                    setIsOpen(false)
                  }}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomDatePicker;
