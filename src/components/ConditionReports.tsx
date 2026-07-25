import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, Building, Search, Home, Calendar, User, Eye, Trash2, ShieldAlert, ArrowLeft, ArrowRight, Settings, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from './DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function CustomDropdown({ value, options, onChange, icon, className = '' }: { value: string, options: {value: string, label: string}[], onChange: (val: string) => void, icon?: React.ReactNode, className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = options.find(o => o.value === value) || options[0];

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button 
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 appearance-none bg-[#f8faf9] border border-[#e6e8e7] rounded-[8px] px-3.5 py-2.5 text-[13px] font-semibold text-[#22333b] hover:border-[#a9927d] transition-all text-left"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {icon && <span className="text-[#a9927d] shrink-0">{icon}</span>}
          <span className="truncate">{selected?.label || 'Select...'}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[#a9927d] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white border border-[#e6e8e7] rounded-[8px] shadow-xl z-[100] min-w-full overflow-hidden p-1 max-h-60 overflow-y-auto">
          {options.map(o => (
            <button 
              type="button"
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-bold rounded-[4px] transition-colors flex items-center justify-between ${value === o.value ? 'bg-[#22333b] text-white' : 'text-[#22333b] hover:bg-[#f2f4f3]'}`}
            >
              <span className="truncate">{o.label}</span>
              {value === o.value && <Check className="w-4 h-4 ml-2 shrink-0 text-white" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Report {
  id: string;
  property_id: string;
  lease_id: string | null;
  type: 'Move In' | 'Routine' | 'Move Out' | 'Custom';
  inspection_date: string;
  inspector_name: string;
  status: 'Draft' | 'Completed';
  properties: { address: string } | null;
}

interface RoomTemplate {
  name: string;
  count: number;
}

export function ConditionReports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Report Form State
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedLeaseId, setSelectedLeaseId] = useState('');
  const [inspectionType, setInspectionType] = useState<'Move In' | 'Routine' | 'Move Out' | 'Custom'>('Move In');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [inspectorName, setInspectorName] = useState('');
  const [notes, setNotes] = useState('');

  // Layout Definer State
  const [roomTemplates, setRoomTemplates] = useState<RoomTemplate[]>([
    { name: 'Bedroom', count: 3 },
    { name: 'Bathroom', count: 2 },
    { name: 'Living Room', count: 1 },
    { name: 'Kitchen', count: 1 },
    { name: 'Laundry', count: 1 },
    { name: 'Garage', count: 1 },
    { name: 'Balcony', count: 0 },
    { name: 'Garden', count: 0 },
  ]);

  useEffect(() => {
    if (user) {
      fetchReports();
      fetchPropertiesAndLeases();
    }
  }, [user]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('condition_reports')
        .select('*, properties(address)')
        .order('inspection_date', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      alert('Error fetching reports: ' + (err.message || err.details || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  const fetchPropertiesAndLeases = async () => {
    try {
      const [{ data: pData }, { data: lData }] = await Promise.all([
        supabase.from('properties').select('*').order('address'),
        supabase.from('leases').select('*').order('start_date', { ascending: false }),
      ]);
      setProperties(pData || []);
      setLeases(lData || []);
      
      // Prefill inspector name
      const profile = (await supabase.auth.getUser()).data.user;
      if (profile?.email) {
        setInspectorName(profile.email.split('@')[0]);
      }
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  // Autoload Active Lease when property changes
  useEffect(() => {
    if (selectedPropertyId) {
      const activeLease = leases.find(l => l.property_id === selectedPropertyId && l.status === 'Active') 
        || leases.find(l => l.property_id === selectedPropertyId);
      setSelectedLeaseId(activeLease?.id || '');
    } else {
      setSelectedLeaseId('');
    }
  }, [selectedPropertyId, leases]);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId) return;

    try {
      // 1. Insert report
      const { data: newReport, error: reportErr } = await supabase
        .from('condition_reports')
        .insert({
          property_id: selectedPropertyId,
          lease_id: selectedLeaseId || null,
          type: inspectionType,
          inspection_date: inspectionDate,
          inspector_name: inspectorName,
          notes: notes,
          status: 'Draft',
        })
        .select()
        .single();

      if (reportErr) throw reportErr;

      // 2. Generate rooms list based on Layout config
      const roomsToCreate: { report_id: string; name: string; room_order: number }[] = [];
      let order = 0;

      roomTemplates.forEach(t => {
        for (let i = 0; i < t.count; i++) {
          roomsToCreate.push({
            report_id: newReport.id,
            name: t.count > 1 ? `${t.name} ${i + 1}` : t.name,
            room_order: order++,
          });
        }
      });

      // Standard items checklist for condition report mapping
      const standardItems = [
        'Walls', 'Ceiling', 'Floor', 'Doors', 'Windows', 'Curtains/Blinds', 
        'Power Points', 'Lights', 'Smoke Alarm', 'Air Conditioner', 
        'Cleanliness', 'General Condition'
      ];

      // 3. Save rooms and items checklist
      for (const r of roomsToCreate) {
        const { data: newRoom, error: roomErr } = await supabase
          .from('inspection_rooms')
          .insert(r)
          .select()
          .single();

        if (roomErr) throw roomErr;

        const itemsToCreate = standardItems.map(name => ({
          room_id: newRoom.id,
          name,
          rating: null
        }));

        const { error: itemsErr } = await supabase
          .from('inspection_items')
          .insert(itemsToCreate);

        if (itemsErr) throw itemsErr;
      }

      // Close modal and navigate to wizard
      setIsAddModalOpen(false);
      navigate(`/dashboard/condition-report-wizard/${newReport.id}`);
    } catch (err: any) {
      console.error('Error creating condition report:', err);
      alert('Error creating report: ' + (err.message || err.details || JSON.stringify(err)));
    }
  };

  const handleDeleteReport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      const { error } = await supabase.from('condition_reports').delete().eq('id', id);
      if (error) throw error;
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Error deleting report:', err);
    }
  };

  const handleUpdateCount = (name: string, increment: boolean) => {
    setRoomTemplates(prev =>
      prev.map(t => {
        if (t.name === name) {
          const val = increment ? t.count + 1 : Math.max(0, t.count - 1);
          return { ...t, count: val };
        }
        return t;
      })
    );
  };

  const filteredReports = reports.filter(r =>
    r.properties?.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.inspector_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="relative overflow-hidden min-h-screen pb-20">
        
        {/* Header */}
        <header className="px-6 md:px-10 pt-8 pb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4 z-30 relative">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#22333b] font-display mb-1">
              Condition Reports
            </h1>
            <p className="text-sm text-[#5e503f] font-medium hidden sm:block">Perform mobile-first condition reports and generate PDF exports.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#22333b] text-white px-5 py-2.5 rounded-[8px] font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-[#111a1e] hover:shadow-md transition-all shrink-0 cursor-pointer w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4" /> Start New Report
          </button>
        </header>

        {/* Filters and List */}
        <div className="px-6 md:px-10">
          <div className="flex flex-col md:flex-row gap-3 mb-6 items-center">
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a9927d]" />
              <input
                type="text"
                placeholder="Search by address, inspector, or type..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e6e8e7] rounded-[8px] text-[13px] focus:ring-2 focus:ring-[#22333b]/20 focus:border-[#22333b] outline-none transition-all placeholder-[#b5ada5]"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-4 border-[#a9927d] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-20 bg-white border border-[#e6e8e7] rounded-[8px] p-8 shadow-sm">
              <ClipboardList className="w-12 h-12 text-[#a9927d] mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[#22333b] mb-2 font-display">No Reports Found</h3>
              <p className="text-sm text-[#5e503f] max-w-sm mx-auto mb-6">Create your first digital condition report. Setup properties and layout to run reports on mobile phone.</p>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-[#22333b] text-white px-6 py-2.5 rounded-[8px] text-sm font-bold hover:bg-[#111a1e] transition-colors cursor-pointer"
              >
                Create New Report
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReports.map(r => (
                <div 
                  key={r.id} 
                  onClick={() => navigate(`/dashboard/condition-report-wizard/${r.id}`)}
                  className="bg-white border border-[#e6e8e7] rounded-[8px] p-5 shadow-sm hover:border-[#a9927d] hover:shadow transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider ${r.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.status}
                      </span>
                      <button 
                        onClick={(e) => handleDeleteReport(r.id, e)}
                        className="text-[#a9927d] hover:text-red-600 p-1 hover:bg-[#f2f4f3] rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="font-bold text-sm text-[#22333b] truncate mb-1">{r.properties?.address}</h3>
                    <p className="text-xs text-[#a9927d] font-bold mb-4">{r.type} Inspection</p>
                  </div>

                  <div className="pt-4 border-t border-[#e6e8e7] flex items-center justify-between text-xs text-[#5e503f]">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Calendar className="w-3.5 h-3.5" /> {r.inspection_date}
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold capitalize">
                      <User className="w-3.5 h-3.5" /> {r.inspector_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Modal */}
        <AnimatePresence>
          {isAddModalOpen && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-[#e6e8e7] rounded-[8px] shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
              >
                <div className="px-6 py-5 border-b border-[#e6e8e7] flex items-center justify-between">
                  <h2 className="text-lg font-black text-[#22333b] tracking-tight font-display">New Condition Report</h2>
                  <button onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-[#a9927d] hover:bg-[#f2f4f3] hover:text-[#22333b] transition-all">✕</button>
                </div>

                <form onSubmit={handleCreateReport} className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Select Property */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#a9927d] uppercase tracking-widest">Select Property</label>
                    <CustomDropdown
                      value={selectedPropertyId}
                      onChange={val => setSelectedPropertyId(val)}
                      options={[
                        { value: '', label: '-- Choose Property --' },
                        ...properties.map(p => ({ value: p.id, label: p.address }))
                      ]}
                      icon={<Building className="w-3.5 h-3.5" />}
                    />
                  </div>

                  {/* Auto-selected Lease */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#a9927d] uppercase tracking-widest">Lease Reference</label>
                    <CustomDropdown
                      value={selectedLeaseId}
                      onChange={val => setSelectedLeaseId(val)}
                      options={[
                        { value: '', label: '-- No Active Lease / Historic --' },
                        ...leases.filter(l => l.property_id === selectedPropertyId).map(l => ({
                          value: l.id,
                          label: `${l.status} — ${l.start_date} → ${l.end_date || 'Ongoing'}`
                        }))
                      ]}
                      icon={<ClipboardList className="w-3.5 h-3.5" />}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Inspection Type */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-[#a9927d] uppercase tracking-widest">Inspection Type</label>
                      <CustomDropdown
                        value={inspectionType}
                        onChange={val => setInspectionType(val as any)}
                        options={[
                          { value: 'Move In', label: 'Move-In Inspection' },
                          { value: 'Routine', label: 'Routine Inspection' },
                          { value: 'Move Out', label: 'Move-Out Inspection' },
                          { value: 'Custom', label: 'Custom Inspection' }
                        ]}
                      />
                    </div>

                    {/* Date */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-[#a9927d] uppercase tracking-widest">Inspection Date</label>
                      <input
                        type="date"
                        required
                        value={inspectionDate}
                        onChange={e => setInspectionDate(e.target.value)}
                        className="w-full bg-[#f8faf9] border border-[#e6e8e7] rounded-[8px] px-3 py-2 text-[13px] font-semibold text-[#22333b] focus:ring-2 focus:ring-[#22333b]/20 focus:border-[#22333b] outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Inspector Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#a9927d] uppercase tracking-widest">Inspector Name</label>
                    <input
                      type="text"
                      required
                      value={inspectorName}
                      onChange={e => setInspectorName(e.target.value)}
                      placeholder="Inspector Name"
                      className="w-full bg-[#f8faf9] border border-[#e6e8e7] rounded-[8px] px-3 py-2 text-[13px] font-semibold text-[#22333b] focus:ring-2 focus:ring-[#22333b]/20 focus:border-[#22333b] outline-none transition-all"
                    />
                  </div>

                  {/* Layout Definer */}
                  <div className="border-t border-[#e6e8e7] pt-5">
                    <h3 className="text-sm font-bold text-[#22333b] mb-4 font-display flex items-center gap-2">
                      <Settings className="w-4 h-4 text-[#a9927d]" /> Define Property Layout
                    </h3>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {roomTemplates.map(t => (
                        <div key={t.name} className="flex flex-col bg-[#f8faf9] border border-[#e6e8e7] rounded-[8px] p-3 items-center justify-between">
                          <span className="text-xs font-semibold text-[#22333b] mb-2">{t.name}</span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleUpdateCount(t.name, false)}
                              className="w-6 h-6 rounded-full bg-white border border-[#e6e8e7] hover:border-[#a9927d] flex items-center justify-center text-xs font-bold text-[#22333b] transition-all"
                            >
                              -
                            </button>
                            <span className="text-sm font-bold text-[#22333b] min-w-[12px] text-center">{t.count}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCount(t.name, true)}
                              className="w-6 h-6 rounded-full bg-white border border-[#e6e8e7] hover:border-[#a9927d] flex items-center justify-center text-xs font-bold text-[#22333b] transition-all"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-[#e6e8e7] flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1 py-3 bg-[#f2f4f3] text-[#5e503f] hover:bg-[#eaeceb] text-sm font-bold rounded-[8px] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!selectedPropertyId}
                      className="flex-1 bg-[#22333b] text-white py-3 rounded-[8px] text-sm font-bold hover:bg-[#111a1e] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Start Inspection
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
