import React from 'react';

export default function OrderSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 border border-[var(--border)] rounded-xl bg-[var(--surface)] animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-12 w-12 bg-[var(--border)] rounded-xl" />
        <div className="flex flex-col gap-1">
          <div className="h-4 w-32 bg-[var(--border)] rounded" />
          <div className="h-3 w-24 bg-[var(--border)] rounded" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="h-4 w-16 bg-[var(--border)] rounded" />
        <div className="h-3 w-20 bg-[var(--border)] rounded" />
      </div>
    </div>
  );
}
