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
  LayoutDashboard
} from 'lucide-react';
import Header from '../../../components/Header';

export default function AdminAnalytics() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // --- THE AUTH GUARD ---
  const verifyStrapiAuth = () => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken')) : null;
    if (token || process.env.NODE_ENV === 'development') {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
  };

  const fetchAllStats = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`http://localhost:1338/api/bookings?populate=*&pagination[limit]=1000`);
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

  const analytics = useMemo(() => {
    const stats: any = {
      branchLoad: {} as Record<string, number>,
      carMakes: {} as Record<string, number>,
      inventoryHotList: [] as any[],
      parts: {} as Record<string, number>,
      totalConfirmedCount: 0
    };

    const modelTracker: Record<string, { count: number, make: string, model: string, part: string, spec: string }> = {};

    data.forEach(item => {
      const b = item.attributes || item;
      const branchRel = b.BranchName?.data?.attributes?.BranchName;
      const branchStr = b.BranchName?.BranchName;
      const branch = branchRel || branchStr || 'Central/Unassigned';
      stats.branchLoad[branch] = (stats.branchLoad[branch] || 0) + 1;

      const vehicle = b.VehicleDetailsJSON || {};
      if (vehicle.make) stats.carMakes[vehicle.make] = (stats.carMakes[vehicle.make] || 0) + 1;
      
      if (vehicle.model) {
        const key = `${vehicle.make}-${vehicle.model}-${vehicle.part}-${vehicle.spec || ''}`;
        if (!modelTracker[key]) {
           modelTracker[key] = {
             count: 0,
             make: vehicle.make,
             model: vehicle.model,
             part: vehicle.part,
             spec: vehicle.spec || 'Standard'
           };
        }
        modelTracker[key].count++;
      }

      const p = vehicle.part || 'Other';
      stats.parts[p] = (stats.parts[p] || 0) + 1;

      const status = (b.Status || b.attributes?.Status);
      if (status === 'Confirmed' || status === 'In Progress' || status === 'Completed' || status === 'Pending') {
         stats.totalConfirmedCount++;
      }
    });

    const branchData = Object.entries(stats.branchLoad).map(([name, value]) => ({ name, value })).sort((a,b) => (b.value as number) - (a.value as number));
    const makeData = Object.entries(stats.carMakes).map(([name, value]) => ({ name, value })).sort((a,b) => (b.value as number) - (a.value as number));
    const partData = Object.entries(stats.parts).map(([name, value]) => ({ name, value }));
    const inventoryData = Object.values(modelTracker).sort((a,b) => b.count - a.count).slice(0, 20);

    return { branchData, makeData, partData, inventoryData, totalConfirmedCount: stats.totalConfirmedCount };
  }, [data]);

  const COLORS = ['#1e3a5f', '#f97316', '#10b981', '#6366f1', '#a855f7', '#ec4899', '#3b82f6'];

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
       <a href="http://localhost:1338/admin" className="px-10 py-5 bg-white text-[#1e3a5f] rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-orange-500 hover:text-white mt-12 transition-all active:scale-95 flex items-center gap-3 group">
          Back to Admin Portal <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
       </a>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#fafbfc] font-poppins text-slate-900 pb-20 text-sm">
      <Header hideNav={true} />

      {/* CRYSTAL WHITE HERO SECTION */}
      <div className="bg-white border-b border-slate-100 py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="space-y-1">
              <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 rounded-full bg-[#f97316] animate-pulse"></div>
                 <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#1e3a5f] opacity-60">Data Intelligence Hub</p>
              </div>
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-none text-[#1e3a5f]">Analytics Hub</h1>
           </div>
           
           <div className="flex items-center gap-4">
              {/* THE BACK TO ADMIN PORTAL BUTTON (Inverted Style) */}
              <a 
                 href="http://localhost:1338/admin"
                 className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#1e3a5f] px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 group shadow-sm active:scale-95"
              >
                 <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Back to Admin Portal
              </a>

              <button 
                 onClick={fetchAllStats}
                 className="bg-[#1e3a5f] hover:bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center gap-2"
              >
                 <RefreshCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Sync Hub
              </button>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-6 mt-12 space-y-8">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-sm">
            <div className="lg:col-span-1 space-y-8">
               {/* Top Brands */}
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1e3a5f]">Top Brands</h3>
                  <div className="h-[280px] w-full flex flex-col">
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie
                           data={analytics.makeData}
                           innerRadius={70}
                           outerRadius={100}
                           paddingAngle={5}
                           dataKey="value"
                         >
                           {analytics.makeData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                         </Pie>
                         <Tooltip />
                         <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} />
                       </PieChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               {/* Most Active Branch */}
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1e3a5f]">Most Active Branch</h3>
                  <div className="space-y-4">
                     {analytics.branchData.map((b, i) => (
                        <div key={i} className="space-y-1.5">
                           <div className="flex justify-between items-end">
                              <p className="text-[10px] font-black uppercase tracking-tight text-slate-500">{b.name}</p>
                              <p className="text-[10px] font-black text-[#1e3a5f]">{b.value} Jobs</p>
                           </div>
                           <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                              <div 
                                 className="h-full bg-[#1e3a5f] rounded-full transition-all duration-1000" 
                                 style={{ width: `${(b.value / data.length) * 100}%` }}
                              ></div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Total Collected Booking */}
               <div className="bg-emerald-500 p-8 rounded-[2.5rem] shadow-xl text-white space-y-1 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                     <ShieldCheck className="w-12 h-12" />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Total Collected Booking</h3>
                  <p className="text-4xl font-black tracking-tighter tabular-nums leading-none pt-2">{analytics.totalConfirmedCount}</p>
                  <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest pt-1">Appointments Logged Across Network</p>
               </div>
            </div>

            {/* Most Replaced Parts */}
            <div className="lg:col-span-2 space-y-8">
               <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-8 relative overflow-hidden h-full">
                  <div className="space-y-1 relative z-10">
                     <h3 className="text-2xl font-black tracking-tighter text-[#1e3a5f] uppercase">Most Replaced Parts</h3>
                  </div>

                  <div className="space-y-4 relative z-10">
                     <div className="grid grid-cols-12 px-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 font-mono">
                        <div className="col-span-1">Rank</div>
                        <div className="col-span-5">Vehicle Make & Model</div>
                        <div className="col-span-4 px-2">Parts & Specs</div>
                        <div className="col-span-2 text-right">Quantity</div>
                     </div>

                     <div className="space-y-3">
                        {analytics.inventoryData.map((m, i) => (
                           <div key={i} className="grid grid-cols-12 items-center px-6 py-5 bg-slate-50/50 hover:bg-white hover:border-[#f97316]/50 border border-transparent rounded-[1.5rem] transition-all group shadow-sm hover:shadow-lg">
                              <div className="col-span-1">
                                 <span className="text-[11px] font-black text-slate-300">#{i+1}</span>
                              </div>
                              <div className="col-span-5 space-y-1 pr-2">
                                 <p className="text-[11px] font-black text-[#1e3a5f] uppercase tracking-tight leading-snug whitespace-normal break-words">{m.make} {m.model}</p>
                                 <div className="flex items-center gap-1">
                                    <CarFront className="w-2.5 h-2.5 text-slate-300" />
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{m.make}</span>
                                 </div>
                              </div>
                              <div className="col-span-4 space-y-0.5 font-medium px-2">
                                 <p className="text-[10px] font-black text-slate-600 uppercase tracking-tight whitespace-normal">{m.part}</p>
                                 <p className="text-[9px] font-bold text-orange-500/70 uppercase tracking-widest italic">{m.spec}</p>
                              </div>
                              <div className="col-span-2 text-right">
                                 <div className="inline-flex flex-col items-end">
                                    <p className="text-xl font-black text-[#f97316] tabular-nums leading-none">{m.count}</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap">UNITS</p>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Glass Replacement Map */}
         <div className="bg-[#1e3a5f] p-10 rounded-[3rem] shadow-2xl space-y-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 blur-[120px] -mr-40 -mt-40"></div>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
               <div className="space-y-1">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Glass Replacement Map</h3>
               </div>
               <div className="flex gap-4">
                  {analytics.partData.map((p, i) => (
                     <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] min-w-[150px] flex flex-col items-center group hover:bg-white/10 transition-all">
                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">{p.name}</p>
                        <p className="text-2xl font-black text-white">{Math.round((p.value / (data.length || 1)) * 100)}%</p>
                        <div className="w-12 h-1 bg-emerald-500/30 rounded-full mt-3 group-hover:bg-emerald-500 transition-colors"></div>
                     </div>
                  ))}
               </div>
            </div>

            <div className="h-[200px] w-full relative z-10">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={analytics.partData}>
                   <defs>
                     <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                       <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '15px', color: '#fff' }} />
                   <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={6} fillOpacity={1} fill="url(#colorValue)" />
                 </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>
    </main>
  );
}
