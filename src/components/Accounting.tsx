import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { Wallet, Search, Building, CheckCircle2, AlertCircle, Clock, Plus, Filter, FileText, IndianRupee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { createPortal } from 'react-dom';

type Property = {
  id: string;
  address: string;
  suburb: string;
};

type Payment = {
  id: string;
  property_id: string;
  tenant_id: string;
  lease_id: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  paid_date: string | null;
  status: 'Pending' | 'Paid' | 'Overdue' | 'Partial';
  payment_type: 'Rent' | 'Bond' | 'Water' | 'Maintenance';
  tenants?: { first_name: string; last_name: string; email: string };
  properties?: { address: string };
};

export function Accounting() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Record Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session?.user.id) {
      loadLedgerData(session.user.id);
    }
  }, [session]);

  const loadLedgerData = async (userId: string) => {
    setLoading(true);
    try {
      // Load properties the user owns or manages
      const { data: propsData, error: propsError } = await supabase
        .from('properties')
        .select('id, address, suburb')
        .eq('owner_id', userId);

      if (propsError) throw propsError;
      setProperties(propsData || []);

      const propIds = propsData?.map(p => p.id) || [];
      if (propIds.length === 0) {
        setPayments([]);
        setLoading(false);
        return;
      }

      // Load payments for those properties
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          tenants (first_name, last_name, email),
          properties (address)
        `)
        .in('property_id', propIds)
        .order('due_date', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments((paymentsData as any[]) || []);
    } catch (err) {
      console.error("Error loading ledger:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setIsSubmitting(true);

    const amount = Number(paymentAmount);
    let newStatus = selectedPayment.status;
    let newAmountPaid = (selectedPayment.amount_paid || 0) + amount;

    if (newAmountPaid >= selectedPayment.amount_due) {
      newStatus = 'Paid';
      newAmountPaid = selectedPayment.amount_due; // cap it
    } else if (newAmountPaid > 0) {
      newStatus = 'Partial';
    }

    try {
      const { error } = await supabase
        .from('payments')
        .update({
          amount_paid: newAmountPaid,
          paid_date: paymentDate,
          status: newStatus
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      // Update local state
      setPayments(prev => prev.map(p => 
        p.id === selectedPayment.id 
          ? { ...p, amount_paid: newAmountPaid, paid_date: paymentDate, status: newStatus as any }
          : p
      ));

      setShowPaymentModal(false);
      setSelectedPayment(null);
    } catch (err) {
      console.error("Failed to record payment:", err);
      alert("Failed to record payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Derived Statistics
  const stats = useMemo(() => {
    let collected = 0;
    let arrears = 0;
    let upcoming = 0;

    payments.forEach(p => {
      if (selectedPropertyId !== 'all' && p.property_id !== selectedPropertyId) return;

      collected += Number(p.amount_paid || 0);
      
      const balance = Number(p.amount_due) - Number(p.amount_paid || 0);
      if (p.status === 'Overdue') {
        arrears += balance;
      } else if (p.status === 'Pending' || p.status === 'Partial') {
        // If it's not overdue yet, it's upcoming
        // Technically, should check if due_date > today
        const isPastDue = new Date(p.due_date) < new Date();
        if (isPastDue) {
           arrears += balance; // Actually, maybe status didn't update yet via cron, so infer it
        } else {
           upcoming += balance;
        }
      }
    });

    return { collected, arrears, upcoming };
  }, [payments, selectedPropertyId]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (selectedPropertyId !== 'all' && p.property_id !== selectedPropertyId) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      return true;
    });
  }, [payments, selectedPropertyId, statusFilter]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16 md:mt-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <Wallet className="w-6 h-6" />
              </div>
              Rental Schedule
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Manage and track all rental income</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px]">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Building className="w-4 h-4 text-slate-400" />
              </div>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
              >
                <option value="all">All Properties</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.address}</option>
                ))}
              </select>
            </div>
            <div className="relative min-w-[150px]">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Filter className="w-4 h-4 text-slate-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <CheckCircle2 className="w-24 h-24 text-emerald-600" />
            </div>
            <div className="relative">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Total Collected</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">${stats.collected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-3xl border border-red-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <AlertCircle className="w-24 h-24 text-red-600" />
            </div>
            <div className="relative">
              <p className="text-sm font-bold text-red-500 uppercase tracking-widest mb-2">Arrears / Overdue</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-red-600">${stats.arrears.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Clock className="w-24 h-24 text-blue-600" />
            </div>
            <div className="relative">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Upcoming Expected</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">${stats.upcoming.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
          {loading ? (
             <div className="py-20 flex justify-center">
               <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
             </div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-20 text-center px-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2 tracking-tight">No payments found</h3>
              <p className="text-slate-500 font-medium">We couldn't find any ledger entries matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider text-xs border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Property & Tenant</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Due Date</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Balance</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map(payment => {
                     const isPaid = payment.status === 'Paid';
                     const balance = Number(payment.amount_due) - Number(payment.amount_paid || 0);

                     return (
                       <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                         <td className="px-6 py-4">
                           <div className="font-bold text-slate-900">{payment.properties?.address}</div>
                           <div className="text-slate-500 text-xs mt-0.5">{payment.tenants ? `${payment.tenants.first_name} ${payment.tenants.last_name}` : 'Unknown Tenant'}</div>
                         </td>
                         <td className="px-6 py-4 font-semibold text-slate-700">{payment.payment_type}</td>
                         <td className="px-6 py-4 text-slate-500 font-medium">{new Date(payment.due_date).toLocaleDateString()}</td>
                         <td className="px-6 py-4">
                           <div className="font-bold text-slate-900">${Number(payment.amount_due).toLocaleString()}</div>
                         </td>
                         <td className="px-6 py-4">
                           {balance > 0 ? (
                             <span className="font-bold text-red-600">${balance.toLocaleString()}</span>
                           ) : (
                             <span className="font-bold text-emerald-600">$0.00</span>
                           )}
                         </td>
                         <td className="px-6 py-4">
                           <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                              payment.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              payment.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                              payment.status === 'Partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'
                           }`}>
                             {payment.status}
                           </span>
                         </td>
                         <td className="px-6 py-4 text-right">
                           {!isPaid && (
                             <button
                               onClick={() => {
                                 setSelectedPayment(payment);
                                 setPaymentAmount(balance.toString());
                                 setShowPaymentModal(true);
                               }}
                               className="text-xs font-bold text-primary hover:text-white bg-primary/10 hover:bg-primary px-3 py-1.5 rounded-lg transition-colors"
                             >
                               Record Payment
                             </button>
                           )}
                         </td>
                       </tr>
                     );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedPayment && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => !isSubmitting && setShowPaymentModal(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="px-6 py-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Record Payment</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{selectedPayment.properties?.address}</p>
                </div>
                <button onClick={() => !isSubmitting && setShowPaymentModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">✕</button>
              </div>
              
              <div className="p-6">
                <form onSubmit={handleRecordPayment} className="space-y-5">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Amount Due</p>
                      <p className="text-lg font-black text-slate-900">${(Number(selectedPayment.amount_due) - Number(selectedPayment.amount_paid || 0)).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Type</p>
                      <p className="text-sm font-bold text-slate-700">{selectedPayment.payment_type}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Payment Amount</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</div>
                      <input 
                        type="number" step="0.01" required min="0"
                        value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Date Received</label>
                    <input 
                      type="date" required
                      value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium text-slate-900"
                    />
                  </div>

                  <div className="pt-4 mt-6 border-t border-slate-100 flex gap-3">
                    <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting || !paymentAmount} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:bg-primary/90 disabled:opacity-50 transition-all">
                      {isSubmitting ? 'Saving...' : 'Save Payment'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
