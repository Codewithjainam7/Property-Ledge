import React, { useState, useEffect } from 'react';
import { Search, Building, Users, Clock, AlertTriangle, CheckCircle2, ArrowUpRight, ShieldCheck, Mail, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from './DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';

type Property = {
  id: string;
  address: string;
  suburb: string;
};

type Tenant = {
  id: string;
  property_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
};

type Invoice = {
  property_id: string;
  status: string;
  due_date: string;
};

export function Tenants() {
  const { session } = useAuth();
  const navigate = useNavigate();
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    if (session?.user.id) {
      loadData(session.user.id);
    }
  }, [session]);

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      // Fetch landlord's properties
      const { data: propsData } = await supabase
        .from('properties')
        .select('id, address, suburb')
        .eq('owner_id', userId);

      const propsList = propsData || [];
      setProperties(propsList);

      // Fetch tenants and invoices
      const [tenantsResponse, invoicesResponse] = await Promise.all([
        supabase
          .from('tenants')
          .select('*')
          .eq('owner_id', userId),
        supabase
          .from('invoices')
          .select('property_id, status, due_date')
      ]);

      if (tenantsResponse.data) {
        setTenants(tenantsResponse.data as Tenant[]);
      }
      if (invoicesResponse.data) {
        setInvoices(invoicesResponse.data as Invoice[]);
      }
    } catch (err) {
      console.error("Error loading CRM data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatus = (propertyId: string) => {
    const propInvoices = invoices.filter(inv => inv.property_id === propertyId);
    if (propInvoices.length === 0) return { label: 'No Invoices', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hasArrears = propInvoices.some(inv => 
      inv.status.toLowerCase() === 'unpaid' && 
      inv.due_date && 
      new Date(inv.due_date) < today
    );

    if (hasArrears) {
      return { label: 'Arrears', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
    }
    return { label: 'Up to Date', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  };

  const getLeaseStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return { label: 'Active', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'Pending':
      case 'Invited':
        return { label: 'Pending Invite', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      default:
        return { label: status || 'Inactive', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
    }
  };

  // Search & Filtered Tenants
  const filteredTenants = tenants.filter(t => {
    const fullName = `${t.first_name || ''} ${t.last_name || ''}`.toLowerCase();
    const email = (t.email || '').toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'All') return matchesSearch;
    if (statusFilter === 'Active') return matchesSearch && t.status === 'Active';
    if (statusFilter === 'Pending') return matchesSearch && (t.status === 'Pending' || t.status === 'Invited');
    return matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="min-h-screen relative overflow-hidden bg-surface text-on-surface py-12 px-4 sm:px-6 lg:px-8">
        
        <div className="max-w-7xl mx-auto relative z-10 space-y-8 mt-16 md:mt-0">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-3">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Tenant Directory CRM
              </div>
              <h1 className="text-4xl font-black tracking-tight text-on-surface font-display">
                Tenants
              </h1>
              <p className="text-on-surface-variant mt-2 font-medium">Read-only directory of current and pending residents linked to your properties.</p>
            </div>
          </div>

          {/* Search and Filters panel */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-surface-container-lowest backdrop-blur-xl rounded-[24px] border border-outline-variant/50 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tenants by name or email..."
                className="w-full bg-surface border border-outline-variant/50 rounded-xl pl-12 pr-4 py-3.5 text-sm font-semibold text-on-surface placeholder-on-surface-variant/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            
            <div className="flex gap-2">
              {['All', 'Active', 'Pending'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                    statusFilter === status 
                      ? 'bg-primary text-on-primary border-primary font-extrabold' 
                      : 'bg-surface text-on-surface-variant border-outline-variant/50 hover:bg-surface-container'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* CRM Glassmorphic Data Table */}
          {loading ? (
            <div className="flex items-center justify-center py-32 bg-surface-container-lowest backdrop-blur-md rounded-[32px] border border-outline-variant/50">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-[32px] border border-outline-variant/50 shadow-sm overflow-hidden">
              {filteredTenants.length === 0 ? (
                <div className="py-24 px-6 text-center">
                  <div className="w-16 h-16 bg-surface border border-outline-variant/50 text-on-surface-variant rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-on-surface mb-2 tracking-tight">No tenants found</h3>
                  <p className="text-on-surface-variant max-w-sm mx-auto font-medium">
                    No records match your filters. Navigate to a vacant property details view to invite a tenant.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant/40 bg-surface-container/50">
                        <th className="py-5 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Tenant Details</th>
                        <th className="py-5 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Property Address</th>
                        <th className="py-5 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Lease Status</th>
                        <th className="py-5 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Payment Ledger</th>
                        <th className="py-5 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      <AnimatePresence mode="popLayout">
                        {filteredTenants.map((tenant) => {
                          const prop = properties.find(p => p.id === tenant.property_id);
                          const payStatus = getPaymentStatus(tenant.property_id);
                          const leaseBadge = getLeaseStatusBadge(tenant.status);

                          return (
                            <motion.tr 
                              key={tenant.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="hover:bg-surface-container transition-colors group"
                            >
                              {/* Tenant Details */}
                              <td className="py-5 px-6">
                                <div className="flex items-center gap-3.5">
                                  <div className="w-11 h-11 rounded-2xl bg-surface border border-outline-variant/50 text-primary flex items-center justify-center font-bold font-display shadow-sm group-hover:scale-105 transition-transform">
                                    {(tenant.first_name || 'T').charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-extrabold text-on-surface text-base tracking-tight leading-none mb-1.5">
                                      {tenant.first_name ? `${tenant.first_name} ${tenant.last_name || ''}` : 'Pending Invitation'}
                                    </p>
                                    <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
                                      <Mail className="w-3.5 h-3.5 shrink-0" /> {tenant.email || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Property Address */}
                              <td className="py-5 px-6">
                                <div className="flex items-center gap-2">
                                  <Building className="w-4 h-4 text-on-surface-variant" />
                                  <span className="font-semibold text-on-surface">
                                    {prop ? `${prop.address}, ${prop.suburb}` : 'Not Assigned'}
                                  </span>
                                </div>
                              </td>

                              {/* Lease Status */}
                              <td className="py-5 px-6">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${leaseBadge.color}`}>
                                  <Clock className="w-3 h-3" /> {leaseBadge.label}
                                </span>
                              </td>

                              {/* Payment Status */}
                              <td className="py-5 px-6">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${payStatus.color}`}>
                                  {payStatus.label === 'Arrears' ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                  {payStatus.label}
                                </span>
                              </td>

                              {/* View Property Link */}
                              <td className="py-5 px-6 text-right">
                                {tenant.property_id ? (
                                  <button
                                    onClick={() => navigate(`/dashboard/property/${tenant.property_id}`)}
                                    className="inline-flex items-center gap-1.5 bg-surface border border-outline-variant/50 hover:bg-primary hover:text-on-primary hover:border-primary px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                                  >
                                    View Property <ArrowUpRight className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <span className="text-xs text-on-surface-variant/50 font-bold uppercase tracking-widest">N/A</span>
                                )}
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
