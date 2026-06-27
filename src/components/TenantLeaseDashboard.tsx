import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  CheckCircle2, 
  MapPin, 
  Wallet, 
  FileText, 
  ArrowRight, 
  Calendar, 
  Mail, 
  User, 
  CreditCard, 
  AlertCircle, 
  Clock, 
  BedDouble, 
  Bath, 
  Car,
  Sparkles,
  RefreshCw,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function TenantLeaseDashboard() {
  const [property, setProperty] = useState<any>(null);
  const [lease, setLease] = useState<any>(null);
  const [landlord, setLandlord] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.user?.id) {
      fetchLeasedProperty();
    }
  }, [session?.user?.id]);

  const fetchLeasedProperty = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_tenant_lease_data');
      if (error) throw error;
      
      if (data) {
        setProperty(data.property);
        setLease(data.lease);
        setLandlord(data.landlord);
      }

      if (session?.user?.email) {
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('invoices')
          .select('*')
          .eq('tenant_email', session.user.email)
          .order('due_date', { ascending: true });
        
        if (!invoicesError && invoicesData) {
          setInvoices(invoicesData);
        }
      }
    } catch (error) {
      console.error('Error fetching leased property details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async (invoiceId: string) => {
    setPayingInvoiceId(invoiceId);
    try {
      // Update invoice status in the database to Paid
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'Paid' })
        .eq('id', invoiceId);
      
      if (error) throw error;
      
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentSuccess(false);
        setPayingInvoiceId(null);
        // Refresh data
        fetchLeasedProperty();
      }, 2000);
    } catch (err) {
      console.error("Payment simulation failed:", err);
      setPayingInvoiceId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center gap-4 text-slate-900">
        <RefreshCw className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm font-bold tracking-widest uppercase text-slate-500">Loading resident portal...</p>
      </div>
    );
  }

  // Find the next upcoming/unpaid invoice
  const nextInvoice = invoices.find(inv => inv.status !== 'Paid' && inv.status !== 'Cancelled');
  
  // Next Payment Info Setup
  const rentDueAmount = nextInvoice ? nextInvoice.total_amount : (lease?.rent_amount || property?.rent_amount || 0);
  const rentDueDate = nextInvoice ? formatDate(nextInvoice.due_date) : 'All Caught Up';
  const rentDueStatus = nextInvoice ? nextInvoice.status : 'Paid';

  // Extract first name from session metadata if available, otherwise just "Home"
  const firstName = session?.user?.user_metadata?.first_name 
                    || session?.user?.user_metadata?.full_name?.split(' ')[0] 
                    || '';

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-slate-900">
      {/* Custom Tenant Navbar */}
      <nav className="sticky top-0 z-50 bg-[#F5F5F7]/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 sm:px-10 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('Overview')}>
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900 font-display">
              Property<span className="text-primary font-bold">Ledge</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                supabase.auth.signOut();
                navigate('/login');
              }}
              className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors border-l border-slate-300 pl-4 ml-2"
            >
              Log Out
            </button>
          </div>
        </div>
      </nav>

      <div className="p-6 sm:p-10 max-w-[1600px] mx-auto space-y-10 relative overflow-hidden">
        {/* Ambient background glows removed for clean light aesthetic */}

        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-8 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/5 border border-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-3 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" /> Resident Portal
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none font-display text-slate-900">
              Welcome Home{firstName ? `, ${firstName}` : ''}!
            </h1>
            <p className="text-slate-500 mt-3 text-sm font-semibold max-w-xl">
              Manage your residency, track invoices, and access owner support.
            </p>
          </div>

          {property && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider w-fit shadow-sm">
              <CheckCircle2 className="w-4 h-4" /> Active Lease agreement
            </div>
          )}
        </div>

        {/* TAB NAVIGATION (Mobile Friendly, scrolling) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 -mt-2 mb-2 hide-scrollbar">
            <button 
              onClick={() => setActiveTab('Overview')} 
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${activeTab === 'Overview' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('Invoices')} 
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'Invoices' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              Invoices
              {invoices.length > 0 && (
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] ${activeTab === 'Invoices' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {invoices.length}
                </span>
              )}
            </button>
        </div>

        {activeTab === 'Overview' && (
          property ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
              <>
                {/* 1. Hero Card: Next Rent Due (col-span-2) */}
                <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 bg-white border border-slate-200/60 rounded-[32px] p-6 sm:p-8 relative overflow-hidden flex flex-col justify-between group shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300"
            >
              {/* Decorative gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-transparent to-transparent pointer-events-none" />

              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-start">
                  <h3 className="text-slate-500 font-bold uppercase tracking-wider text-xs flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" /> Rent Details
                  </h3>
                  
                  {/* Status Indicator */}
                  <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                    rentDueStatus === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    rentDueStatus === 'Overdue' ? 'bg-rose-50 text-rose-600 border border-rose-100 animate-pulse' :
                    'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      rentDueStatus === 'Paid' ? 'bg-emerald-500' :
                      rentDueStatus === 'Overdue' ? 'bg-rose-500' : 'bg-amber-500'
                    }`} />
                    {rentDueStatus}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 text-sm font-semibold">Next Amount Due</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl sm:text-6xl font-black tracking-tight font-display text-slate-900">${Number(rentDueAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-xs">/ {lease?.payment_frequency || property?.payment_frequency || 'Weekly'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Payment Due Date</span>
                      <span className="text-sm font-bold text-slate-900">{rentDueDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Lease Terms</span>
                      <span className="text-sm font-bold text-slate-900">
                        {lease?.start_date ? `${formatDate(lease.start_date)} - ${formatDate(lease.end_date)}` : 'Active Term'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-8 relative z-10 flex flex-wrap gap-4">
                {nextInvoice && (
                  <button
                    onClick={() => handleSimulatePayment(nextInvoice.id)}
                    disabled={payingInvoiceId !== null}
                    className="px-8 py-4 bg-white text-slate-950 hover:bg-slate-200 disabled:bg-white/20 disabled:text-white/40 transition-all font-black text-xs uppercase tracking-widest rounded-full flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    {payingInvoiceId === nextInvoice.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    Pay Next Rent Invoice
                  </button>
                )}
                
                {lease?.tenant_signature && (
                  <div className="px-6 py-4 bg-white/5 border border-white/5 text-slate-400 font-bold text-xs uppercase tracking-widest rounded-full flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" /> Digital Lease Signed
                  </div>
                )}
              </div>
            </motion.div>

            {/* 2. Property Details & Landlord Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-slate-200/60 rounded-[32px] p-6 sm:p-8 flex flex-col justify-between hover:border-slate-300 transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6"
            >
              <div className="space-y-6">
                <h3 className="text-slate-500 font-bold uppercase tracking-wider text-xs flex items-center gap-2">
                  <Home className="w-4 h-4 text-primary" /> Property Details
                </h3>

                {/* Photo container */}
                <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden relative border border-slate-100">
                  {property.image || property.images?.[0] ? (
                    <img 
                      src={property.images?.[0] || property.image} 
                      alt={property.address} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                      <Home className="w-10 h-10 text-slate-400" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-lg font-black tracking-tight text-slate-900 leading-tight">{property.address}</h4>
                  <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    {property.suburb}, {property.state} {property.postcode}
                  </div>
                </div>

                {/* Bedroom/Bathroom tags */}
                <div className="flex gap-4 pt-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <BedDouble className="w-4 h-4 text-slate-400" />
                    <span>{property.bedrooms || 0} Bed</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <Bath className="w-4 h-4 text-slate-400" />
                    <span>{Number(property.bathrooms || 0)} Bath</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <Car className="w-4 h-4 text-slate-400" />
                    <span>{property.car_spaces || 0} Car</span>
                  </div>
                </div>
              </div>

              {/* Landlord details block */}
              {landlord && (
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Managed By Owner</span>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-primary">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <span className="text-sm font-bold text-slate-900 block truncate">{landlord.first_name} {landlord.last_name || ''}</span>
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-0.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{landlord.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
              </>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/60 rounded-[32px] p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-transparent to-transparent pointer-events-none" />
              <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-6 relative z-10">
                <FileText className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight relative z-10">No Active Lease Connected</h2>
              <p className="text-slate-500 max-w-md mx-auto mb-8 text-sm font-semibold relative z-10 leading-relaxed">
                We couldn't locate any active lease linked to your email ({session?.user?.email}). If you've been invited by a landlord, make sure you used the email invitation link.
              </p>
            </div>
          )
        )}

        {/* 3. Invoice Hub: full-width invoices table (col-span-3) */}
        {activeTab === 'Invoices' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-3 bg-white border border-slate-200/60 rounded-[32px] p-6 sm:p-8 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6"
              >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" /> Invoice Hub
                  </h3>
                  <p className="text-slate-500 text-xs font-semibold mt-1">
                    Review and pay billing invoices generated by your property owner.
                  </p>
                </div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full">
                  Total Invoices: {invoices.length}
                </div>
              </div>

              {invoices.length > 0 ? (
                <div className="overflow-x-auto w-full">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                        <th className="pb-3 pl-4">Invoice No.</th>
                        <th className="pb-3">Lease ID</th>
                        <th className="pb-3">Issue Date</th>
                        <th className="pb-3">Due Date</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {invoices.map((inv) => {
                        // Generate deterministic Lease ID from invoice's lease_id or property_id
                        let hash = 0;
                        const idToHash = inv.lease_id || inv.property_id || inv.id;
                        for (let i = 0; i < idToHash.length; i++) {
                          hash = ((hash << 5) - hash) + idToHash.charCodeAt(i);
                          hash |= 0;
                        }
                        const leaseIdDisplay = `L-${Math.abs(hash).toString().substring(0, 8).padEnd(6, '0')}`;
                        
                        return (
                        <tr key={inv.id} className="text-sm font-semibold text-slate-600 hover:bg-slate-50/50 transition-colors group">
                          <td className="py-4 pl-4 font-bold text-slate-900">
                            {inv.invoice_number || `INV-${inv.id.substring(0,6).toUpperCase()}`}
                          </td>
                          <td className="py-4 text-slate-500 font-mono text-xs">{leaseIdDisplay}</td>
                          <td className="py-4">{formatDate(inv.issue_date)}</td>
                          <td className="py-4">{formatDate(inv.due_date)}</td>
                          <td className="py-4 font-bold text-slate-900">${Number(inv.total_amount).toFixed(2)}</td>
                          <td className="py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              inv.status === 'Overdue' ? 'bg-rose-50 text-rose-600 border border-rose-100 animate-pulse' :
                              'bg-amber-50 text-amber-600 border border-amber-100'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                inv.status === 'Paid' ? 'bg-emerald-500' :
                                inv.status === 'Overdue' ? 'bg-rose-500' : 'bg-amber-500'
                              }`} />
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-right">
                            {inv.status !== 'Paid' && inv.status !== 'Cancelled' ? (
                              <button
                                onClick={() => handleSimulatePayment(inv.id)}
                                disabled={payingInvoiceId !== null}
                                className="px-4 py-2 bg-primary text-white hover:bg-primary-container disabled:bg-primary/50 disabled:text-white/70 transition-all font-black text-[10px] uppercase tracking-wider rounded-full shadow-[0_4px_14px_rgba(33,150,243,0.3)] cursor-pointer inline-flex items-center gap-1"
                              >
                                {payingInvoiceId === inv.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CreditCard className="w-3 h-3" />
                                )}
                                Pay Now
                              </button>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400 italic">Paid</span>
                            )}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-primary mx-auto">
                    <Check className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-900">All caught up!</h4>
                    <p className="text-slate-500 text-xs font-semibold max-w-xs mx-auto">
                      No invoices found for your email. You are fully up to date on your rental payments.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
        )}
      </div>

      {/* Simulated Payment Success Modal */}
      <AnimatePresence>
        {paymentSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border border-slate-200/60 p-8 rounded-[32px] max-w-sm w-full text-center space-y-6 shadow-[0_20px_60px_rgb(0,0,0,0.1)]"
            >
              <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-sm animate-bounce">
                <Check className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tight font-display text-slate-900">Payment Successful!</h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                  Your rental payment invoice has been processed successfully. The invoice ledger status has been updated to Paid.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
