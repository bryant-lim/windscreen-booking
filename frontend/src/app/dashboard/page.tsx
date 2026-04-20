'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  User, MapPin, Clock, ChevronRight, ShieldCheck, FileText,
  Calendar, History, Mail, Hash, Phone, CheckCircle2, Clock3,
  Loader2, X, AlertCircle, Save, Lock, CalendarDays, Car,
  FileUp, LayoutDashboard, Settings2
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Header from '../../components/Header';
import ManageBookingDrawer from '../../components/ManageBookingDrawer';
import { useRouter } from 'next/navigation';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1338';

// ─── STATUS BADGE ────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    Pending:     'bg-amber-100 text-amber-700',
    Confirmed:   'bg-blue-100 text-blue-700',
    'In Progress': 'bg-purple-100 text-purple-700',
    Completed:   'bg-emerald-100 text-emerald-700',
    Cancelled:   'bg-red-100 text-red-600',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[9px] font-black capitalize tracking-wide ${map[status] || 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  );
};

// ─── APPOINTMENT CARD ─────────────────────────────────────────────────────────
const AppointmentCard = ({ bk, onManage }: { bk: any, onManage: (bk: any) => void }) => {
  const b = bk.attributes || bk;
  const v = b.VehicleDetailsJSON || {};
  const status = b.Status || 'Pending';
  const branch = b.BranchName?.data?.attributes?.BranchName || b.BranchName?.BranchName || b.BranchName || '—';
  const fileUrl = b.InsuranceFile?.data?.[0]?.attributes?.url || b.InsuranceFile?.[0]?.url || null;

  // Format date
  const fmtDate = (d: string) => {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`;
  };
  // Format time
  const fmtTime = (t: string) => {
    if (!t) return '—';
    const [h, min] = t.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour || 12}:${min} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <div className="bg-white border border-primary/10 rounded-[1.5rem] p-5 hover:border-accent/30 transition-all shadow-sm">
      {/* Top row: Date/Time + Branch + Status */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-accent/5 rounded-xl flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4 text-accent/60" />
          </div>
          <div>
            <p className="text-[11px] font-black text-primary font-inter">
              {fmtDate(b.AppointmentDate)}  ·  {fmtTime(b.AppointmentTime)}
            </p>
            <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" /> {branch}
            </p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Divider */}
      <div className="border-t border-slate-50 my-3" />

      {/* Bottom row: Vehicle info + Plate + File */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-1.5">
          <Car className="w-3.5 h-3.5 text-primary/40" />
          <span className="text-[11px] font-bold text-primary capitalize">
            {v.make} {v.year} · {v.part}{v.spec ? ` (${v.spec})` : ''}
          </span>
        </div>
        {b.CarPlateNumber && (
          <span className="text-[10px] font-black text-primary/70 bg-primary/5 px-2.5 py-1 rounded-lg tracking-widest uppercase">
            {b.CarPlateNumber}
          </span>
        )}
        {(() => {
          const files = b.InsuranceFile?.data || (Array.isArray(b.InsuranceFile) ? b.InsuranceFile : []);
          if (!files?.length) return null;
          return files.map((file: any, idx: number) => {
            const url = file.attributes?.url || file.url;
            if (!url) return null;
            return (
              <a
                key={idx}
                href={`${STRAPI_URL}${url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[9px] font-black text-primary/40 bg-primary/5 px-2.5 py-1 rounded-lg hover:bg-accent hover:text-white transition-all border border-primary/5"
              >
                <FileUp className="w-3 h-3" /> File {idx + 1}
              </a>
            );
          });
        })()}
        
        {/* Manage Button — only for active appointments */}
        {!['Completed', 'Cancelled'].includes(status) && (
          <button 
            onClick={() => onManage(bk)}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary/5 hover:bg-accent text-primary hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
          >
            <Settings2 className="w-3.5 h-3.5" /> Manage
          </button>
        )}
      </div>
    </div>
  );
};

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function UserDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'appointments' | 'profile'>('appointments');
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Profile state
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [profile, setProfile] = useState({ fullName: '', ic: '', email: '', phone: '' });
  const [originalProfile, setOriginalProfile] = useState({ fullName: '', ic: '', email: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isDirty =
    profile.fullName !== originalProfile.fullName ||
    profile.ic !== originalProfile.ic ||
    profile.email !== originalProfile.email;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.replace('/login'); return; }
      setUser(u);
      const phone = u.phoneNumber?.replace('+60', '').replace('+', '') || '';
      await Promise.all([fetchAppointments(phone), fetchProfile(phone, u.phoneNumber || '')]);
      setIsLoading(false);
    });
    return () => unsub();
  }, [router]);

  const fetchAppointments = async (phone: string) => {
    try {
      const res = await fetch(`${STRAPI_URL}/api/bookings?filters[Phone][$eq]=${phone}&populate=*`);
      const data = await res.json();
      if (data.data) setAppointments(data.data);
    } catch (e) { console.error(e); }
  };

  const fetchProfile = async (phone: string, fullPhone: string) => {
    try {
      const res = await fetch(`${STRAPI_URL}/api/customers?filters[Phone][$eq]=${phone}`);
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const c = data.data[0];
        const attrs = c.attributes || c;
        const p = {
          fullName: attrs.FullName || '',
          ic: attrs.ICNumber || '',
          email: attrs.Email || '',
          phone: fullPhone || '',
        };
        setCustomerId(c.id);
        setProfile(p);
        setOriginalProfile({ fullName: p.fullName, ic: p.ic, email: p.email });
      } else {
        setProfile(prev => ({ ...prev, phone: fullPhone || '' }));
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveProfile = async () => {
    if (!customerId) return;
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`${STRAPI_URL}/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { FullName: profile.fullName, ICNumber: profile.ic, Email: profile.email } }),
      });
      if (res.ok) {
        setOriginalProfile({ fullName: profile.fullName, ic: profile.ic, email: profile.email });
        setSaveMsg({ type: 'success', text: 'Profile updated successfully' });
      } else {
        setSaveMsg({ type: 'error', text: 'Failed to save. Please try again.' });
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'A network error occurred.' });
    }
    setIsSaving(false);
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const { upcoming, history } = useMemo(() => {
    const upStatuses = ['Pending', 'Confirmed', 'In Progress'];
    
    // Global sort helper (Date + Time)
    const sorted = [...appointments].sort((a, b) => {
      const aa = a.attributes || a;
      const bb = b.attributes || b;
      const dateA = aa.AppointmentDate || '';
      const dateB = bb.AppointmentDate || '';
      
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      
      const timeA = aa.AppointmentTime || '';
      const timeB = bb.AppointmentTime || '';
      return timeA.localeCompare(timeB);
    });

    const up = sorted.filter(a => upStatuses.includes((a.attributes || a).Status));
    const hist = sorted.filter(a => !upStatuses.includes((a.attributes || a).Status)).reverse();

    return { upcoming: up, history: hist };
  }, [appointments]);

  if (isLoading) return (
    <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary opacity-30" />
    </div>
  );

  return (
    <>
      <main className="min-h-screen bg-[#fafbfc] font-inter text-slate-900 pb-24">
        <Header />

      {/* Page title */}
      <div className="max-w-4xl mx-auto px-6 pt-36 pb-6">
        <div className="flex items-center gap-3 mb-8">
          <LayoutDashboard className="w-5 h-5 text-primary/40" />
          <h1 className="text-2xl font-black capitalize text-primary tracking-tight">User Dashboard</h1>
        </div>

        {/* ── Pill Tab Bar ──────────────────────────────────────── */}
        <div className="inline-flex bg-white border border-primary/10 rounded-full p-1 shadow-sm mb-8">
          {(['appointments', 'profile'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-full text-[11px] font-black capitalize tracking-wide transition-all ${
                activeTab === tab
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-primary/50 hover:text-accent'
              }`}
            >
              {tab === 'appointments' ? 'Appointments' : 'User Profile'}
            </button>
          ))}
        </div>

        {/* ── APPOINTMENTS TAB ─────────────────────────────────── */}
        {activeTab === 'appointments' && (
          <div className="space-y-10 animate-in fade-in duration-300">

            {/* Upcoming */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-[13px] font-black capitalize text-primary tracking-wide">Upcoming</h2>
                <span className="bg-primary text-white px-2.5 py-0.5 rounded-full text-[9px] font-black">{upcoming.length}</span>
                <div className="flex-1 h-px bg-primary/5" />
              </div>
              {upcoming.length > 0 ? (
                <div className="space-y-3">
                  {upcoming.map((bk, i) => (
                    <AppointmentCard 
                      key={bk.id} 
                      bk={bk} 
                      onManage={(b) => {
                        setSelectedBooking(b);
                        setIsManageOpen(true);
                      }} 
                    />
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-primary/10 rounded-[1.5rem] p-10 text-center">
                  <p className="text-[11px] font-bold text-slate-400 capitalize">No upcoming appointments</p>
                </div>
              )}
            </div>

            {/* History */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-[13px] font-black capitalize text-primary/50 tracking-wide">History</h2>
                <span className="bg-slate-200 text-slate-500 px-2.5 py-0.5 rounded-full text-[9px] font-black">{history.length}</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              {history.length > 0 ? (
                <div className="space-y-3 opacity-60">
                  {history.map((bk, i) => (
                    <AppointmentCard 
                      key={bk.id} 
                      bk={bk} 
                      onManage={(b) => {
                        setSelectedBooking(b);
                        setIsManageOpen(true);
                      }} 
                    />
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 rounded-[1.5rem] p-10 text-center">
                  <p className="text-[11px] font-bold text-slate-400 capitalize">No history found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PROFILE TAB ──────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-white border border-primary/10 rounded-[2rem] p-8 space-y-6 max-w-xl">

              {/* Editable fields */}
              {[
                { label: 'Full Name', icon: User, key: 'fullName', placeholder: 'As per IC', type: 'text' },
                { label: 'IC Number', icon: Hash, key: 'ic', placeholder: 'xxxxxx-xx-xxxx', type: 'text' },
                { label: 'Email Address', icon: Mail, key: 'email', placeholder: 'example@mail.com', type: 'email' },
              ].map(({ label, icon: Icon, key, placeholder, type }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-primary/60 ml-1">
                    <Icon className="w-3.5 h-3.5" />
                    <label className="text-[11px] font-bold capitalize tracking-wide">{label}</label>
                  </div>
                  <input
                    type={type}
                    value={(profile as any)[key]}
                    onChange={e => setProfile(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full p-4 bg-white border border-primary/20 rounded-2xl text-xs font-bold text-primary outline-none focus:border-accent transition-all"
                  />
                </div>
              ))}

              {/* Read-only Phone */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-primary/40 ml-1">
                  <Phone className="w-3.5 h-3.5" />
                  <label className="text-[11px] font-bold capitalize tracking-wide">Phone Number</label>
                  <Lock className="w-3 h-3 text-primary/30" />
                </div>
                <div className="w-full p-4 bg-slate-50 border border-primary/10 rounded-2xl text-xs font-bold text-primary/50 cursor-not-allowed">
                  {profile.phone || '—'}
                </div>
                <p className="text-[9px] text-slate-300 ml-1">Locked — tied to verified phone identity</p>
              </div>

              {/* Save feedback */}
              {saveMsg && (
                <div className={`p-3 rounded-2xl flex items-center gap-2 text-[11px] font-bold ${
                  saveMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-red-50 text-red-500 border border-red-100'
                }`}>
                  {saveMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {saveMsg.text}
                </div>
              )}

              {/* Save button — only shown if dirty */}
              {isDirty && (
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="w-full py-3.5 bg-primary hover:bg-accent text-white rounded-2xl text-[10px] font-black capitalize tracking-wide shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
    <ManageBookingDrawer 
      isOpen={isManageOpen} 
      booking={selectedBooking} 
      onClose={() => setIsManageOpen(false)}
      onUpdate={() => {
        const phone = user?.phoneNumber?.replace('+60', '').replace('+', '') || '';
        fetchAppointments(phone);
      }}
    />
    </>
  );
}
