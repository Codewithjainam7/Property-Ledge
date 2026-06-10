import React, { useState, useEffect } from 'react';
import { Shield, Plus, Building, Trash2, Mail, Users, Key, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from './DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import emailjs from '@emailjs/browser';
import { createPortal } from 'react-dom';

type Property = {
  id: string;
  address: string;
  suburb: string;
};

type TeamMember = {
  id: string;
  property_id: string;
  user_id: string;
  role: string;
  can_view_property: boolean;
  can_view_lease: boolean;
  can_create_lease: boolean;
  can_edit_lease: boolean;
  can_manage_tenants: boolean;
  user_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
};

export function Team() {
  const { session } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  
  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Agent');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviting, setInviting] = useState(false);
  const [isPropertyDropdownOpen, setIsPropertyDropdownOpen] = useState(false);

  useEffect(() => {
    if (session?.user.id) {
      loadData(session.user.id);
    }
  }, [session]);

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      const [propsResponse, teamResponse] = await Promise.all([
        supabase.from('properties').select('id, address, suburb').eq('owner_id', userId),
        supabase.from('property_team').select(`
          *,
          user_profiles!property_team_user_id_fkey (first_name, last_name, email)
        `)
      ]);

      if (propsResponse.data) setProperties(propsResponse.data);
      if (teamResponse.data) setTeamMembers(teamResponse.data as any[]);
    } catch (err) {
      console.error("Error loading team data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    setInviting(true);

    if (!selectedPropertyId) {
      setInviteError("Please select a property.");
      setInviting(false);
      return;
    }

    try {
      // 1. First, send the email using EmailJS so they get notified instantly!
      const selectedProp = properties.find(p => p.id === selectedPropertyId);
      const landlordEmail = session?.user?.email || '';
      
      if (selectedProp) {
        try {
          await emailjs.send(
            'service_pvyeiv4',
            'template_fa2cvee',
            {
              email: inviteEmail,
              role: inviteRole, 
              property_address: `${selectedProp.address}, ${selectedProp.suburb}`,
              reply_to: landlordEmail,
              property_id: selectedProp.id
            },
            'HiMuS6V2asatgtQDn'
          );
        } catch (emailErr) {
          console.error("EmailJS error (non-fatal):", emailErr);
          // If EmailJS fails, we still want to try adding them to the team
        }
      }

      // 2. Try to add them to the database team if they already have an account
      const { data: userId, error: rpcError } = await supabase.rpc('get_user_by_email', { p_email: inviteEmail });
      
      if (userId && !rpcError) {
        const { error: insertError } = await supabase.from('property_team').insert({
          property_id: selectedPropertyId,
          user_id: userId,
          role: inviteRole,
          can_view_property: true,
          can_view_lease: inviteRole === 'Manager' || inviteRole === 'Strata',
          can_create_lease: inviteRole === 'Manager',
          can_edit_lease: inviteRole === 'Manager',
          can_manage_tenants: inviteRole === 'Manager' || inviteRole === 'Agent'
        });

        if (insertError && insertError.code === '23505') {
          setInviteError("Email sent! But note: User is already on the team for this property.");
        } else if (insertError) {
          console.error("Insert error:", insertError);
        } else {
          setInviteSuccess("Team member successfully invited and added to the team!");
        }
      } else {
        // User does not exist in the database yet
        setInviteSuccess("Invitation email sent! They will need to create an account before they appear in your team list.");
      }

      setInviteEmail('');
      if (session?.user.id) loadData(session.user.id);
      
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess('');
        setInviteError('');
      }, 3500);

    } catch (err: any) {
      console.error("Invite error:", err);
      setInviteError(err.message || "An error occurred.");
    } finally {
      setInviting(false);
    }
  };

  const togglePermission = async (memberId: string, field: string, currentValue: boolean) => {
    try {
      // Optimistic update
      setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, [field]: !currentValue } : m));
      
      const { error } = await supabase
        .from('property_team')
        .update({ [field]: !currentValue })
        .eq('id', memberId);
        
      if (error) throw error;
    } catch (err) {
      console.error("Error toggling permission:", err);
      if (session?.user.id) loadData(session.user.id); // Revert on failure
    }
  };

  const removeMember = async (memberId: string) => {
    if (!window.confirm("Are you sure you want to remove this team member? They will lose all access to this property.")) return;
    
    try {
      const { error } = await supabase.from('property_team').delete().eq('id', memberId);
      if (error) throw error;
      setTeamMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err) {
      console.error("Error removing member:", err);
      alert("Failed to remove member.");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Team Access
          </h1>
          <p className="text-on-surface-variant font-medium mt-1">Manage agents, strata, and co-owners across your properties.</p>
        </div>
        <button 
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          Invite Member
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>
      ) : (
        <div className="grid gap-6">
          {properties.length === 0 ? (
            <div className="bg-white rounded-[32px] p-12 text-center border border-outline-variant/30 shadow-sm">
              <Building className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-on-surface mb-2">No Properties Found</h3>
              <p className="text-on-surface-variant">You need to add a property before you can assign team members.</p>
            </div>
          ) : (
            properties.map(property => {
              const members = teamMembers.filter(m => m.property_id === property.id);
              
              return (
                <div key={property.id} className="bg-white rounded-2xl border border-outline-variant/50 overflow-hidden shadow-sm">
                  <div className="bg-surface-container-low border-b border-outline-variant/50 p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center border border-outline-variant/50 shadow-sm">
                        <Building className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-on-surface">{property.address}</h3>
                        <p className="text-xs text-on-surface-variant font-medium">{property.suburb}</p>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-on-surface-variant bg-white px-3 py-1 rounded-full border border-outline-variant/50">
                      {members.length} {members.length === 1 ? 'Member' : 'Members'}
                    </div>
                  </div>
                  
                  <div className="p-0">
                    {members.length === 0 ? (
                      <div className="p-8 text-center text-on-surface-variant font-medium text-sm">
                        No team members assigned to this property.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {members.map(member => (
                          <div key={member.id} className="p-5 hover:bg-surface-container-low transition-colors">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                              
                              {/* Member Info */}
                              <div className="flex items-center gap-4 min-w-[250px]">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/10 to-white border border-primary/20 flex items-center justify-center font-bold text-primary text-lg shadow-inner">
                                  {member.user_profiles?.first_name?.charAt(0) || member.user_profiles?.email.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-on-surface">
                                    {member.user_profiles?.first_name} {member.user_profiles?.last_name}
                                  </div>
                                  <div className="text-xs text-on-surface-variant">{member.user_profiles?.email}</div>
                                  <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-outline-variant/50">
                                    {member.role}
                                  </div>
                                </div>
                              </div>

                              {/* Permissions Grid */}
                              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <input 
                                    type="checkbox" 
                                    className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-indigo-600 cursor-pointer"
                                    checked={member.can_view_lease}
                                    onChange={() => togglePermission(member.id, 'can_view_lease', member.can_view_lease)}
                                  />
                                  <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">View Leases</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <input 
                                    type="checkbox" 
                                    className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-indigo-600 cursor-pointer"
                                    checked={member.can_create_lease}
                                    onChange={() => togglePermission(member.id, 'can_create_lease', member.can_create_lease)}
                                  />
                                  <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">Create Leases</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <input 
                                    type="checkbox" 
                                    className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-indigo-600 cursor-pointer"
                                    checked={member.can_edit_lease}
                                    onChange={() => togglePermission(member.id, 'can_edit_lease', member.can_edit_lease)}
                                  />
                                  <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">Edit Leases</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <input 
                                    type="checkbox" 
                                    className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-indigo-600 cursor-pointer"
                                    checked={member.can_manage_tenants}
                                    onChange={() => togglePermission(member.id, 'can_manage_tenants', member.can_manage_tenants)}
                                  />
                                  <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">Manage Tenants</span>
                                </label>
                              </div>

                              {/* Actions */}
                              <div>
                                <button 
                                  onClick={() => removeMember(member.id)}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove Member"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>

                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Invite Modal */}
      {createPortal(
        <AnimatePresence>
          {showInviteModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-outline-variant/50 overflow-hidden">
                <div className="px-6 py-5 border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center">
                  <h3 className="font-black text-lg text-on-surface flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" /> Grant Access
                  </h3>
                  <button onClick={() => setShowInviteModal(false)} className="text-on-surface-variant hover:text-on-surface"><Plus className="w-6 h-6 rotate-45" /></button>
                </div>
                <div className="p-6">
                  {inviteError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-semibold flex gap-3 items-start">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <p>{inviteError}</p>
                    </div>
                  )}
                  {inviteSuccess && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl text-sm font-semibold flex gap-3 items-start">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <p>{inviteSuccess}</p>
                    </div>
                  )}

                  <form onSubmit={handleInvite} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Select Property</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsPropertyDropdownOpen(!isPropertyDropdownOpen)}
                          className={`w-full flex items-center justify-between bg-surface-container-low border rounded-2xl px-4 py-3.5 text-on-surface font-bold transition-all outline-none ${isPropertyDropdownOpen ? 'border-primary ring-2 ring-primary' : 'border-outline-variant/50'}`}
                        >
                          <span>
                            {selectedPropertyId 
                              ? properties.find(p => p.id === selectedPropertyId)?.address 
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
                                  setSelectedPropertyId('');
                                  setIsPropertyDropdownOpen(false);
                                }}
                              >
                                -- Choose a property --
                              </div>
                              {properties.map(p => (
                                <div 
                                  key={p.id}
                                  className={`px-4 py-2.5 cursor-pointer transition-colors text-sm font-bold ${selectedPropertyId === p.id ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-white'}`}
                                  onClick={() => {
                                    setSelectedPropertyId(p.id);
                                    setIsPropertyDropdownOpen(false);
                                  }}
                                >
                                  {p.address}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Member Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                        <input 
                          type="email" 
                          required
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="agent@agency.com"
                          className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl pl-12 pr-4 py-3.5 text-on-surface font-bold focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Assign Role</label>
                      <div className="grid grid-cols-3 gap-3">
                        {['Agent', 'Strata', 'Manager'].map(role => (
                          <label key={role} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${inviteRole === role ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-outline-variant/50 hover:border-outline-variant/80 text-on-surface-variant font-medium'}`}>
                            <input type="radio" name="role" value={role} checked={inviteRole === role} onChange={() => setInviteRole(role)} className="hidden" />
                            <div className="text-sm">{role}</div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4">
                      <button 
                        type="submit" 
                        disabled={inviting || !!inviteSuccess}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {inviting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Add to Team'}
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
