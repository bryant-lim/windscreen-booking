'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  LogOut, 
  ExternalLink,
  ChevronRight,
  Filter,
  Activity,
  CarFront,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  History
} from 'lucide-react';
import Header from '../../components/Header';

interface BranchSession {
  id: string;
  code: string;
  name: string;
}

export default function BranchDashboard() {
  const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1338';
  const [session, setSession] = useState<BranchSession | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusTab, setFocusTab] = useState<'Today' | 'Tomorrow' | 'Upcoming' | 'Total Completed'>('Today');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 0. Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Session & Auth Guard
  useEffect(() => {
    const savedSession = sessionStorage.getItem('ws2u_branch_session');
    if (!savedSession) {
      window.location.href = '/branch-login';
      return;
    }
    setSession(JSON.parse(savedSession));
  }, []);

  // 2. Data Fetching (Full Queue for Branch)
  const fetchBranchBookings = async () => {
    if (!session) return;
    try {
      setIsLoading(true);
      console.log("🛠️ Fetching for branch command center:", session.name);
      
      const res = await fetch(`${STRAPI_URL}/api/bookings?filters[BranchName][BranchName][$eq]=${encodeURIComponent(session.name)}&sort[0]=AppointmentDate:asc&sort[1]=AppointmentTime:asc&populate[0]=InsuranceFile&populate[1]=BranchName`);
      const data = await res.json();
      
      if (data.data) {
        setBookings(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch shop queue:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchBranchBookings();
  }, [session]);

  const handleUpdateStatus = async (bookingId: string | number, newStatus: string, documentId?: string) => {
    const targetId = documentId || bookingId;
    setIsUpdating(String(targetId));
    
    try {
      const res = await fetch(`${STRAPI_URL}/api/bookings/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { Status: newStatus } })
      });
      
      if (res.ok) {
        setBookings(prev => prev.map(b => (
          (b.documentId === targetId || b.id === targetId) 
          ? { ...b, attributes: { ...b.attributes || b, Status: newStatus }, Status: newStatus } 
          : b
        )));
      }
    } catch (err) {
      console.error("Status update crashed:", err);
    } finally {
      setIsUpdating(null);
    }
  };

  // 3. Focus Categorization Logic (With Singular Identity Rule)
  const categorized = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split('T')[0];

    // IN PROGRESS Jobs always go to the PINNED section only
    const active = bookings.filter(b => (b.attributes?.Status || b.Status) === 'In Progress');
    const nonActive = bookings.filter(b => (b.attributes?.Status || b.Status) !== 'In Progress');

    return {
      active,
      today: nonActive.filter(b => {
        const d = (b.attributes?.AppointmentDate || b.AppointmentDate);
        const s = (b.attributes?.Status || b.Status);
        return d === today && s === 'Confirmed';
      }),
      tomorrow: nonActive.filter(b => {
        const d = (b.attributes?.AppointmentDate || b.AppointmentDate);
        const s = (b.attributes?.Status || b.Status);
        return d === tomorrow && s === 'Confirmed';
      }),
      upcoming: nonActive.filter(b => {
        const d = (b.attributes?.AppointmentDate || b.AppointmentDate);
        const s = (b.attributes?.Status || b.Status);
        return d > tomorrow && s === 'Confirmed';
      }),
      archive: bookings.filter(b => (b.attributes?.Status || b.Status) === 'Completed'),
      todayCompleted: bookings.filter(b => {
        const d = (b.attributes?.AppointmentDate || b.AppointmentDate);
        const s = (b.attributes?.Status || b.Status);
        return d === today && s === 'Completed';
      })
    };
  }, [bookings]);

  const displayedList = useMemo(() => {
    let list: any[] = [];
    if (focusTab === 'Today') list = categorized.today;
    else if (focusTab === 'Tomorrow') list = categorized.tomorrow;
    else if (focusTab === 'Upcoming') list = categorized.upcoming;
    else if (focusTab === 'Total Completed') list = categorized.archive;

    if (!searchQuery) return list;
    return list.filter(b => {
      const attrs = b.attributes || b;
      return (attrs.CarPlateNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
             (attrs.DriverName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
             (attrs.ReferenceNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    });
  }, [focusTab, categorized, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-blue-50 text-blue-600 border-blue-100 ring-2 ring-blue-500/5';
      case 'In Progress': return 'bg-orange-50 text-orange-600 border-orange-100 ring-4 ring-orange-500/5 animate-pulse';
      case 'Completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  if (!session) return null;

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col font-inter text-slate-900 pb-20">

      {/* Industrial Sub-Header */}
      <div className="bg-[#f97316] text-white py-12 md:py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-3">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Operations Hub • Live</p>
             </div>
             <h1 className="text-3xl md:text-5xl font-black tracking-tighter">
               {session.name.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
             </h1>
             <p className="text-xs font-bold opacity-70 tracking-widest uppercase text-emerald-400">Branch Code: {session.code}</p>
          </div>
          
          <div className="flex flex-col items-end gap-3 translate-y-2">
            <button 
                onClick={() => { sessionStorage.clear(); window.location.href='/branch-login'; }}
                className="flex items-center gap-2 bg-white/10 hover:bg-orange-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all mb-1 border border-white/10 hover:border-orange-500"
            >
                <LogOut className="w-4 h-4" /> Sign Out
            </button>

            <div className="bg-black/20 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl flex flex-col items-end min-w-[200px]">
               <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Current Date & Time</p>
               <p className="text-xl font-black tabular-nums tracking-tight">
                  {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
               </p>
               <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1">
                  {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
               </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-6 -mt-10 space-y-8">
        
        {/* Statistics Bar (Industrial Scan) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           {[
             { label: 'In Replacement', val: categorized.active.length, icon: CarFront, color: 'text-orange-500' },
             { label: 'Due Today', val: categorized.today.length, icon: Clock, color: 'text-blue-500' },
             { label: 'Incoming', val: categorized.tomorrow.length, icon: Calendar, color: 'text-indigo-400' },
             { label: 'Logged Today', val: categorized.todayCompleted.length, icon: CheckCircle2, color: 'text-emerald-500' }
           ].map((stat, i) => (
             <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl flex items-center justify-between group">
                <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                   <p className={`text-2xl font-black tabular-nums ${stat.color}`}>{stat.val}</p>
                </div>
                <stat.icon className={`w-8 h-8 opacity-10 group-hover:opacity-100 transition-opacity ${stat.color}`} />
             </div>
           ))}
        </div>

        {/* --- THE FOCUS SELECTOR (Context Tabs) --- */}
        <div className="bg-white p-2 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-wrap md:flex-nowrap gap-2">
           {[
             { id: 'Today', icon: CarFront, count: categorized.today.length },
             { id: 'Tomorrow', icon: Calendar, count: categorized.tomorrow.length },
             { id: 'Upcoming', icon: History, count: categorized.upcoming.length },
             { id: 'Total Completed', icon: CheckCircle2, count: categorized.archive.length }
           ].map((tab) => (
             <button
               key={tab.id}
               onClick={() => setFocusTab(tab.id as any)}
               className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-3xl transition-all duration-300 group ${
                 focusTab === tab.id 
                 ? 'bg-[#f97316] text-white shadow-2xl shadow-blue-500/20 active:scale-95' 
                 : 'hover:bg-slate-50 text-slate-400'
               }`}
             >
               <tab.icon className={`w-4 h-4 ${focusTab === tab.id ? 'opacity-100' : 'opacity-40'}`} />
               <span className="text-[10px] font-black uppercase tracking-widest">{tab.id}</span>
               <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                 focusTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
               }`}>{tab.count}</span>
             </button>
           ))}
        </div>

        {/* Search Bar (High Visibility) */}
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#f97316] transition-colors" />
          <input 
            type="text" 
            placeholder="Search by Car Plate / Driver Name / Ref ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-[2rem] pl-16 pr-6 py-6 font-black text-[#f97316] text-sm shadow-xl focus:ring-4 focus:ring-blue-500/5 outline-none"
          />
        </div>

        {/* --- THE PINNED RACK --- */}
        {categorized.active.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2 px-2">
               <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
               <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">Live In Replacement</p>
            </div>
            {categorized.active.map((b) => renderJobCard(b, true))}
          </div>
        )}

        {/* --- THE FOCUS DECK --- */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{focusTab === 'Total Completed' ? 'History' : focusTab}</p>
          </div>
          {isLoading ? (
            <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin text-[#f97316] mx-auto opacity-20" /></div>
          ) : displayedList.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100 text-slate-300 font-bold text-sm tracking-widest">No Entries For This Period</div>
          ) : (
            displayedList.map((b) => renderJobCard(b))
          )}
        </div>
      </div>
    </main>
  );

  function renderJobCard(b: any, isPinned = false) {
    const attrs = b.attributes || b;
    const vehicle = attrs.VehicleDetailsJSON || {};
    const date = new Date(attrs.AppointmentDate);
    const isCompleted = attrs.Status === 'Completed';

    return (
      <div key={b.id} className={`group bg-white rounded-[2rem] border ${isPinned ? 'border-orange-200 shadow-orange-500/10' : 'border-slate-100'} p-6 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden relative`}>
        
        {/* Pulse Indicator */}
        {attrs.Status === 'In Progress' && (
           <div className="absolute top-0 right-0 p-4">
              <div className="flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                 <Loader2 className="w-3 h-3 text-orange-500 animate-spin" />
                 <span className="text-[8px] font-black text-orange-600 uppercase tracking-widest">In Replacement</span>
              </div>
           </div>
        )}

        <div className="flex flex-col md:flex-row gap-8 items-center justify-between relative z-10">
          
          <div className="flex items-center gap-6 md:w-1/4 shrink-0">
             <div className={`${isPinned ? 'bg-orange-500' : 'bg-[#f97316]'} px-6 py-5 rounded-2xl flex flex-col items-center justify-center shadow-xl min-w-[140px] transition-colors`}>
                <p className="text-xl font-black text-white tracking-[0.1em]">{attrs.CarPlateNumber}</p>
             </div>
             <div className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] border ${getStatusColor(attrs.Status)}`}>
                {attrs.Status === 'In Progress' ? 'Active' : attrs.Status}
             </div>
          </div>

          <div className="flex-1 space-y-2 overflow-hidden w-full md:w-auto">
             <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">#{attrs.ReferenceNumber}</span>
                <span className="text-[9px] font-black text-slate-300">•</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{attrs.DriverName}</span>
                
                {(() => {
                   const ins = attrs.InsuranceFile?.data || attrs.InsuranceFile;
                   const files = Array.isArray(ins) ? ins : (ins ? [ins] : []);
                   if (files.length === 0) return null;
                   
                   return (
                     <div className="flex gap-1 ml-4 py-1.5 px-3 bg-blue-50 rounded-full border border-blue-100">
                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest mr-1">Policy:</span>
                        {files.map((f, idx) => {
                          const fileAttrs = f.attributes || f;
                          return (
                            <a 
                              key={f.id} 
                              href={`${STRAPI_URL}${fileAttrs.url}`} 
                              target="_blank" 
                              className="w-5 h-5 flex items-center justify-center bg-white text-blue-600 text-[9px] font-black rounded-md border border-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            >
                              {idx + 1}
                            </a>
                          )
                        })}
                     </div>
                   );
                })()}
             </div>
             <h4 className="text-sm font-black text-[#f97316] uppercase tracking-tight truncate leading-tight">
                {vehicle?.year} {vehicle?.make} {vehicle?.model}
             </h4>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight truncate">
                {vehicle?.part} {vehicle?.spec ? `(${vehicle?.spec})` : ''}
             </p>
             <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-1.5">
                   <Clock className="w-3 h-3 text-slate-300" />
                   <span className="text-[10px] font-black text-slate-500">
                     {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {attrs.AppointmentTime?.slice(0, 5)}
                   </span>
                </div>
             </div>
          </div>

          <div className="md:w-1/4 flex gap-2 w-full shrink-0">
             {attrs.Status === 'Confirmed' && (
               <button 
                 onClick={() => handleUpdateStatus(b.id, 'In Progress', b.documentId)}
                 disabled={isUpdating === String(b.documentId || b.id)}
                 className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
               >
                 {isUpdating === String(b.documentId || b.id) ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Start Job ➔'}
               </button>
             )}
             {attrs.Status === 'In Progress' && (
               <button 
                 onClick={() => handleUpdateStatus(b.id, 'Completed', b.documentId)}
                 disabled={isUpdating === String(b.documentId || b.id)}
                 className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
               >
                 {isUpdating === String(b.documentId || b.id) ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Complete Job ✓'}
               </button>
             )}
             {isCompleted && (
               <div className="flex-1 py-4 text-center text-slate-300 font-bold text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                 <CheckCircle2 className="w-3 h-3" /> System Logged
               </div>
             )}
          </div>
        </div>
      </div>
    );
  }
}
