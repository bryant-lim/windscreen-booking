'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Store, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import Header from '../../components/Header';

export default function BranchLogin() {
  const [formData, setFormData] = useState({ branchCode: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if already logged in as a branch
  useEffect(() => {
    const session = sessionStorage.getItem('ws2u_branch_session');
    if (session) {
      window.location.href = '/branch-dashboard';
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch the branch by Code
      const res = await fetch(`http://localhost:1338/api/branch-datas?filters[BranchCode][$eq]=${formData.branchCode.toUpperCase()}`);
      const data = await res.json();

      if (!data.data || data.data.length === 0) {
        throw new Error("Invalid Branch Code.");
      }

      // Strapi 5 response handling
      const branchAttrs = data.data[0].attributes || data.data[0];
      
      // 2. Exact Password Match (Industrial simplicity for now)
      if (branchAttrs.BranchPassword === formData.password) {
        // Success -> Save to Session
        sessionStorage.setItem('ws2u_branch_session', JSON.stringify({
          id: data.data[0].id || data.data[0].documentId,
          code: branchAttrs.BranchCode,
          name: branchAttrs.BranchName
        }));
        
        // Redirect to Command Center
        window.location.href = '/branch-dashboard';
      } else {
        throw new Error("Incorrect Access Key.");
      }
    } catch (err: any) {
      setError(err.message || "Connection failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col font-inter">
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-700">
          
          {/* Clean Portal Header */}
          <div className="text-center mb-10">
            <h1 className="text-2xl font-black text-[#1e3a5f] tracking-tighter mb-2">Windscreen2U Branch Portal</h1>
          </div>

          {/* Secure Vault Container */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 md:p-10 relative overflow-hidden group">
            <form onSubmit={handleLogin} className="space-y-6">
              
              {/* Branch ID Field */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 tracking-widest ml-1 block">Branch ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Store className="h-4 w-4 text-slate-300 transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="E.G. SEMENYIH"
                    value={formData.branchCode}
                    onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
                    className="block w-full pl-11 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl font-black text-[#1e3a5f] text-xs placeholder:text-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-[#1e3a5f] transition-all uppercase tracking-widest outline-none"
                  />
                </div>
              </div>

              {/* Access Key Field */}
              <div className="space-y-2">
                 <label className="text-[11px] font-black text-slate-400 tracking-widest ml-1 block">Password</label>
                 <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                       <Lock className="h-4 w-4 text-slate-300 transition-colors" />
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="block w-full pl-11 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl font-black text-[#1e3a5f] text-xs placeholder:text-slate-200 focus:bg-white focus:ring-4 focus:ring-orange-500/5 focus:border-[#f5a623] transition-all tracking-widest outline-none"
                    />
                 </div>
              </div>

              {/* Feedback Loop */}
              {error && (
                <div className="flex items-center gap-2 p-4 bg-rose-50 rounded-2xl border border-rose-100 animate-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider leading-relaxed">{error}</p>
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-16 flex items-center justify-between px-6 bg-[#1e3a5f] text-white rounded-2xl font-black text-[12px] tracking-[0.2em] shadow-2xl shadow-blue-900/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2 mx-auto"><Loader2 className="w-4 h-4 animate-spin text-white" /> Authenticating...</span>
                ) : (
                  <>
                    <span>Login</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Authorized Branch Personnel Only</p>
          </div>
        </div>
      </div>
    </main>
  );
}
