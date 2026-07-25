import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, X, Camera, AlertTriangle, ArrowLeft, Upload, FileText, CheckCircle2, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from './DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SignaturePad } from './SignaturePad';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Room {
  id: string;
  name: string;
  status: 'Incomplete' | 'Completed';
  room_order: number;
}

interface Item {
  id: string;
  room_id: string;
  name: string;
  rating: 'Excellent' | 'Good' | 'Fair' | 'Needs Repair' | 'Damaged' | 'Not Applicable' | null;
}

interface Defect {
  id: string;
  room_id: string;
  notes: string;
  severity: 'Minor' | 'Moderate' | 'Major' | 'Urgent';
}

interface Photo {
  id: string;
  room_id: string;
  photo_url: string;
}

export function ConditionReportWizard() {
  const { id: reportId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [report, setReport] = useState<any>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);

  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Signatures
  const [signatureManager, setSignatureManager] = useState<string | null>(null);
  const [signatureTenant, setSignatureTenant] = useState<string | null>(null);

  // Room Specific Inputs
  const [defectNotes, setDefectNotes] = useState('');
  const [defectSeverity, setDefectSeverity] = useState<'Minor' | 'Moderate' | 'Major' | 'Urgent'>('Minor');

  useEffect(() => {
    if (reportId) {
      loadReportData();
    }
  }, [reportId]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const { data: rep, error: repErr } = await supabase
        .from('condition_reports')
        .select('*, properties(address)')
        .eq('id', reportId)
        .single();
      if (repErr) throw repErr;
      setReport(rep);

      const { data: rms, error: rmsErr } = await supabase
        .from('inspection_rooms')
        .select('*')
        .eq('report_id', reportId)
        .order('room_order');
      if (rmsErr) throw rmsErr;
      setRooms(rms || []);

      if (rms && rms.length > 0) {
        // Fetch all items, defects, and photos for these rooms
        const roomIds = rms.map(r => r.id);
        
        const [{ data: itms }, { data: dfcts }, { data: phts }] = await Promise.all([
          supabase.from('inspection_items').select('*').in('room_id', roomIds),
          supabase.from('inspection_defects').select('*').in('room_id', roomIds),
          supabase.from('inspection_photos').select('*').in('room_id', roomIds)
        ]);

        setItems(itms || []);
        setDefects(dfcts || []);
        setPhotos(phts || []);
      }

      setSignatureManager(rep.signature_manager || null);
      setSignatureTenant(rep.signature_tenant || null);
    } catch (err) {
      console.error('Error loading report details:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeRoom = rooms[activeRoomIndex] || null;
  const activeRoomItems = items.filter(i => i.room_id === activeRoom?.id);
  const activeRoomDefects = defects.filter(d => d.room_id === activeRoom?.id);
  const activeRoomPhotos = photos.filter(p => p.room_id === activeRoom?.id);

  // Autosave Functionality
  const saveItemRating = async (itemId: string, rating: any) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, rating } : i));
    try {
      await supabase.from('inspection_items').update({ rating }).eq('id', itemId);
    } catch (err) {
      console.error('Autosave item rating failed:', err);
    }
  };

  const markEntireRoomAsGood = async () => {
    if (!activeRoom) return;
    const updatedItems = activeRoomItems.map(item => ({ ...item, rating: 'Good' as const }));
    setItems(prev => prev.map(i => i.room_id === activeRoom.id ? { ...i, rating: 'Good' } : i));
    
    try {
      const { error } = await supabase
        .from('inspection_items')
        .update({ rating: 'Good' })
        .eq('room_id', activeRoom.id);
      if (error) throw error;
      
      // Auto complete room status
      await updateRoomStatus(activeRoom.id, 'Completed');
    } catch (err) {
      console.error('Failed marking entire room good:', err);
    }
  };

  const updateRoomStatus = async (roomId: string, status: 'Incomplete' | 'Completed') => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status } : r));
    try {
      await supabase.from('inspection_rooms').update({ status }).eq('id', roomId);
    } catch (err) {
      console.error('Autosave room status failed:', err);
    }
  };

  const handleAddDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !defectNotes.trim()) return;

    try {
      const { data, error } = await supabase
        .from('inspection_defects')
        .insert({
          room_id: activeRoom.id,
          notes: defectNotes,
          severity: defectSeverity,
        })
        .select()
        .single();

      if (error) throw error;
      setDefects(prev => [...prev, data]);
      setDefectNotes('');
      setDefectSeverity('Minor');
      await updateRoomStatus(activeRoom.id, 'Completed');
    } catch (err) {
      console.error('Failed saving defect:', err);
    }
  };

  const handleDeleteDefect = async (defectId: string) => {
    try {
      const { error } = await supabase.from('inspection_defects').delete().eq('id', defectId);
      if (error) throw error;
      setDefects(prev => prev.filter(d => d.id !== defectId));
    } catch (err) {
      console.error('Failed deleting defect:', err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoom) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const { data, error } = await supabase
          .from('inspection_photos')
          .insert({
            room_id: activeRoom.id,
            photo_url: base64String
          })
          .select()
          .single();

        if (error) throw error;
        setPhotos(prev => [...prev, data]);
        await updateRoomStatus(activeRoom.id, 'Completed');
      } catch (err) {
        console.error('Failed saving photo upload:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      const { error } = await supabase.from('inspection_photos').delete().eq('id', photoId);
      if (error) throw error;
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (err) {
      console.error('Failed deleting photo:', err);
    }
  };

  const saveSignatures = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('condition_reports')
        .update({
          signature_manager: signatureManager,
          signature_tenant: signatureTenant,
          status: 'Completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;
      
      setReport(prev => ({
        ...prev,
        status: 'Completed',
        completed_at: new Date().toISOString()
      }));

      alert('Report finalized and locked successfully!');
    } catch (err) {
      console.error('Failed finalizing report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generatePDFReport = () => {
    if (!report) return;

    const doc = new jsPDF();
    const primaryColor = [34, 51, 59]; // #22333b
    const secondaryColor = [169, 146, 125]; // #a9927d

    // Title / Cover
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('NSW TENANCY CONDITION REPORT', 15, 26);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.text(`PROPERTY: ${report.properties?.address}`, 15, 55);
    doc.text(`INSPECTION TYPE: ${report.type}`, 15, 62);
    doc.text(`DATE: ${report.inspection_date}`, 15, 69);
    doc.text(`INSPECTOR: ${report.inspector_name}`, 15, 76);

    let currentY = 90;

    // Loop Rooms
    rooms.forEach((room) => {
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(13);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(room.name, 15, currentY);
      currentY += 5;

      // Table of items
      const roomItems = items.filter(i => i.room_id === room.id);
      const tableData = roomItems.map(item => [
        item.name,
        item.rating || 'Not Inspected'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Item Name', 'Condition']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: primaryColor as any },
        margin: { left: 15, right: 15 },
        didDrawPage: (data) => {
          currentY = data.cursor?.y ? data.cursor.y + 10 : currentY + 15;
        }
      });

      // Defect checklist for this room
      const roomDefects = defects.filter(d => d.room_id === room.id);
      if (roomDefects.length > 0) {
        if (currentY > 260) {
          doc.addPage();
          currentY = 20;
        }
        doc.setFontSize(10);
        doc.setTextColor(150, 50, 50);
        doc.text('Recorded Defects:', 15, currentY);
        currentY += 5;

        roomDefects.forEach(defect => {
          doc.setFontSize(9);
          doc.setTextColor(80, 80, 80);
          doc.text(`- [${defect.severity}] ${defect.notes}`, 20, currentY);
          currentY += 5;
        });
        currentY += 5;
      }
    });

    // Signatures page
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Digital Signatures & Finalization', 15, 30);

    if (signatureManager) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Inspector / Manager Signature:', 15, 50);
      try { doc.addImage(signatureManager, 'PNG', 15, 55, 60, 25); } catch {}
    }

    if (signatureTenant) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Tenant Signature:', 110, 50);
      try { doc.addImage(signatureTenant, 'PNG', 110, 55, 60, 25); } catch {}
    }

    doc.save(`Condition_Report_${report.properties?.address.replace(/\s+/g, '_')}.pdf`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="w-8 h-8 border-4 border-[#a9927d] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  // Calculate percentages
  const completedRooms = rooms.filter(r => r.status === 'Completed').length;
  const totalRooms = rooms.length;
  const progressPercent = Math.round((completedRooms / totalRooms) * 100);

  const isSummaryPage = activeRoomIndex === totalRooms;

  return (
    <DashboardLayout>
      <div className="relative overflow-hidden min-h-screen pb-20 flex bg-[#fbf9f9]">
        
        {/* Room Drawer Sidebar */}
        <div className={`fixed inset-y-0 left-0 lg:sticky lg:top-0 z-50 w-72 bg-white border-r border-[#e6e8e7] flex flex-col justify-between transform transition-transform duration-200 lg:transform-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="flex items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2 overflow-hidden">
                <button 
                  onClick={() => navigate('/dashboard/condition-reports')}
                  className="p-1.5 rounded-full hover:bg-[#f2f4f3] text-[#a9927d] transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="font-black text-sm text-[#22333b] truncate font-display">
                  {report.properties?.address}
                </h2>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-1.5 rounded-full text-[#a9927d] hover:bg-[#f2f4f3] hover:text-[#22333b]"
              >
                ✕
              </button>
            </div>

            {/* Room List Checklist */}
            <div className="space-y-1">
              {rooms.map((r, index) => {
                const roomDefectsCount = defects.filter(d => d.room_id === r.id).length;
                return (
                  <button
                    key={r.id}
                    onClick={() => { setActiveRoomIndex(index); setIsSidebarOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 rounded-[6px] text-xs font-bold transition-colors flex items-center justify-between ${activeRoomIndex === index ? 'bg-[#22333b] text-white' : 'text-[#5e503f] hover:bg-[#f2f4f3]'}`}
                  >
                    <span className="truncate">{r.name}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {roomDefectsCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-black">
                          {roomDefectsCount}
                        </span>
                      )}
                      {r.status === 'Completed' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#a9927d]" />
                      )}
                    </span>
                  </button>
                );
              })}

              {/* Summary Trigger */}
              <button
                onClick={() => { setActiveRoomIndex(totalRooms); setIsSidebarOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-[6px] text-xs font-bold transition-colors flex items-center justify-between ${activeRoomIndex === totalRooms ? 'bg-[#22333b] text-white' : 'text-[#5e503f] hover:bg-[#f2f4f3]'}`}
              >
                <span>Summary & Review</span>
                <CheckCircle2 className={`w-3.5 h-3.5 ${activeRoomIndex === totalRooms ? 'text-white' : 'text-[#a9927d]'}`} />
              </button>
            </div>
          </div>

          {/* Progress Section */}
          <div className="p-4 border-t border-[#e6e8e7] bg-[#f8faf9]">
            <div className="flex justify-between text-[10px] font-bold text-[#a9927d] uppercase tracking-wider mb-1.5">
              <span>Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#e6e8e7] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Backdrop for mobile menu drawer */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40 lg:hidden"
          />
        )}

        {/* Main Workspace */}
        <div className="flex-1 min-w-0 p-6 md:p-10">
          <AnimatePresence mode="wait">
            {!isSummaryPage ? (
              <motion.div
                key={activeRoom?.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-2xl mx-auto space-y-6"
              >
                {/* Room Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-[#e6e8e7] rounded-[8px] p-5 shadow-sm gap-4">
                  <div>
                    <h2 className="text-xl font-black text-[#22333b] font-display mb-1">{activeRoom?.name}</h2>
                    <p className="text-xs text-[#a9927d] font-bold">{completedRooms} / {totalRooms} Rooms Completed</p>
                  </div>
                  
                  <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                    {/* Toggle Sidebar Button for Mobile */}
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="lg:hidden bg-[#f2f4f3] border border-[#e6e8e7] hover:border-[#a9927d] text-[#22333b] font-bold text-xs px-4 py-2 rounded-[8px] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Menu className="w-3.5 h-3.5 text-[#a9927d]" /> Rooms
                    </button>

                    {/* Mark All Good Button */}
                    <button
                      onClick={markEntireRoomAsGood}
                      className="bg-[#f2f4f3] border border-[#e6e8e7] hover:border-[#a9927d] text-[#22333b] font-bold text-xs px-4 py-2 rounded-[8px] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Mark Room Good
                    </button>
                  </div>
                </div>

                {/* Items Checklist grid */}
                <div className="bg-white border border-[#e6e8e7] rounded-[8px] shadow-sm divide-y divide-[#e6e8e7] overflow-hidden">
                  {activeRoomItems.map(item => (
                    <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <span className="text-xs font-bold text-[#22333b]">{item.name}</span>
                      
                      {/* Segmented rating controls */}
                      <div className="flex bg-[#f8faf9] border border-[#e6e8e7] p-0.5 rounded-[6px] overflow-x-auto hide-scrollbar self-start sm:self-auto max-w-full">
                        {(['Excellent', 'Good', 'Fair', 'Needs Repair', 'Damaged', 'Not Applicable'] as const).map(rate => (
                          <button
                            key={rate}
                            onClick={() => { saveItemRating(item.id, rate); updateRoomStatus(activeRoom.id, 'Completed'); }}
                            className={`px-3 py-1.5 rounded-[4px] text-[10px] font-black transition-all whitespace-nowrap cursor-pointer ${item.rating === rate ? 'bg-[#22333b] text-white' : 'text-[#5e503f] hover:text-[#22333b]'}`}
                          >
                            {rate === 'Not Applicable' ? 'N/A' : rate === 'Needs Repair' ? 'Repair' : rate}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Photo Upload Section */}
                <div className="bg-white border border-[#e6e8e7] rounded-[8px] p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[#22333b] font-display flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#a9927d]" /> Photos & Visual Proof
                  </h3>
                  
                  {/* Photo Grid */}
                  {activeRoomPhotos.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                      {activeRoomPhotos.map(p => (
                        <div key={p.id} className="relative group aspect-square rounded-[6px] overflow-hidden border border-[#e6e8e7]">
                          <img src={p.photo_url} alt="Room detail" className="w-full h-full object-cover" />
                          <button
                            onClick={() => handleDeletePhoto(p.id)}
                            className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1 shadow-md opacity-80 hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#e6e8e7] hover:border-[#a9927d] rounded-[8px] p-6 cursor-pointer bg-[#f8faf9] transition-all">
                    <Upload className="w-6 h-6 text-[#a9927d] mb-2" />
                    <span className="text-xs font-bold text-[#22333b]">Upload Room Photo</span>
                    <span className="text-[10px] text-[#a9927d]">PNG or JPEG format</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>

                {/* Defects/Issues logger */}
                <div className="bg-white border border-[#e6e8e7] rounded-[8px] p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[#22333b] font-display flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" /> Log Issues & Defects
                  </h3>

                  {activeRoomDefects.length > 0 && (
                    <div className="space-y-2">
                      {activeRoomDefects.map(d => (
                        <div key={d.id} className="flex items-center justify-between p-3 bg-red-50/50 border border-red-100 rounded-[6px]">
                          <div>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mb-1 ${d.severity === 'Urgent' ? 'bg-red-200 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                              {d.severity}
                            </span>
                            <p className="text-xs text-[#22333b] font-semibold">{d.notes}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteDefect(d.id)}
                            className="text-[#a9927d] hover:text-red-600 transition-colors p-1.5"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleAddDefect} className="space-y-3">
                    <textarea
                      placeholder="Add defect notes (e.g., crack on wall, loose window latch)..."
                      value={defectNotes}
                      onChange={e => setDefectNotes(e.target.value)}
                      className="w-full bg-[#f8faf9] border border-[#e6e8e7] rounded-[8px] p-3 text-xs focus:ring-2 focus:ring-[#22333b]/20 focus:border-[#22333b] outline-none transition-all resize-none h-20"
                    />

                    <div className="flex gap-2 items-center justify-between">
                      <div className="flex bg-[#f8faf9] border border-[#e6e8e7] p-0.5 rounded-[6px] overflow-hidden">
                        {(['Minor', 'Moderate', 'Major', 'Urgent'] as const).map(sev => (
                          <button
                            type="button"
                            key={sev}
                            onClick={() => setDefectSeverity(sev)}
                            className={`px-3 py-1.5 rounded-[4px] text-[10px] font-black transition-all cursor-pointer ${defectSeverity === sev ? 'bg-[#22333b] text-white' : 'text-[#5e503f] hover:text-[#22333b]'}`}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                      <button
                        type="submit"
                        disabled={!defectNotes.trim()}
                        className="bg-[#22333b] text-white px-4 py-2 rounded-[8px] text-xs font-bold hover:bg-[#111a1e] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Add Issue
                      </button>
                    </div>
                  </form>
                </div>

                {/* Bottom Navigation */}
                <div className="flex justify-between items-center pt-4">
                  <button
                    onClick={() => setActiveRoomIndex(prev => Math.max(0, prev - 1))}
                    disabled={activeRoomIndex === 0}
                    className="bg-white border border-[#e6e8e7] text-[#22333b] px-4 py-2.5 rounded-[8px] text-xs font-bold hover:border-[#a9927d] transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous Room
                  </button>
                  <button
                    onClick={() => setActiveRoomIndex(prev => Math.min(totalRooms, prev + 1))}
                    className="bg-[#22333b] text-white px-4 py-2.5 rounded-[8px] text-xs font-bold hover:bg-[#111a1e] transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {activeRoomIndex === totalRooms - 1 ? 'Go to Summary' : 'Next Room'} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              // SUMMARY SCREEN
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto space-y-6"
              >
                <div className="bg-white border border-[#e6e8e7] rounded-[8px] p-6 shadow-sm">
                  <h2 className="text-xl font-black text-[#22333b] font-display mb-1">Inspection Summary & Review</h2>
                  <p className="text-xs text-[#a9927d] font-bold">Please check all details before finalizing report.</p>
                </div>

                {/* KPI stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-[#e6e8e7] rounded-[8px] p-4 text-center">
                    <span className="block text-[10px] font-bold text-[#a9927d] uppercase tracking-wider mb-1">Rooms</span>
                    <span className="text-lg font-black text-[#22333b]">{completedRooms} / {totalRooms}</span>
                  </div>
                  <div className="bg-white border border-[#e6e8e7] rounded-[8px] p-4 text-center">
                    <span className="block text-[10px] font-bold text-[#a9927d] uppercase tracking-wider mb-1">Defects Logged</span>
                    <span className="text-lg font-black text-red-600">{defects.length}</span>
                  </div>
                  <div className="bg-white border border-[#e6e8e7] rounded-[8px] p-4 text-center">
                    <span className="block text-[10px] font-bold text-[#a9927d] uppercase tracking-wider mb-1">Photos Taken</span>
                    <span className="text-lg font-black text-blue-600">{photos.length}</span>
                  </div>
                  <div className="bg-white border border-[#e6e8e7] rounded-[8px] p-4 text-center">
                    <span className="block text-[10px] font-bold text-[#a9927d] uppercase tracking-wider mb-1">Status</span>
                    <span className="text-lg font-black text-emerald-600">{report.status}</span>
                  </div>
                </div>

                {/* Review Room checklist */}
                <div className="bg-white border border-[#e6e8e7] rounded-[8px] shadow-sm divide-y divide-[#e6e8e7] overflow-hidden">
                  {rooms.map(r => {
                    const roomDefectsCount = defects.filter(d => d.room_id === r.id).length;
                    return (
                      <div key={r.id} className="p-4 flex items-center justify-between">
                        <span className="text-xs font-bold text-[#22333b]">{r.name}</span>
                        <div className="flex items-center gap-2">
                          {roomDefectsCount > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">
                              {roomDefectsCount} defects
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                              All Clean
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Digital Signature Pads */}
                <div className="bg-white border border-[#e6e8e7] rounded-[8px] p-5 shadow-sm space-y-6">
                  <h3 className="text-sm font-bold text-[#22333b] font-display flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#a9927d]" /> Capture Signatures
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Manager Signature */}
                    <div className="space-y-2">
                      <span className="block text-xs font-bold text-[#22333b]">Property Manager Signature</span>
                      {signatureManager ? (
                        <div className="bg-slate-50 border border-dashed border-[#e6e8e7] rounded-[8px] p-4 text-center">
                          <img src={signatureManager} alt="Manager signature" className="mx-auto max-h-16 object-contain" />
                          <button onClick={() => setSignatureManager(null)} className="text-xs text-red-600 font-bold mt-2">Clear Signature</button>
                        </div>
                      ) : (
                        <div className="border border-[#e6e8e7] rounded-[8px] overflow-hidden">
                          <SignaturePad onSign={(sig) => setSignatureManager(sig)} />
                        </div>
                      )}
                    </div>

                    {/* Tenant Signature */}
                    <div className="space-y-2">
                      <span className="block text-xs font-bold text-[#22333b]">Tenant Signature (Acknowledgment)</span>
                      {signatureTenant ? (
                        <div className="bg-slate-50 border border-dashed border-[#e6e8e7] rounded-[8px] p-4 text-center">
                          <img src={signatureTenant} alt="Tenant signature" className="mx-auto max-h-16 object-contain" />
                          <button onClick={() => setSignatureTenant(null)} className="text-xs text-red-600 font-bold mt-2">Clear Signature</button>
                        </div>
                      ) : (
                        <div className="border border-[#e6e8e7] rounded-[8px] overflow-hidden">
                          <SignaturePad onSign={(sig) => setSignatureTenant(sig)} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Final Submission Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveRoomIndex(totalRooms - 1)}
                    className="flex-1 bg-white border border-[#e6e8e7] text-[#22333b] py-3.5 rounded-[8px] text-sm font-bold hover:border-[#a9927d] transition-all cursor-pointer text-center"
                  >
                    Back to Inspection
                  </button>

                  <button
                    onClick={saveSignatures}
                    disabled={isSubmitting || !signatureManager}
                    className="flex-1 bg-[#22333b] text-white py-3.5 rounded-[8px] text-sm font-bold hover:bg-[#111a1e] transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isSubmitting ? 'Saving...' : 'Finalize & Save'}
                  </button>

                  {report.status === 'Completed' && (
                    <button
                      onClick={generatePDFReport}
                      className="flex-1 bg-emerald-600 text-white py-3.5 rounded-[8px] text-sm font-bold hover:bg-emerald-700 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                    >
                      <FileText className="w-4 h-4" /> Download PDF
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
}
