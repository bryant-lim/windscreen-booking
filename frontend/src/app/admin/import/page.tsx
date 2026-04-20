'use client';

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { 
  UploadCloud, 
  CheckCircle, 
  Database, 
  Lock, 
  ArrowLeft, 
  Loader2,
  RefreshCcw,
  PlusCircle
} from 'lucide-react';

export default function AdminImport() {
  const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1338';
  const [csvData, setCsvData] = useState<any[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsing' | 'uploading' | 'success' | 'error'>('idle');
  const [targetCollection, setTargetCollection] = useState<'vehicle-datas' | 'branch-datas'>('vehicle-datas');
  const [errorMessage, setErrorMessage] = useState('');
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  
  // Tracking Stats
  const [stats, setStats] = useState({ created: 0, updated: 0, total: 0 });

  // --- THE AUTH GUARD ---
  const verifyStrapiAuth = () => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');

    if (urlToken) {
      console.log("🛠️ Security Bridge: Token received via URL. Persisting credential.");
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

  useEffect(() => {
    verifyStrapiAuth();
  }, []);

  useEffect(() => {
    if (isAuthorized === false) {
      console.warn("🔐 Unauthorized access detected - Redirecting to Security Gateway");
      window.location.href = `${STRAPI_URL}/admin`;
    }
  }, [isAuthorized]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('parsing');
    // Map of statistics reset
    setStats({ created: 0, updated: 0, total: 0 });
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        setUploadStatus('idle');
      },
      error: (error) => {
        setErrorMessage(error.message);
        setUploadStatus('error');
      }
    });
  };

  const syncToDatabase = async () => {
    if (csvData.length === 0) return;
    setUploadStatus('uploading');
    setErrorMessage('');
    
    let createdCount = 0;
    let updatedCount = 0;
    try {
      const token = localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken');
      const baseApi = `${STRAPI_URL}/api/${targetCollection}`;
      
      for (const row of csvData) {
        let payload: any = {};
        let searchParams = new URLSearchParams();
        let existingId: string | null = null;
        
        if (targetCollection === 'vehicle-datas') {
           const rawPrice = String(row['Price – Original'] || row['Price - Original'] || row['Price_Original'] || row['Price'] || '0');
           const cleanPrice = rawPrice.replace(/[^0-9.-]+/g, "");
           const parsedPrice = parseFloat(cleanPrice);

           const rawPriceAftermarket = String(row['Price – Aftermarket'] || row['Price - Aftermarket'] || row['Price_Aftermarket'] || row['Aftermarket Price'] || '0');
           const cleanPriceAftermarket = rawPriceAftermarket.replace(/[^0-9.-]+/g, "");
           const parsedPriceAftermarket = parseFloat(cleanPriceAftermarket);

           const rawPercentage = String(row['Deposit_Percentage'] || row['Deposit Percentage'] || row['Percentage'] || '0');
           const cleanPercentage = rawPercentage.replace(/[^0-9.-]+/g, "");
           const parsedPercentage = parseFloat(cleanPercentage);

           payload = {
             Make: String(row['Make'] || '').trim(),
             Model: String(row['Model'] || '').trim(),
             Year: String(row['Year'] || '').trim(),
             Part: String(row['Part'] || '').trim(),
             Spec_Variant: String(row['Spec & Variant'] || row['Spec_Variant'] || row['Spec Variant'] || '').trim(),
             Price_Original: isNaN(parsedPrice) || cleanPrice === '' ? 0 : parsedPrice,
             Price_Aftermarket: isNaN(parsedPriceAftermarket) || cleanPriceAftermarket === '' ? 0 : parsedPriceAftermarket,
             Deposit_Required: String(row['Deposit Required'] || row['Deposit_Required'] || '').trim().toUpperCase() === 'Y',
             Deposit_Percentage: isNaN(parsedPercentage) || cleanPercentage === '' ? 0 : parsedPercentage
           };

           searchParams.append('filters[Make][$eq]', payload.Make);
           searchParams.append('filters[Model][$eq]', payload.Model);
           searchParams.append('filters[Year][$eq]', payload.Year);
           searchParams.append('filters[Part][$eq]', payload.Part);
           searchParams.append('filters[Spec_Variant][$eq]', payload.Spec_Variant);

        } else if (targetCollection === 'branch-datas') {
           // BRANCH DATA LOGIC (Synced with Strapi Schema)
           const rawLead = String(row['LeadTimeMinutes'] || row['Lead Minutes'] || row['Lead'] || row['LeadMinutes'] || '120');
           const cleanLead = rawLead.replace(/\D/g, "");
           const parsedLead = parseInt(cleanLead);

           payload = {
             BranchCode: String(row['BranchCode'] || row['Branch Code'] || row['Code'] || '').trim(),
             BranchName: String(row['BranchName'] || row['Branch Name'] || row['Name'] || '').trim(),
             Address: String(row['Address'] || '').trim(),
             Contact: String(row['Contact'] || '').trim(),
             LeadTimeMinutes: isNaN(parsedLead) ? 120 : parsedLead,
             ClosedDaysOfWeek: String(row['ClosedDaysOfWeek'] || row['TimeSlotsClosedDaysofWeek'] || row['Closed Days'] || '').trim(),
             SpecificClosedDates: String(row['SpecificClosedDates'] || row['Closed Dates List'] || '').trim(),
             Status: String(row['Status'] || 'Active').trim(),
             BranchPassword: String(row['BranchPassword'] || row['Password'] || '123456').trim(),
             TimeSlots: String(row['TimeSlots'] || row['Time Slots'] || '09:00, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00, 17:00, 18:00').trim()
           };

           if (!payload.BranchCode) throw new Error("BranchCode is required for all rows in Branch Data sync.");

           // Search for existing Branch by BranchCode
           searchParams.append('filters[BranchCode][$eq]', payload.BranchCode);
        }

        // 1. Search for existing record (for both Vehicle and Branch data)
        const searchRes = await fetch(`${baseApi}?${searchParams.toString()}`, {
           headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        const searchData = await searchRes.json();
        
        if (searchData.data && searchData.data.length > 0) {
           existingId = searchData.data[0].documentId || searchData.data[0].id;
        }

        // 2. Determine Action: PUT vs POST
        const method = existingId ? 'PUT' : 'POST';
        const url = existingId ? `${baseApi}/${existingId}` : baseApi;

        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ data: payload })
        });

        if (!response.ok) {
           const err = await response.json();
           throw new Error(`Failed to sync row (Action: ${method}): ${err.error?.message || 'Unknown error'}`);
        }

        if (existingId) updatedCount++;
        else createdCount++;

        // Live stats update for UI
        setStats({ created: createdCount, updated: updatedCount, total: createdCount + updatedCount });
      }
      setUploadStatus('success');
    } catch (err: any) {
      setErrorMessage(err.message);
      setUploadStatus('error');
    }
  };

  if (isAuthorized === null) return (
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-inter">
      
      {/* CRYSTAL WHITE HERO SECTION */}
      <div className="bg-white border-b border-slate-100 py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="space-y-1">
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none text-[#1e3a5f]">Data Importer</h1>
           </div>
           
           <div className="flex items-center gap-4">
              <a 
                 href={`${STRAPI_URL}/admin`}
                 className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#1e3a5f] px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 group shadow-sm active:scale-95"
              >
                 <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Back to Admin Portal
              </a>
           </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-16">
        
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-10 mb-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
             <UploadCloud className="w-64 h-64 text-[#1e3a5f]" />
          </div>

          <div className="mb-10 relative z-10 flex flex-col md:flex-row items-end justify-between gap-6">
            <div className="w-full md:w-auto">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1e3a5f]/40 mb-3 block">Target Collection</label>
               <select 
                 value={targetCollection}
                 onChange={(e) => setTargetCollection(e.target.value as any)}
                 className="border-slate-100 rounded-2xl p-5 bg-slate-50 border w-full md:w-80 outline-none focus:ring-4 focus:ring-blue-500/5 font-black text-[#1e3a5f] text-sm appearance-none cursor-pointer"
               >
                 <option value="vehicle-datas">Vehicle Data (Pricing)</option>
                 <option value="branch-datas">Branch Data (Locations)</option>
               </select>
            </div>

            {uploadStatus === 'uploading' && (
               <div className="flex items-center gap-8 bg-slate-50 px-8 py-5 rounded-2xl border border-slate-100 animate-pulse">
                  <div className="flex flex-col items-center">
                     <p className="text-[9px] font-black uppercase text-slate-400">Processed</p>
                     <p className="text-xl font-black text-[#1e3a5f]">{stats.total} / {csvData.length}</p>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-200"></div>
                  <div className="flex flex-col items-center">
                     <p className="text-[9px] font-black uppercase text-emerald-500">Created</p>
                     <p className="text-xl font-black text-emerald-600">{stats.created}</p>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-200"></div>
                  <div className="flex flex-col items-center">
                     <p className="text-[9px] font-black uppercase text-blue-500">Updated</p>
                     <p className="text-xl font-black text-blue-600">{stats.updated}</p>
                  </div>
               </div>
            )}
          </div>

          <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-16 text-center hover:border-[#f5a623]/30 hover:bg-slate-50/50 transition-all group relative z-10">
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden" 
              id="csv-upload" 
            />
            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 border border-slate-100 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-10 h-10 text-[#1e3a5f]" />
              </div>
              <span className="text-xl font-black text-[#1e3a5f] tracking-tight">Click to upload your CSV file</span>
              <span className="text-slate-400 mt-2 text-xs font-bold uppercase tracking-widest">Supports .csv standard exports</span>
            </label>
          </div>

          {csvData.length > 0 && (
            <div className="mt-12 border border-slate-100 rounded-3xl overflow-hidden shadow-sm relative z-10 animate-in fade-in slide-in-from-bottom-4">
               <div className="bg-[#1e3a5f] text-white px-8 py-5 flex justify-between items-center">
                  <div>
                    <span className="font-black text-xs uppercase tracking-widest opacity-60">Ready to Sync</span>
                    <p className="text-sm font-black mt-0.5">Found {csvData.length} records in file</p>
                  </div>
                  <button 
                    onClick={() => setCsvData([])} 
                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    Clear Data
                  </button>
               </div>
               
               <div className="max-h-80 overflow-y-auto">
                 <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                      <tr>
                        {Object.keys(csvData[0] || {}).map(key => (
                          <th key={key} className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-6 py-4 text-[#1e3a5f] font-bold">{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                 </table>
                 {csvData.length > 5 && (
                    <div className="text-center p-4 text-slate-400 bg-slate-50/50 border-t border-slate-50 text-[10px] font-black uppercase tracking-widest">
                       + {csvData.length - 5} more rows found in file
                    </div>
                 )}
               </div>

               <div className="p-8 bg-white border-t border-slate-50 flex flex-col items-center">
                  {uploadStatus === 'error' && (
                     <div className="text-red-600 mb-6 text-xs font-black uppercase tracking-tight p-5 bg-red-50 rounded-2xl w-full flex items-center gap-3">
                       <Lock className="w-4 h-4 shrink-0" />
                       <span>Error: {errorMessage}. (Verify Permission in Strapi)</span>
                     </div>
                  )}
                  {uploadStatus === 'success' && (
                     <div className="space-y-4 w-full">
                        <div className="text-emerald-600 text-xs font-black uppercase tracking-widest flex items-center gap-3 p-5 bg-emerald-50 rounded-2xl w-full">
                           <CheckCircle className="w-5 h-5" /> Import completed successfully!
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
                              <div>
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">New Records</p>
                                 <p className="text-2xl font-black text-emerald-600">{stats.created}</p>
                              </div>
                              <PlusCircle className="w-8 h-8 text-emerald-500 opacity-20" />
                           </div>
                           <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
                              <div>
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Items Updated</p>
                                 <p className="text-2xl font-black text-blue-600">{stats.updated}</p>
                              </div>
                              <RefreshCcw className="w-8 h-8 text-blue-500 opacity-20" />
                           </div>
                        </div>
                     </div>
                  )}
                  
                  {uploadStatus !== 'success' && (
                    <button
                      onClick={syncToDatabase}
                      disabled={uploadStatus === 'uploading'}
                      className="bg-[#f5a623] hover:bg-[#e09214] text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed shadow-xl shadow-orange-500/10 active:scale-95 flex items-center gap-3"
                    >
                      {uploadStatus === 'uploading' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Syncing to Database...</>
                      ) : 'Confirm and Start Sync ➔'}
                    </button>
                  )}

                  {uploadStatus === 'success' && (
                    <button
                      onClick={() => setCsvData([])}
                      className="bg-[#1e3a5f] hover:bg-slate-900 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-[#1e3a5f]/10 active:scale-95"
                    >
                       Done & Clear
                    </button>
                  )}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


