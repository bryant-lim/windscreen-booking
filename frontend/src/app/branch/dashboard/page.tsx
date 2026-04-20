'use client';

import React, { useState, useEffect } from 'react';
import Header from '../../../components/Header';
import { Calendar, Filter, Clock, MoreVertical, X, Check, Truck, AlertCircle } from 'lucide-react';

export default function BranchDashboard() {
  const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1338';
  const [selectedBranch, setSelectedBranch] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [viewMode, setViewMode] = useState<'today' | 'weekly' | 'all'>('today');

  useEffect(() => {
    if (selectedBranch) {
      fetchBranchBookings();
    }
  }, [selectedBranch, viewMode]);

  const fetchBranchBookings = async () => {
    setIsLoading(true);
    try {
      let filterParams = `filters[BranchName][$eq]=${selectedBranch}`;
      
      if (viewMode === 'today') {
        const today = new Date().toISOString().split('T')[0];
        filterParams += `&filters[AppointmentDate][$eq]=${today}`;
      }

      const res = await fetch(`${STRAPI_URL}/api/bookings?${filterParams}&sort[0]=AppointmentTime:asc`);
      const json = await res.json();
      if (json.data) setBookings(json.data);
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: number, newStatus: string, reason?: string) => {
    try {
      const res = await fetch(`${STRAPI_URL}/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: { 
            Status: newStatus,
            CancellationReason: reason || null
          }
        })
      });
      
      if (res.ok) {
        fetchBranchBookings();
        setShowCancelModal(null);
        setCancelReason('');
      }
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 font-inter">
      <Header />
      
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-bold text-[#1e3a5f] flex items-center gap-3">
              <div className="p-2 bg-[#1e3a5f] text-white rounded-xl">
                <Calendar className="w-6 h-6" />
              </div>
              Branch Operations
            </h1>
            <p className="text-slate-400 text-sm mt-1 ml-11">Manage and track service appointments in real-time.</p>
          </div>

          <div className="flex items-center gap-3">
            <select 
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#1e3a5f] focus:border-[#1e3a5f] outline-none shadow-sm"
            >
              <option value="">Select Branch</option>
              <option value="ChillOr Glenmarie">ChillOr Glenmarie (HQ)</option>
              <option value="ChillOr Damansara">ChillOr Damansara</option>
              <option value="ChillOr Subang">ChillOr Subang</option>
            </select>

            <div className="bg-white p-1 rounded-xl border border-slate-200 flex gap-1 shadow-sm">
              <button 
                onClick={() => setViewMode('today')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${viewMode === 'today' ? 'bg-[#1e3a5f] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Today
              </button>
              <button 
                onClick={() => setViewMode('all')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${viewMode === 'all' ? 'bg-[#1e3a5f] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                All Bookings
              </button>
            </div>
          </div>
        </div>

        {!selectedBranch ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-300 font-bold uppercase tracking-widest text-xs">
            Please Select a Branch to View Records
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Appointment</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer & Vehicle</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Services (JSON)</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {bookings.map((booking: any) => {
                    const attrs = booking.attributes || booking;
                    const vehicle = attrs.VehicleDetailsJSON || {};
                    
                    return (
                      <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-6">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-orange-50 flex flex-col items-center justify-center text-[#f5a623]">
                                 <span className="text-[10px] font-bold uppercase">{attrs.AppointmentTime?.split(':')[0]}</span>
                                 <span className="text-[8px] font-black">AM</span>
                              </div>
                              <div>
                                 <p className="text-xs font-bold text-[#1e3a5f]">{attrs.AppointmentTime}</p>
                                 <p className="text-[9px] text-slate-400">{attrs.AppointmentDate}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-6 font-inter">
                          <p className="text-[11px] font-black text-[#1e3a5f] uppercase tracking-tight">{attrs.DriverName}</p>
                          <p className="text-[10px] text-slate-500 mb-1">{attrs.CarPlateNumber} • {vehicle.make} {vehicle.model}</p>
                          <div className="flex items-center gap-2">
                             <span className="text-[8px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">Ref: {attrs.ReferenceNumber}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <p className="text-[10px] text-slate-500 italic max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                            {vehicle.part} ({vehicle.spec || 'Standard'})
                          </p>
                        </td>
                        <td className="px-6 py-6">
                           <div className="flex flex-col gap-1.5">
                              <div className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider inline-flex w-fit items-center gap-1.5
                                 ${attrs.Status === 'Confirmed' ? 'bg-green-50 text-green-600' : ''}
                                 ${attrs.Status === 'In Progress' ? 'bg-blue-50 text-blue-600' : ''}
                                 ${attrs.Status === 'Completed' ? 'bg-slate-100 text-slate-600' : ''}
                                 ${attrs.Status === 'Cancelled' ? 'bg-red-50 text-red-600' : ''}
                                 ${attrs.Status === 'Pending' ? 'bg-orange-50 text-orange-600' : ''}
                              `}>
                                 <div className={`w-1.5 h-1.5 rounded-full ${
                                    attrs.Status === 'Confirmed' ? 'bg-green-600' : 
                                    attrs.Status === 'In Progress' ? 'bg-blue-600' : 'bg-slate-400'
                                 }`}></div>
                                 {attrs.Status}
                              </div>
                              {attrs.CancellationReason && (
                                <p className="text-[8px] text-red-400 font-bold max-w-[120px]">Reason: {attrs.CancellationReason}</p>
                              )}
                           </div>
                        </td>
                        <td className="px-6 py-6">
                           <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => updateStatus(booking.id, 'In Progress')}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                title="Move to In Progress"
                              >
                                 <Truck className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => updateStatus(booking.id, 'Completed')}
                                className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                title="Mark as Completed"
                              >
                                 <Check className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => setShowCancelModal(booking)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                title="Cancel Booking"
                              >
                                 <X className="w-3.5 h-3.5" />
                              </button>
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {bookings.length === 0 && (
              <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                No Appointments Scheduled
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 animate-in zoom-in duration-200">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                 <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#1e3a5f] text-center mb-1">Cancel Booking?</h3>
              <p className="text-center text-slate-400 text-xs mb-6 px-4">This action will notify <strong>{showCancelModal.attributes?.DriverName || showCancelModal.DriverName}</strong> immediately.</p>
              
              <div className="mb-6">
                 <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cancellation Reason (Required)</label>
                 <textarea 
                    rows={3}
                    placeholder="Enter reason for customer..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:border-red-500 outline-none transition-all resize-none"
                 />
              </div>

              <div className="flex gap-3">
                 <button 
                    onClick={() => setShowCancelModal(null)}
                    className="flex-1 py-3 text-[#1e3a5f] font-bold text-[11px] uppercase tracking-widest bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                 >
                    Discard
                 </button>
                 <button 
                    disabled={!cancelReason.trim()}
                    onClick={() => updateStatus(showCancelModal.id, 'Cancelled', cancelReason)}
                    className="flex-1 py-3 bg-red-500 text-white font-bold text-[11px] uppercase tracking-widest rounded-xl shadow-lg shadow-red-200 hover:bg-red-600 transition-all disabled:opacity-50"
                 >
                    Confirm Stop
                 </button>
              </div>
           </div>
        </div>
      )}
    </main>
  );
}
