import React from 'react';
import { motion } from 'framer-motion';

// Skeleton for dashboard metric cards
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-surface-container rounded-[20px] ${className}`}>
      <div className="h-full p-6 flex flex-col">
        <div className="w-10 h-10 rounded-xl bg-outline-variant/30 mb-6" />
        <div className="mt-auto space-y-2">
          <div className="h-2 w-16 bg-outline-variant/30 rounded" />
          <div className="h-8 w-20 bg-outline-variant/30 rounded" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for table rows (e.g. Invoices, Dashboard recent activity)
export function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-outline-variant/30">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-outline-variant/20" />
          <div className="space-y-2">
            <div className="h-3 w-32 bg-outline-variant/20 rounded" />
            <div className="h-2 w-24 bg-outline-variant/20 rounded" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4"><div className="h-3 w-16 bg-outline-variant/20 rounded" /></td>
      <td className="px-6 py-4"><div className="h-5 w-14 bg-outline-variant/20 rounded-md" /></td>
      <td className="px-6 py-4"><div className="h-3 w-20 bg-outline-variant/20 rounded" /></td>
      <td className="px-6 py-4"><div className="h-2 w-16 bg-outline-variant/20 rounded" /></td>
      <td className="px-6 py-4"><div className="h-3 w-20 bg-outline-variant/20 rounded" /></td>
      <td className="px-6 py-4"><div className="w-6 h-6 bg-outline-variant/20 rounded-md mx-auto" /></td>
    </tr>
  );
}

// Skeleton for properties list cards
export function SkeletonPropertyCard() {
  return (
    <div className="bg-surface rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm animate-pulse">
      <div className="h-48 bg-surface-container-high w-full" />
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-3/4 bg-outline-variant/20 rounded" />
            <div className="h-3 w-1/2 bg-outline-variant/20 rounded" />
          </div>
          <div className="h-6 w-16 bg-outline-variant/20 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="space-y-2">
            <div className="h-2 w-12 bg-outline-variant/20 rounded" />
            <div className="h-4 w-20 bg-outline-variant/20 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-2 w-12 bg-outline-variant/20 rounded" />
            <div className="h-4 w-20 bg-outline-variant/20 rounded" />
          </div>
        </div>
      </div>
      <div className="px-5 py-4 border-t border-outline-variant/30 bg-surface-container-low/50 flex justify-between items-center">
        <div className="h-3 w-24 bg-outline-variant/20 rounded" />
        <div className="h-4 w-4 bg-outline-variant/20 rounded-full" />
      </div>
    </div>
  );
}

// Skeleton for Property Details page
export function SkeletonDetails() {
  return (
    <div className="animate-pulse px-6 md:px-10 max-w-[1600px] mx-auto pb-20 pt-8">
      {/* Header Skeleton */}
      <div className="mb-8 space-y-4">
        <div className="h-4 w-24 bg-outline-variant/20 rounded" />
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-outline-variant/20 rounded" />
            <div className="h-4 w-40 bg-outline-variant/20 rounded" />
          </div>
          <div className="h-10 w-24 bg-outline-variant/20 rounded-full" />
        </div>
      </div>
      
      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-[400px] bg-surface-container rounded-3xl" />
          <div className="h-[200px] bg-surface-container rounded-3xl" />
        </div>
        <div className="space-y-6">
          <div className="h-[300px] bg-surface-container rounded-3xl" />
          <div className="h-[250px] bg-surface-container rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
