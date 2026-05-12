import React, { useState, useEffect, useRef } from 'react'

function ReportStatCard({ icon, label, value, color }) {
  const colors = {
    green: 'bg-green-50/50 border-green-100',
    blue: 'bg-blue-50/50 border-blue-100',
    orange: 'bg-orange-50/50 border-orange-100',
    purple: 'bg-purple-50/50 border-purple-100'
  };

  return (
    <div className={`rounded-3xl border p-6 shadow-sm transition-all hover:scale-[1.02] ${colors[color]}`}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
        {icon}
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[var(--text)]">{value}</p>
    </div>
  );
}

export default ReportStatCard;
