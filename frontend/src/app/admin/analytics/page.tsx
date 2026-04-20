'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  ShieldCheck, 
  Activity, 
  CarFront, 
  Loader2,
  Lock,
  ArrowLeft,
  RefreshCcw,
  LayoutDashboard,
  Download,
  Calendar,
  Search,
  Filter
} from 'lucide-react';

export default function AdminAnalytics() {
  const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1338';
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // --- FILTER STATES ---
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [makeFilter, setMakeFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');

  // --- THE AUTH GUARD ---
  const verifyStrapiAuth = () => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');

    if (urlToken) {
      localStorage.setItem('jwtToken', urlToken);
      setIsAuthorized(true);
      return;
    }

    const token = localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken');
    
    if (token) {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
  };

  const fetchAllStats = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${STRAPI_URL}/api/bookings?populate=*&pagination[limit]=1000`);
      const json = await res.json();
      if (json.data) setData(json.data);
    } catch (err) {
      console.error("Master Analytics Fetch Failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    verifyStrapiAuth();
    fetchAllStats();
  }, []);

  useEffect(() => {
    if (isAuthorized === false && !isLoading) {
      window.location.href = `${STRAPI_URL}/admin`;
    }
  }, [isAuthorized, isLoading]);

  // --- DYNAMIC DATA FOR DROPDOWNS (NORMALIZED) ---
  const makes = useMemo(() => {
    const unique = new Set(data.map(i => {
      const m = (i.attributes || i).VehicleDetailsJSON?.make;
      return m ? m.toUpperCase().trim() : null;
    }).filter(Boolean));
    return Array.from(unique).sort() as string[];
  }, [data]);

  const models = useMemo(() => {
    const filteredForModels = makeFilter 
      ? data.filter(i => {
          const m = (i.attributes || i).VehicleDetailsJSON?.make;
          return m && m.toUpperCase().trim() === makeFilter.toUpperCase().trim();
        }) 
      : data;
    const unique = new Set(filteredForModels.map(i => {
      const m = (i.attributes || i).VehicleDetailsJSON?.model;
      return m ? m.toUpperCase().trim() : null;
    }).filter(Boolean));
    return Array.from(unique).sort() as string[];
  }, [data, makeFilter]);

  const analytics = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const stats: any = {
      branchStats: {} as Record<string, { totalYear: number, completedTotal: number }>,
      inventoryHotList: [] as any[],
      totalConfirmedCount: 0
    };

    const modelTracker: Record<string, { count: number, make: string, model: string, part: string, spec: string }> = {};

    data.forEach(item => {
      const b = item.attributes || item;
      const vehicle = b.VehicleDetailsJSON || {};
      const apptDate = b.AppointmentDate;
      const apptDateTime = apptDate ? new Date(apptDate).getTime() : 0;
      const status = (b.Status || b.attributes?.Status);

      // --- APPLY GLOBAL ANALYTICS LOGIC ---
      const branchRel = b.BranchName?.data?.attributes?.BranchName;
      const branchStr = b.BranchName?.BranchName;
      const branch = branchRel || branchStr || 'Central/Unassigned';
      
      if (!stats.branchStats[branch]) {
        stats.branchStats[branch] = { totalYear: 0, completedTotal: 0 };
      }
      
      const isThisYear = apptDate && new Date(apptDate).getFullYear() === currentYear;
      if (isThisYear) stats.branchStats[branch].totalYear++;
      if (status === 'Completed') stats.branchStats[branch].completedTotal++;
      if (['Confirmed', 'In Progress', 'Completed'].includes(status)) stats.totalConfirmedCount++;

      // --- APPLY FILTERS (NORMALIZED CASE) ---
      const vMake = (vehicle.make || '').toUpperCase().trim();
      const vModel = (vehicle.model || '').toUpperCase().trim();
      const fMake = makeFilter.toUpperCase().trim();
      const fModel = modelFilter.toUpperCase().trim();

      const matchesMake = !makeFilter || vMake === fMake;
      const matchesModel = !modelFilter || vModel === fModel;
      const matchesStart = !startDate || (apptDateTime >= new Date(startDate).getTime());
      const matchesEnd = !endDate || (apptDateTime <= new Date(endDate).getTime());

      if (matchesMake && matchesModel && matchesStart && matchesEnd && vModel) {
        const key = `${vMake}-${vModel}-${vehicle.part}-${vehicle.spec || ''}`;
        if (!modelTracker[key]) {
           modelTracker[key] = {
             count: 0,
             make: vMake,
             model: vModel,
             part: vehicle.part,
             spec: vehicle.spec || 'Standard'
           };
        }
        modelTracker[key].count++;
      }
    });

    const branchTable = Object.entries(stats.branchStats)
      .map(([name, s]: [string, any]) => ({ name, ...s }))
      .sort((a,b) => b.totalYear - a.totalYear)
      .slice(0, 10);

    const inventoryData = Object.values(modelTracker).sort((a,b) => b.count - a.count);

    return { branchTable, inventoryData, totalConfirmedCount: stats.totalConfirmedCount };
  }, [data, makeFilter, modelFilter, startDate, endDate]);

  const downloadCSV = () => {
    const headers = ["Rank", "Vehicle Make", "Vehicle Model", "Part Name", "Specifications", "Quantity"];
    const rows = analytics.inventoryData.map((d, i) => [
      i + 1,
      d.make,
      d.model,
      d.part,
      d.spec,
      d.count
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.style.display = 'none';
    link.href = url;
    link.download = `parts_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading || isAuthorized === null) return (
     <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f] opacity-20" />
     </div>
  );

  if (isAuthorized === false) return (
    <div className="min-h-screen bg-[#1e3a5f] flex flex-col items-center justify-center text-white p-6">
       <div className="w-24 h-24 bg-white/5 border border-white/10 flex items-center justify-center rounded-[2.5rem] mb-8">
          <Lock className="w-10 h-10 text-orange-500" />
       </div>
       <h1 className="text-4xl font-black uppercase tracking-tighter mb-2 text-center">Restricted Operations</h1>
       <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] text-center">Login via the WS2U Admin Portal</p>
       <a href={`${STRAPI_URL}/admin`} className="px-10 py-5 bg-white text-[#1e3a5f] rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-orange-500 hover:text-white mt-12 transition-all active:scale-95 flex items-center gap-3 group">
          Back to Admin Portal <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
       </a>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#fafbfc] font-inter text-slate-900 pb-20 text-sm">

      {/* HERO SECTION */}
      <div className="bg-white border-b border-slate-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tighter leading-none text-[#1e3a5f]">Analytics</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Operational Performance Insight</p>
           </div>
           
           <div className="flex items-center gap-4">
              <a 
                 href={`${STRAPI_URL}/admin`}
                 className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#1e3a5f] px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 group shadow-sm active:scale-95"
              >
                 <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Back to Admin
              </a>

              <button 
                 onClick={fetchAllStats}
                 className="bg-[#1e3a5f] hover:bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center gap-2"
              >
                 <RefreshCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-6 mt-12 space-y-12">
         
         {/* Most Replaced Parts (Full Width) */}
         <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
               <div className="space-y-1">
                  <h3 className="text-2xl font-black tracking-tighter text-[#1e3a5f] uppercase leading-none">Most Replaced Parts</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory Demand Analysis</p>
               </div>
               
               <button 
                  onClick={downloadCSV}
                  className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 border border-emerald-100"
               >
                  <Download className="w-3.5 h-3.5" /> Export to CSV
               </button>
            </div>

            {/* FILTER BAR */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100">
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                  <div className="relative">
                     <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                     <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 focus:ring-2 focus:ring-[#1e3a5f]/10 outline-none transition-all"
                     />
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                  <div className="relative">
                     <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                     <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 focus:ring-2 focus:ring-[#1e3a5f]/10 outline-none transition-all"
                     />
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Car Make</label>
                  <div className="relative">
                     <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                     <select 
                        value={makeFilter}
                        onChange={(e) => {setMakeFilter(e.target.value); setModelFilter('');}}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 focus:ring-2 focus:ring-[#1e3a5f]/10 outline-none transition-all appearance-none cursor-pointer"
                     >
                        <option value="">All Makes</option>
                        {makes.map(m => <option key={m} value={m}>{m}</option>)}
                     </select>
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Car Model</label>
                  <div className="relative">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                     <select 
                        value={modelFilter}
                        onChange={(e) => setModelFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 focus:ring-2 focus:ring-[#1e3a5f]/10 outline-none transition-all appearance-none cursor-pointer"
                     >
                        <option value="">All Models</option>
                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                     </select>
                  </div>
               </div>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b border-slate-50">
                        <th className="pb-4 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] pl-4">Rank</th>
                        <th className="pb-4 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Vehicle Make & Model</th>
                        <th className="pb-4 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Parts & Specs</th>
                        <th className="pb-4 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] text-right pr-4">Quantity</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {analytics.inventoryData.slice(0, 10).map((m, i) => (
                        <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                           <td className="py-5 pl-4 w-16">
                              <span className="text-[11px] font-black text-slate-300">#{i + 1}</span>
                           </td>
                           <td className="py-5 pr-4">
                              <p className="text-[11px] font-black text-[#1e3a5f] uppercase tracking-tight">{m.make} {m.model}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                 <CarFront className="w-2.5 h-2.5 text-slate-300" />
                                 <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{m.make}</span>
                              </div>
                           </td>
                           <td className="py-5 px-2">
                              <p className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{m.part}</p>
                              <p className="text-[9px] font-bold text-orange-500/70 uppercase tracking-widest italic">{m.spec}</p>
                           </td>
                           <td className="py-5 text-right pr-4">
                              <span className="text-lg font-black text-[#f97316] tabular-nums">{m.count}</span>
                              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-0.5">Units</p>
                           </td>
                        </tr>
                     ))}
                     {analytics.inventoryData.length === 0 && (
                        <tr>
                           <td colSpan={4} className="py-20 text-center">
                              <Search className="w-10 h-10 text-slate-100 mx-auto mb-4" />
                              <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">No matching replacement found for the selected filters</p>
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>

         {/* BRANCH LEADERBOARD */}
         <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 space-y-8">
            <div className="flex items-center justify-between border-b border-slate-50 pb-6">
               <div className="space-y-1">
                  <h3 className="text-2xl font-black text-[#1e3a5f] uppercase tracking-tighter">Branch Leaderboard (Top 10)</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Full Period Activity Report</p>
               </div>
               <ShieldCheck className="w-8 h-8 text-[#1e3a5f] opacity-5" />
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b border-slate-100">
                        <th className="pb-5 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] pl-6">Rank</th>
                        <th className="pb-5 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Branch Name</th>
                        <th className="pb-5 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] text-center">Bookings (YTD)</th>
                        <th className="pb-5 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] text-center">Completed Jobs</th>
                        <th className="pb-5 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] text-right pr-6">Performance</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {analytics.branchTable.map((b, i) => (
                        <tr key={i} className="group hover:bg-slate-50/50 transition-all">
                           <td className="py-6 pl-6">
                              <span className="text-[11px] font-black text-slate-300">#{i+1}</span>
                           </td>
                           <td className="py-6">
                              <p className="text-[12px] font-black text-primary uppercase tracking-tight">{b.name}</p>
                           </td>
                           <td className="py-6 text-center">
                              <span className="text-sm font-black text-slate-600 tabular-nums">{b.totalYear}</span>
                           </td>
                           <td className="py-6 text-center">
                              <span className="text-sm font-black text-[#10b981] tabular-nums">{b.completedTotal}</span>
                           </td>
                           <td className="py-6 text-right pr-6">
                              <div className="inline-flex items-center gap-2 text-slate-400 text-[10px] font-black">
                                 {Math.round((b.completedTotal / (b.totalYear || 1)) * 100)}% Completion
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </main>
  );
}
