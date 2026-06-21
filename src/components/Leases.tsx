import React, { useState, useEffect } from 'react';
import { FileText, Plus, Building, User, Calendar, DollarSign, X, CheckCircle2, AlertTriangle, ArrowRight, ChevronDown, Eye, Trash2, Clock, UserPlus, Mail, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from './DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { LeaseGenerator } from './LeaseGenerator';type Lease = {
  id: string;
  property_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  bond_amount: number;
  payment_frequency: string;
  status: string;
  properties?: {
    address: string;
    suburb: string;
    tenant_name: string;
    owner_id: string;
  };
};

export function Leases() {
  const { session, user } = useAuth();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [canEditPropertyIds, setCanEditPropertyIds] = useState<string[]>([]);
  
  // Generator State (for Edit / Download)
  const [generatorLease, setGeneratorLease] = useState<Lease | null>(null);

  // Delete Lease State
  const [deletingLeaseId, setDeletingLeaseId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Always clear cache so edits are reflected immediately
    sessionStorage.removeItem('cached_leases');
    sessionStorage.removeItem('cached_properties');
    if (session?.user?.id) {
      loadData(session.user.id);
    }
  }, [session?.user?.id]);

  const loadData = async (userId: string) => {
    if (!sessionStorage.getItem('cached_leases')) {
      setLoading(true);
    }
    try {
      const uId = session?.user.id;
      if (!uId) return;

      const { data: teamMemberships } = await supabase
        .from('property_team')
        .select('property_id, permissions')
        .eq('user_id', uId);
        
      const managedPropertyIds = teamMemberships?.map(m => m.property_id) || [];
      const createLeasePropertyIds = teamMemberships?.filter(m => (m as any).permissions?.can_create_lease).map(m => m.property_id) || [];
      const editLeasePropertyIds = teamMemberships?.filter(m => (m as any).permissions?.can_edit_lease).map(m => m.property_id) || [];
      setCanEditPropertyIds(editLeasePropertyIds);
      
      // Load properties for dropdown
      let propsQuery = supabase.from('properties').select('id, address, tenant_name, tenant_email, lease_start, lease_duration, suburb, rent_amount');
      if (createLeasePropertyIds.length > 0) {
        propsQuery = propsQuery.or(`owner_id.eq.${userId},id.in.(${createLeasePropertyIds.join(',')})`);
      } else {
        propsQuery = propsQuery.eq('owner_id', userId);
      }
      const { data: propsData } = await propsQuery;
        
      if (propsData) {
        setProperties(propsData);
        sessionStorage.setItem('cached_properties', JSON.stringify(propsData));
      }
      
      const query = supabase.from('leases').select('*, properties!inner(address, suburb, tenant_name, owner_id)').order('created_at', { ascending: false });
      
      const { data: leaseData, error: leaseError } = await query;

      if (leaseError) throw leaseError;
      if (leaseData) {
        // Filter on the client-side to avoid Supabase JS nested .or() bugs
        let filteredLeases = leaseData as unknown as Lease[];
        if (managedPropertyIds.length > 0) {
          filteredLeases = filteredLeases.filter(l => l.properties?.owner_id === userId || managedPropertyIds.includes(l.property_id));
        } else {
          filteredLeases = filteredLeases.filter(l => l.properties?.owner_id === userId);
        }

        setLeases(filteredLeases);
        sessionStorage.setItem('cached_leases', JSON.stringify(filteredLeases));
      }
      
    } catch (err) {
      console.error("Error loading leases:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLease = async (leaseId: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('leases').delete().eq('id', leaseId);
      if (error) throw error;
      sessionStorage.removeItem('cached_leases');
      if (session?.user?.id) loadData(session.user.id);
      setDeletingLeaseId(null);
    } catch (err: any) {
      console.error('Delete lease error:', err);
      alert('Failed to delete lease: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Draft': return 'bg-slate-100 text-on-surface border-outline-variant/50';
      case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Expired': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-on-surface border-outline-variant/50';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            Lease Management
          </h1>
          <p className="text-on-surface-variant font-medium mt-1">Manage active leases, renewals, and historical records.</p>
        </div>
        {properties.length > 0 && (
          <button 
            onClick={() => { setGeneratorLease(null); setShowGeneratorModal(true); }}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            Create Lease
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>
      ) : (
        <div className="grid gap-4">
          {leases.length === 0 ? (
            <div className="bg-white rounded-[32px] p-12 text-center border border-outline-variant/30 shadow-sm flex flex-col items-center">
              <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mb-4 border border-outline-variant/30">
                <FileText className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">No Leases Found</h3>
              <p className="text-on-surface-variant max-w-sm mb-6">You don't have any leases recorded yet. Create one manually or wait for a tenant to sign a rental application.</p>
              {properties.length > 0 && (
                <button 
                  onClick={() => { setGeneratorLease(null); setShowGeneratorModal(true); }}
                  className="bg-primary text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-primary/90 transition-colors"
                >
                  Create First Lease
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white border border-outline-variant/50 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant/50 text-xs uppercase tracking-wider font-bold text-on-surface-variant">
                      <th className="p-4 pl-6">Property</th>
                      <th className="p-4">Tenant</th>
                      <th className="p-4">Term</th>
                      <th className="p-4">Rent</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leases.map(lease => (
                      <tr key={lease.id} className="hover:bg-surface-container-low/80 transition-colors group">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                              <Building className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-bold text-on-surface">{lease.properties?.address || 'Unknown Property'}</div>
                              <div className="text-xs text-on-surface-variant">{lease.properties?.suburb}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-on-surface">{lease.properties?.tenant_name || 'No Tenant Linked'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {new Date(lease.start_date).toLocaleDateString()} <ArrowRight className="w-3 h-3 text-slate-300 mx-1" /> 
                            {lease.end_date ? new Date(lease.end_date).toLocaleDateString() : 'Periodic'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 font-bold text-on-surface">
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                            {Number(lease.rent_amount).toLocaleString('en-AU')} <span className="text-xs font-medium text-slate-400 font-normal">/ {lease.payment_frequency?.toLowerCase().replace('ly', '') || 'week'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider border ${getStatusColor(lease.status)}`}>
                            {lease.status}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {/* Download PDF / Edit */}
                            <button 
                              onClick={() => { setGeneratorLease(lease); setShowGeneratorModal(true); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-primary/20 hover:bg-primary/5 text-primary font-semibold text-xs rounded-lg transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" /> Download / Edit
                            </button>
                            {/* Delete Lease */}
                            {(lease.properties?.owner_id === session?.user?.id || canEditPropertyIds.includes(lease.property_id)) && (
                              <button 
                                onClick={() => setDeletingLeaseId(lease.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-500 font-semibold text-xs rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lease Generator Modal */}
      <AnimatePresence>
        {showGeneratorModal && (
          <LeaseGenerator 
            properties={properties} 
            initialLease={generatorLease}
            onSave={() => {
              sessionStorage.removeItem('cached_leases');
              if (session?.user?.id) loadData(session.user.id);
            }}
            onClose={() => {
              setShowGeneratorModal(false);
              setGeneratorLease(null);
            }} 
          />
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {createPortal(
        <AnimatePresence>
          {deletingLeaseId && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDeletingLeaseId(null)} />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white rounded-[28px] w-full max-w-sm shadow-2xl border border-red-100 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="font-black text-xl text-on-surface mb-2">Delete Lease?</h3>
                <p className="text-on-surface-variant text-sm mb-6">This action is permanent and cannot be undone. The lease record will be removed from the database.</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeletingLeaseId(null)} className="flex-1 bg-surface-container-low border border-outline-variant/50 text-on-surface font-bold py-3 rounded-2xl hover:bg-surface-container transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteLease(deletingLeaseId)}
                    disabled={isDeleting}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isDeleting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Delete'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
      </div>
    </DashboardLayout>
  );
}
