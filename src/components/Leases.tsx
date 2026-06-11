import React, { useState, useEffect } from 'react';
import { FileText, Plus, Building, User, Calendar, DollarSign, X, CheckCircle2, AlertTriangle, ArrowRight, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from './DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';

type Lease = {
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
  const { session } = useAuth();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [canEditPropertyIds, setCanEditPropertyIds] = useState<string[]>([]);
  
  // Create Lease State
  const [newLease, setNewLease] = useState({
    property_id: '',
    start_date: '',
    end_date: '',
    rent_amount: '',
    bond_amount: '',
    payment_frequency: 'Weekly',
    status: 'Active'
  });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [isPropertyDropdownOpen, setIsPropertyDropdownOpen] = useState(false);
  const [isFrequencyDropdownOpen, setIsFrequencyDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Edit Lease State
  const [editingLease, setEditingLease] = useState<Lease | null>(null);
  const [editError, setEditError] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (session?.user.id) {
      loadData(session.user.id);
    }
  }, [session]);

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      const uId = session?.user.id;
      if (!uId) return;

      const { data: teamMemberships } = await supabase
        .from('property_team')
        .select('property_id, can_create_lease, can_edit_lease')
        .eq('user_id', uId);
        
      const managedPropertyIds = teamMemberships?.map(m => m.property_id) || [];
      const createLeasePropertyIds = teamMemberships?.filter(m => m.can_create_lease).map(m => m.property_id) || [];
      const editLeasePropertyIds = teamMemberships?.filter(m => m.can_edit_lease).map(m => m.property_id) || [];
      setCanEditPropertyIds(editLeasePropertyIds);
      
      // Load properties for dropdown
      let propsQuery = supabase.from('properties').select('id, address, tenant_name');
      if (createLeasePropertyIds.length > 0) {
        propsQuery = propsQuery.or(`owner_id.eq.${userId},id.in.(${createLeasePropertyIds.join(',')})`);
      } else {
        propsQuery = propsQuery.eq('owner_id', userId);
      }
      const { data: propsData } = await propsQuery;
        
      if (propsData) setProperties(propsData);
      
      let query = supabase.from('leases').select('*, properties!inner(address, suburb, tenant_name, owner_id)');
      if (managedPropertyIds.length > 0) {
        query = query.or(`properties.owner_id.eq.${userId},property_id.in.(${managedPropertyIds.join(',')})`);
      } else {
        query = query.eq('properties.owner_id', userId);
      }
      
      const { data: leaseData, error: leaseError } = await query.order('created_at', { ascending: false });

      if (leaseError) throw leaseError;
      if (leaseData) setLeases(leaseData as unknown as Lease[]);
      
    } catch (err) {
      console.error("Error loading leases:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLease = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    try {
      if (!newLease.property_id) throw new Error("Please select a property.");
      if (newLease.end_date && newLease.end_date <= newLease.start_date) {
        throw new Error("End date must be after start date.");
      }

      const { error } = await supabase.from('leases').insert({
        property_id: newLease.property_id,
        created_by: session?.user.id,
        start_date: newLease.start_date,
        end_date: newLease.end_date || null,
        rent_amount: parseFloat(newLease.rent_amount),
        bond_amount: newLease.bond_amount ? parseFloat(newLease.bond_amount) : 0,
        payment_frequency: newLease.payment_frequency,
        status: newLease.status
      });

      if (error) throw error;

      if (session?.user.id) loadData(session.user.id);
      setShowCreateModal(false);
      setNewLease({
        property_id: '',
        start_date: '',
        end_date: '',
        rent_amount: '',
        bond_amount: '',
        payment_frequency: 'Weekly',
        status: 'Active'
      });
    } catch (err: any) {
      console.error("Create lease error:", err);
      setCreateError(err.message || "Failed to create lease.");
    } finally {
      setCreating(false);
    }
  };

  const handleEditLease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLease) return;
    setEditError('');
    setEditing(true);

    try {
      if (editingLease.end_date && editingLease.end_date <= editingLease.start_date) {
        throw new Error("End date must be after start date.");
      }

      const { error } = await supabase.from('leases').update({
        start_date: editingLease.start_date,
        end_date: editingLease.end_date || null,
        rent_amount: typeof editingLease.rent_amount === 'string' ? parseFloat(editingLease.rent_amount) : editingLease.rent_amount,
        bond_amount: typeof editingLease.bond_amount === 'string' ? parseFloat(editingLease.bond_amount) : editingLease.bond_amount,
        payment_frequency: editingLease.payment_frequency,
        status: editingLease.status
      }).eq('id', editingLease.id);

      if (error) throw error;

      if (session?.user.id) loadData(session.user.id);
      setShowEditModal(false);
      setEditingLease(null);
    } catch (err: any) {
      console.error("Edit lease error:", err);
      setEditError(err.message || "Failed to update lease.");
    } finally {
      setEditing(false);
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
            onClick={() => setShowCreateModal(true)}
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
                  onClick={() => setShowCreateModal(true)}
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
                            {lease.rent_amount} <span className="text-xs font-medium text-slate-400 font-normal">/ {lease.payment_frequency.toLowerCase().replace('ly', '')}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider border ${getStatusColor(lease.status)}`}>
                            {lease.status}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(lease.properties?.owner_id === session?.user.id || canEditPropertyIds.includes(lease.property_id)) && (
                              <button 
                                onClick={() => {
                                  setEditingLease(lease);
                                  setShowEditModal(true);
                                }}
                                className="inline-flex items-center justify-center px-3 py-1.5 bg-white border border-outline-variant/50 hover:border-primary/40 hover:bg-primary/10 text-primary font-semibold text-xs rounded-lg transition-colors"
                              >
                                Edit
                              </button>
                            )}
                            <Link 
                              to={`/dashboard/property/${lease.property_id}`}
                              className="inline-flex items-center justify-center px-3 py-1.5 bg-white border border-outline-variant/50 hover:border-primary/40 hover:bg-primary/10 text-primary font-semibold text-xs rounded-lg transition-colors"
                            >
                              View
                            </Link>
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

      {/* Create Lease Modal */}
      {createPortal(
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white rounded-[32px] w-full max-w-xl shadow-2xl border border-outline-variant/50 overflow-hidden">
                <div className="px-6 py-5 border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center">
                  <h3 className="font-black text-lg text-on-surface flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" /> Record New Lease
                  </h3>
                  <button onClick={() => setShowCreateModal(false)} className="text-on-surface-variant hover:text-on-surface"><X className="w-6 h-6" /></button>
                </div>
                
                <div className="p-6">
                  {createError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-semibold flex gap-3 items-start">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <p>{createError}</p>
                    </div>
                  )}

                  <form onSubmit={handleCreateLease} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Select Property</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsPropertyDropdownOpen(!isPropertyDropdownOpen)}
                          className={`w-full flex items-center justify-between bg-surface-container-low border rounded-2xl px-4 py-3 text-on-surface font-medium transition-all outline-none ${isPropertyDropdownOpen ? 'border-primary ring-2 ring-primary' : 'border-outline-variant/50'}`}
                        >
                          <span>
                            {newLease.property_id 
                              ? properties.find(p => p.id === newLease.property_id)?.address 
                              : '-- Choose a property --'}
                          </span>
                          <ChevronDown className={`w-5 h-5 text-on-surface-variant transition-transform ${isPropertyDropdownOpen ? 'rotate-180 text-primary' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                          {isPropertyDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.15 }}
                              className="absolute z-10 w-full mt-2 bg-surface-container-low border border-outline-variant/50 rounded-2xl shadow-xl overflow-hidden py-2"
                            >
                              <div 
                                className="px-4 py-2.5 hover:bg-white cursor-pointer transition-colors text-on-surface font-bold text-sm"
                                onClick={() => {
                                  setNewLease({...newLease, property_id: ''});
                                  setIsPropertyDropdownOpen(false);
                                }}
                              >
                                -- Choose a property --
                              </div>
                              {properties.map(p => (
                                <div 
                                  key={p.id}
                                  className={`px-4 py-2.5 cursor-pointer transition-colors text-sm font-bold ${newLease.property_id === p.id ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-white'}`}
                                  onClick={() => {
                                    setNewLease({...newLease, property_id: p.id});
                                    setIsPropertyDropdownOpen(false);
                                  }}
                                >
                                  {p.address} {p.tenant_name ? `(${p.tenant_name})` : ''}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Start Date</label>
                        <input 
                          type="date" 
                          required
                          value={newLease.start_date}
                          onChange={(e) => setNewLease({...newLease, start_date: e.target.value})}
                          className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">End Date (Optional)</label>
                        <input 
                          type="date" 
                          value={newLease.end_date}
                          onChange={(e) => setNewLease({...newLease, end_date: e.target.value})}
                          className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Rent Amount</label>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="number" 
                            required
                            min="0"
                            step="0.01"
                            value={newLease.rent_amount}
                            onChange={(e) => setNewLease({...newLease, rent_amount: e.target.value})}
                            className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl pl-10 pr-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Bond Amount</label>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            value={newLease.bond_amount}
                            onChange={(e) => setNewLease({...newLease, bond_amount: e.target.value})}
                            className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl pl-10 pr-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Frequency</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsFrequencyDropdownOpen(!isFrequencyDropdownOpen)}
                            className={`w-full flex items-center justify-between bg-surface-container-low border rounded-2xl px-4 py-3 text-on-surface font-medium transition-all outline-none ${isFrequencyDropdownOpen ? 'border-primary ring-2 ring-primary' : 'border-outline-variant/50'}`}
                          >
                            <span>{newLease.payment_frequency}</span>
                            <ChevronDown className={`w-5 h-5 text-on-surface-variant transition-transform ${isFrequencyDropdownOpen ? 'rotate-180 text-primary' : ''}`} />
                          </button>
                          
                          <AnimatePresence>
                            {isFrequencyDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.15 }}
                                className="absolute z-10 w-full mt-2 bg-surface-container-low border border-outline-variant/50 rounded-2xl shadow-xl overflow-hidden py-2"
                              >
                                {['Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Annually'].map(freq => (
                                  <div 
                                    key={freq}
                                    className={`px-4 py-2.5 cursor-pointer transition-colors text-sm font-bold ${newLease.payment_frequency === freq ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-white'}`}
                                    onClick={() => {
                                      setNewLease({...newLease, payment_frequency: freq});
                                      setIsFrequencyDropdownOpen(false);
                                    }}
                                  >
                                    {freq}
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Status</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          className={`w-full flex items-center justify-between bg-surface-container-low border rounded-2xl px-4 py-3 text-on-surface font-medium transition-all outline-none ${isStatusDropdownOpen ? 'border-primary ring-2 ring-primary' : 'border-outline-variant/50'}`}
                        >
                          <span>{newLease.status}</span>
                          <ChevronDown className={`w-5 h-5 text-on-surface-variant transition-transform ${isStatusDropdownOpen ? 'rotate-180 text-primary' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                          {isStatusDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.15 }}
                              className="absolute z-10 w-full mt-2 bg-surface-container-low border border-outline-variant/50 rounded-2xl shadow-xl overflow-hidden py-2"
                            >
                              {['Active', 'Draft', 'Pending'].map(status => (
                                <div 
                                  key={status}
                                  className={`px-4 py-2.5 cursor-pointer transition-colors text-sm font-bold ${newLease.status === status ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-white'}`}
                                  onClick={() => {
                                    setNewLease({...newLease, status: status});
                                    setIsStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button 
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="flex-1 bg-white border border-outline-variant/50 hover:bg-surface-container-low text-on-surface font-bold py-3.5 rounded-2xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={creating}
                        className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {creating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Save Lease'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Edit Lease Modal */}
      {createPortal(
        <AnimatePresence>
          {showEditModal && editingLease && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white rounded-[32px] w-full max-w-xl shadow-2xl border border-outline-variant/50 overflow-hidden">
                <div className="px-6 py-5 border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center">
                  <h3 className="font-black text-lg text-on-surface flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" /> Edit Lease
                  </h3>
                  <button onClick={() => setShowEditModal(false)} className="text-on-surface-variant hover:text-on-surface"><X className="w-6 h-6" /></button>
                </div>
                
                <div className="p-6">
                  {editError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-semibold flex gap-3 items-start">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <p>{editError}</p>
                    </div>
                  )}

                  <form onSubmit={handleEditLease} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Property</label>
                      <div className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-on-surface font-medium opacity-70">
                        {editingLease.properties?.address}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Start Date</label>
                        <input 
                          type="date" 
                          required
                          value={editingLease.start_date}
                          onChange={(e) => setEditingLease({...editingLease, start_date: e.target.value})}
                          className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">End Date (Optional)</label>
                        <input 
                          type="date" 
                          value={editingLease.end_date || ''}
                          onChange={(e) => setEditingLease({...editingLease, end_date: e.target.value})}
                          className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Rent Amount</label>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="number" 
                            required
                            min="0"
                            step="0.01"
                            value={editingLease.rent_amount}
                            onChange={(e) => setEditingLease({...editingLease, rent_amount: e.target.value as any})}
                            className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl pl-10 pr-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Bond Amount</label>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            value={editingLease.bond_amount || ''}
                            onChange={(e) => setEditingLease({...editingLease, bond_amount: e.target.value as any})}
                            className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl pl-10 pr-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Frequency</label>
                        <select
                          value={editingLease.payment_frequency}
                          onChange={(e) => setEditingLease({...editingLease, payment_frequency: e.target.value})}
                          className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none appearance-none"
                        >
                          {['Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Annually'].map(freq => (
                            <option key={freq} value={freq}>{freq}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Status</label>
                      <select
                        value={editingLease.status}
                        onChange={(e) => setEditingLease({...editingLease, status: e.target.value})}
                        className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none appearance-none"
                      >
                        {['Active', 'Draft', 'Pending', 'Expired', 'Terminated'].map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button 
                        type="button"
                        onClick={() => setShowEditModal(false)}
                        className="flex-1 bg-white border border-outline-variant/50 hover:bg-surface-container-low text-on-surface font-bold py-3.5 rounded-2xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={editing}
                        className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {editing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Update Lease'}
                      </button>
                    </div>
                  </form>
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
