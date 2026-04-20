'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, CalendarDays, MapPin, Clock, FileUp, 
  Trash2, Loader2, CheckCircle2, AlertCircle, Save 
} from 'lucide-react';
import Combobox from './Combobox';
import Calendar from './Calendar';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1338';

interface ManageBookingDrawerProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ManageBookingDrawer({ 
  booking, 
  isOpen, 
  onClose, 
  onUpdate 
}: ManageBookingDrawerProps) {
  const b = booking?.attributes || booking;
  
  // Local Form State
  const [formData, setFormData] = useState({
    branch: '',
    date: '',
    time: '',
    newFiles: [] as File[],
    existingFiles: [] as any[] // [{id: 1, url: '...'}]
  });

  const [branchList, setBranchList] = useState<string[]>([]);
  const [branchRaw, setBranchRaw] = useState<any[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [blockedDays, setBlockedDays] = useState<string[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Initialize
  useEffect(() => {
    if (isOpen && booking) {
      const curBranch = b.BranchName?.data?.attributes?.BranchName || b.BranchName?.BranchName || b.BranchName || '';
      const curFiles = b.InsuranceFile?.data || (Array.isArray(b.InsuranceFile) ? b.InsuranceFile : []);
      
      setFormData({
        branch: curBranch,
        date: b.AppointmentDate || '',
        time: (b.AppointmentTime || '').slice(0, 5),
        newFiles: [],
        existingFiles: curFiles.map((f: any) => ({
          id: f.id,
          url: f.attributes?.url || f.url,
          name: f.attributes?.name || f.name || 'document'
        }))
      });
      setSuccess(false);
      setError('');
      fetchBranches();
    }
  }, [isOpen, booking]);

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${STRAPI_URL}/api/branch-datas`);
      const data = await res.json();
      const list = (data.data || []).map((b: any) => b.BranchName || b.attributes?.BranchName);
      setBranchList(list);
      setBranchRaw(data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (formData.branch && branchRaw.length > 0) {
       const selected = branchRaw.find(br => (br.attributes?.BranchName || br.BranchName) === formData.branch);
       if (selected) {
          const attr = selected.attributes || selected;
          setAvailableTimes((attr.TimeSlots || '').split(',').map((s: any) => s.trim()).filter(Boolean));
          setBlockedDays((attr.ClosedDaysOfWeek || '').split(',').map((s: any) => s.trim()).filter(Boolean));
          setBlockedDates((attr.SpecificClosedDates || '').split(',').map((s: any) => {
             const t = s.trim(); if (!t.includes('-')) return null;
             const parts = t.split('-');
             if (parts.length !== 3) return null;
             // If already YYYY-MM-DD
             if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
             // Otherwise assume DD-MM-YYYY
             const [d, m, y] = parts;
             return (d && m && y) ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : null;
          }).filter(Boolean) as string[]);
       }
    }
  }, [formData.branch, branchRaw]);

  // Forensic Occupancy Filter
  const [bookingsOnDay, setBookingsOnDay] = useState<any[]>([]);
  useEffect(() => {
    if (formData.branch && formData.date && branchRaw.length > 0) {
      fetchOccupancy();
    }
  }, [formData.branch, formData.date, branchRaw]);

  const fetchOccupancy = async () => {
    setFetchingSlots(true);
    try {
      const selected = branchRaw.find(br => (br.attributes?.BranchName || br.BranchName) === formData.branch);
      if (!selected) return;
      const res = await fetch(`${STRAPI_URL}/api/bookings?filters[BranchName][id][$eq]=${selected.id}&filters[AppointmentDate][$eq]=${formData.date}&filters[Status][$eq]=Confirmed`);
      const data = await res.json();
      setBookingsOnDay(data.data || []);
    } catch (e) { console.error(e); }
    setFetchingSlots(false);
  };

  const isSlotTaken = (t: string) => {
    // CURRENT booking's slot is NOT taken (can re-select it)
    if (formData.date === b.AppointmentDate && t === (b.AppointmentTime || '').slice(0, 5)) return false;
    
    return bookingsOnDay.some(bk => {
       const bAttr = bk.attributes || bk;
       const bkTimeNorm = (bAttr.AppointmentTime || '').slice(0, 5);
       return bkTimeNorm === t;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.size <= 5 * 1024 * 1024);
    setFormData(prev => ({ ...prev, newFiles: [...prev.newFiles, ...files] }));
  };

  const removeExistingFile = (id: number) => {
    setFormData(prev => ({
      ...prev,
      existingFiles: prev.existingFiles.filter(f => f.id !== id)
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Resolve branch ID
      const selectedBranch = branchRaw.find(br => (br.attributes?.BranchName || br.BranchName) === formData.branch);
      if (!selectedBranch) throw new Error('Invalid branch selected');

      // 2. Upload new files if any
      let finalFileIds = formData.existingFiles.map(f => f.id);
      if (formData.newFiles.length > 0) {
        const uploadForm = new FormData();
        formData.newFiles.forEach(f => uploadForm.append('files', f));
        const upRes = await fetch(`${STRAPI_URL}/api/upload`, { method: 'POST', body: uploadForm });
        const upData = await upRes.json();
        const newIds = (Array.isArray(upData) ? upData : []).map((f: any) => f.id);
        finalFileIds = [...finalFileIds, ...newIds];
      }

      // 3. Update Booking
      const payload: any = {
        data: {
          BranchName: { id: selectedBranch.id },
          AppointmentDate: formData.date,
          AppointmentTime: `${formData.time}:00.000`,
          InsuranceFile: finalFileIds.map(id => ({ id }))
        }
      };

      const updateRes = await fetch(`${STRAPI_URL}/api/bookings/${booking.documentId || booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!updateRes.ok) throw new Error('Failed to update booking');
      
      setSuccess(true);
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1500);
    } catch (e: any) {
      setError(e.message || 'An error occurred');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden font-inter">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* Drawer */}
      <div className="absolute top-0 right-0 w-full max-w-lg h-full bg-white shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto custom-scrollbar flex flex-col">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <div>
            <h2 className="text-xl font-black text-primary tracking-tight">Manage Appointment</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ref: {b.ReferenceNumber}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex-1 space-y-10 pb-32">
          
          {/* Section 1: Branch */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-primary ml-1">
                <MapPin className="w-3.5 h-3.5" />
                <label className="text-[11px] font-black capitalize tracking-wide">Change Branch</label>
             </div>
             <Combobox 
               options={branchList} 
               value={formData.branch} 
               onChange={(v) => setFormData(prev => ({...prev, branch: v, time: ''}))} 
               placeholder="Select Branch" 
               emptyMessage="No branches found"
             />
          </div>

          {/* Section 2: Date & Time */}
          <div className="space-y-6">
             <div className="flex items-center gap-2 text-primary ml-1">
                <CalendarDays className="w-3.5 h-3.5" />
                <label className="text-[11px] font-black capitalize tracking-wide">Reschedule Date & Time</label>
             </div>
             
             <div className="grid grid-cols-1 gap-6">
                <Calendar 
                  selectedDate={formData.date} 
                  onSelectDate={(d) => setFormData(prev => ({...prev, date: d, time: ''}))}
                  blockedDaysOfWeek={blockedDays}
                  blockedSpecificDates={blockedDates}
                />
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary/60 ml-1">
                    <Clock className="w-3.5 h-3.5" />
                    <label className="text-[10px] font-bold capitalize">Available Slots</label>
                  </div>
                  
                  {fetchingSlots ? (
                    <div className="p-10 flex flex-col items-center justify-center space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200 opacity-50">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-[9px] font-bold text-primary/40 uppercase tracking-widest">Checking Slots...</span>
                    </div>
                  ) : availableTimes.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                       {availableTimes.map((t) => {
                         const taken = isSlotTaken(t);
                         return (
                           <button 
                             key={t}
                             disabled={taken}
                             onClick={() => setFormData(prev => ({...prev, time: t}))}
                             className={`p-3 border rounded-2xl text-[10px] font-black transition-all ${taken ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50' : formData.time === t ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20' : 'bg-white border-slate-100 text-slate-500 hover:border-accent/30'}`}
                           >
                             <span className={taken ? 'line-through' : ''}>{t}</span>
                           </button>
                         );
                       })}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 capitalize">Please select a date to view available slots</p>
                    </div>
                  )}
                </div>
             </div>
          </div>

          {/* Section 3: Documents */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary ml-1">
              <FileUp className="w-3.5 h-3.5" />
              <label className="text-[11px] font-black capitalize tracking-wide">Manage Documents</label>
            </div>
            
            <div className="space-y-4">
               {/* Existing Files */}
               <div className="flex flex-wrap gap-2">
                 {formData.existingFiles.map((file) => (
                   <div key={file.id} className="group relative">
                      <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-primary flex items-center gap-2">
                         <span className="truncate max-w-[100px]">{file.name}</span>
                         <button 
                           onClick={() => removeExistingFile(file.id)}
                           className="text-red-400 hover:text-red-500 transition-colors"
                         >
                            <Trash2 className="w-3.5 h-3.5" />
                         </button>
                      </div>
                   </div>
                 ))}
                 
                 {formData.newFiles.map((file, i) => (
                   <div key={i} className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] font-bold text-emerald-600 flex items-center gap-2">
                      <span className="truncate max-w-[100px]">{file.name}</span>
                      <button onClick={() => setFormData(prev => ({...prev, newFiles: prev.newFiles.filter((_, idx) => idx !== i)}))}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                   </div>
                 ))}
               </div>

               <label className="w-full border-2 border-dashed border-primary/20 p-8 rounded-[30px] flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all">
                  <FileUp className="w-6 h-6 text-primary/20 mb-2" />
                  <span className="text-[10px] font-black text-primary/40 uppercase tracking-widest">Update Documents</span>
                  <input type="file" multiple className="hidden" onChange={handleFileUpload} />
               </label>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-slate-100 bg-white sticky bottom-0 z-10">
          {error && <p className="mb-4 text-[10px] text-red-500 font-bold flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
          {success && <p className="mb-4 text-[10px] text-emerald-600 font-black flex items-center gap-2 animate-bounce"><CheckCircle2 className="w-4 h-4" /> Changes saved successfully!</p>}
          
          <button 
            onClick={handleSave}
            disabled={loading || !formData.time || success}
            className={`w-full py-4 bg-primary text-white rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all ${loading || !formData.time ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent hover:scale-[1.01]'}`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4" />}
            {loading ? 'Saving Changes...' : 'Save & Confirm'}
          </button>
        </div>

      </div>
    </div>
  );
}
