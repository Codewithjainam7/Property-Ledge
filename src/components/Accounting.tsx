import React from 'react';
import { DashboardLayout } from './DashboardLayout';
import { Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

export function Accounting() {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface p-10 rounded-3xl border border-outline-variant/50 shadow-sm max-w-md w-full"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary">
            <Wallet className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-on-surface mb-4">Accounting</h1>
          <p className="text-on-surface-variant mb-8 font-medium">
            This module is coming soon. You'll be able to manage expenses, generate reports, and track financials here.
          </p>
          <div className="inline-block bg-surface-container-high px-4 py-2 rounded-full text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            Coming Soon
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
