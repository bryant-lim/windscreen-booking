'use client';

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Stepper from '../components/Stepper';
import Calendar from '../components/Calendar';
import Combobox from '../components/Combobox';
import { 
  CheckCircle2, ChevronRight, ChevronLeft, User, Mail, Phone, Hash, Car, FileUp, X, Loader2, ShieldCheck, Clock, MapPin, CalendarDays
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

declare global { interface Window { recaptchaVerifier: any; } }

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1338';

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<any>(null);
  
  // Data States
  const [vehicleRaw, setVehicleRaw] = useState<any[]>([]);
  const [branchRaw, setBranchRaw] = useState<any[]>([]);
  const [bookingsRaw, setBookingsRaw] = useState<any[]>([]);
  
  // UI States
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [availableParts, setAvailableParts] = useState<any[]>([]);
  const [branchList, setBranchList] = useState<string[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [blockedDays, setBlockedDays] = useState<string[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  // Auth States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Step 5 States
  const [bookingRef, setBookingRef] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingConfirmedData, setBookingConfirmedData] = useState<any>(null);

  const [formData, setFormData] = useState({
    make: '', model: '', year: '', part: '', 
    name: '', phone: '', email: '', plate: '', ic: '', 
    insuranceFiles: [] as File[], branch: '', date: '', time: '',
    selectedPartData: null as any,
    selectedBranchData: null as any
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u?.phoneNumber) {
        // Auto-populate Step 4 + skip OTP for logged-in users
        setIsVerified(true);
        const cleanPhone = u.phoneNumber.replace('+60', '').replace('+', '');
        try {
          const res = await fetch(`${STRAPI_URL}/api/customers?filters[Phone][$eq]=${cleanPhone}`);
          const data = await res.json();
          if (data.data && data.data.length > 0) {
            const c = data.data[0].attributes || data.data[0];
            setFormData(prev => ({
              ...prev,
              name: c.FullName || prev.name,
              ic: c.ICNumber || prev.ic,
              email: c.Email || prev.email,
              phone: cleanPhone,
            }));
          } else {
            setFormData(prev => ({ ...prev, phone: cleanPhone }));
          }
        } catch (e) { console.error('Profile prefill failed', e); }
      }
    });
    return () => unsub();
  }, []);

  // MASTER FETCH - RECURSIVE SYNC
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        let allVehicles: any[] = [];
        let page = 1; let totalPages = 1;
        while (page <= totalPages) {
           const vRes = await fetch(`${STRAPI_URL}/api/vehicle-datas?pagination[page]=${page}&pagination[pageSize]=100`);
           const vData = await vRes.json();
           if (vData.data && vData.data.length > 0) {
              allVehicles = [...allVehicles, ...vData.data];
              totalPages = vData.meta?.pagination?.pageCount || 1;
              page++;
           } else { break; }
        }
        setVehicleRaw(allVehicles);
        setMakes(Array.from(new Set(allVehicles.map(v => (v.attributes?.Make || v.Make)?.trim().toUpperCase()))).filter(Boolean).sort() as string[]);

        const bRes = await fetch(`${STRAPI_URL}/api/branch-datas`);
        const bData = await bRes.json();
        if (bData.data) {
           setBranchRaw(bData.data);
           setBranchList(bData.data.map((b: any) => (b.attributes?.BranchName || b.BranchName)).filter(Boolean).sort() as string[]);
        }

        // --- BOOKINGS SYNC: Only Confirmed bookings block slots ---
        const bkRes = await fetch(`${STRAPI_URL}/api/bookings?populate=*&filters[Status][$eq]=Confirmed`);
        const bkData = await bkRes.json();
        console.log('[Occupancy] Confirmed bookings fetched:', bkData.data?.length, bkData.data);
        if (bkData.data) setBookingsRaw(bkData.data);

      } catch (err) { console.error('SYNC ERROR:', err); }
    };
    fetchAllData();
  }, []);

  // FILTERS
  useEffect(() => {
    if (formData.make) setModels(Array.from(new Set(vehicleRaw.filter(v => (v.attributes?.Make?.toUpperCase() || v.Make?.toUpperCase()) === formData.make).map(v => (v.attributes?.Model || v.Model)))).filter(Boolean).sort() as string[]);
  }, [formData.make, vehicleRaw]);

  useEffect(() => {
    if (formData.model) setYears(Array.from(new Set(vehicleRaw.filter(v => (v.attributes?.Model || v.Model) === formData.model).map(v => (v.attributes?.Year?.toString() || v.Year?.toString())))).filter(Boolean).sort((a,b) => b.localeCompare(a)) as string[]);
  }, [formData.model, vehicleRaw]);

  useEffect(() => {
    if (formData.make && formData.model && formData.year) {
      setAvailableParts(vehicleRaw.filter(v => (v.attributes?.Make?.toUpperCase() || v.Make?.toUpperCase()) === formData.make && (v.attributes?.Model || v.Model) === formData.model && (v.attributes?.Year?.toString() || v.Year?.toString()) === formData.year).map(v => ({
         id: v.id, part: v.attributes?.Part || v.Part, spec: v.attributes?.Spec_Variant || v.Spec_Variant || 'Standard', price: v.attributes?.Price_Original || v.Price_Original || 0, depositRequired: v.attributes?.Deposit_Required ?? (v.Deposit_Required === "true" || v.Deposit_Required === true) ?? false, depositPercentage: v.attributes?.Deposit_Percentage ?? v.Deposit_Percentage ?? 10
      })));
    }
  }, [formData.make, formData.model, formData.year, vehicleRaw]);

  useEffect(() => {
    if (formData.branch) {
       const selected = branchRaw.find(b => (b.attributes?.BranchName || b.BranchName) === formData.branch);
       if (selected) {
          const attr = selected.attributes || selected;
          setAvailableTimes((attr.TimeSlots || '').split(',').map((s: any) => s.trim()).filter(Boolean));
          setBlockedDays((attr.ClosedDaysOfWeek || '').split(',').map((s: any) => s.trim()).filter(Boolean));
          setBlockedDates((attr.SpecificClosedDates || '').split(',').map((s: any) => {
             const t = s.trim(); if (!t.includes('-')) return null;
             const [d, m, y] = t.split('-'); return (d && m && y) ? `${y}-${m}-${d}` : null;
          }).filter(Boolean) as string[]);
          setFormData(prev => ({...prev, selectedBranchData: selected}));
       }
    }
  }, [formData.branch, branchRaw]);

  // ACTIONS
  const sendOTP = async () => {
    if (!formData.phone) return alert('Phone required');
    setLoading(true);
    try {
      if (!window.recaptchaVerifier) window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-wrapper', { 'size': 'invisible' });
      const confirmation = await signInWithPhoneNumber(auth, `+60${formData.phone.replace(/^0+/, '')}`, window.recaptchaVerifier);
      setConfirmationResult(confirmation); setOtpSent(true);
    } catch (err) { alert('OTP failed.'); }
    setLoading(false);
  };

  const verifyOTP = async () => {
    if (!otpCode) return;
    setLoading(true);
    try { await confirmationResult.confirm(otpCode); setIsVerified(true); setOtpSent(false); } catch (err) { alert('Invalid.'); }
    setLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.size <= 5 * 1024 * 1024);
    setFormData(prev => ({...prev, insuranceFiles: [...prev.insuranceFiles, ...files]}));
  };

  const handleNext = () => {
    if (step === 4) {
      // Generate reference number once on entering Step 5
      if (!bookingRef) setBookingRef('WS2U-' + Math.floor(10000 + Math.random() * 90000));
    }
    setStep(s => Math.min(s + 1, 5));
  };
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  // IC Auto-Formatter: xxxxxx-xx-xxxx
  const formatIC = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 12);
    if (digits.length <= 6) return digits;
    if (digits.length <= 8) return `${digits.slice(0, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
  };

  // --- FINAL NORMALIZERS (Forensic Hub) ---
  const normalizeTime = (timeStr: string) => {
     if (!timeStr) return '';
     const t = timeStr.trim().replace(/\s/g, '').toUpperCase();
     // Case 1: 15:00:00.000 or 15:00
     if (t.includes(':')) {
        const p = t.split(':');
        if (t.includes('PM') || t.includes('AM')) {
           let h = parseInt(p[0]); let m = p[1].substring(0, 2); let meridiem = t.includes('PM') ? 'PM' : 'AM';
           if (meridiem === 'PM' && h < 12) h += 12; if (meridiem === 'AM' && h === 12) h = 0;
           return `${h.toString().padStart(2, '0')}:${m}`;
        }
        return `${p[0].padStart(2, '0')}:${p[1].substring(0, 2)}`;
     }
     return t.slice(0, 5);
  };

  const normalizeBranchName = (b: any) => {
     if (!b) return '';
     if (typeof b === 'string') return b.trim().toUpperCase();
     // Deep Penetrator (Forensic)
     const name = b.BranchName || b.attributes?.BranchName || b.data?.attributes?.BranchName || '';
     return name.trim().toUpperCase();
  };

  // --- DEPOSIT CALCULATOR ---
  const calcDeposit = () => {
    const p = formData.selectedPartData;
    if (!p || !p.depositRequired) return { total: p?.price || 0, deposit: 0, balance: p?.price || 0 };
    const pct = p.depositPercentage ?? 10;
    const deposit = Math.round((p.price * pct) / 100);
    return { total: p.price, deposit, balance: p.price - deposit };
  };

  // --- STEP 5 CONFIRM BOOKING ENGINE ---
  const handleConfirmBooking = async () => {
    setLoading(true);
    try {
      const { total, deposit } = calcDeposit();
      const p = formData.selectedPartData;

      // 1. Upload insurance files to Strapi Media Library
      let insuranceIds: number[] = [];
      if (formData.insuranceFiles.length > 0) {
        const uploadForm = new FormData();
        formData.insuranceFiles.forEach(f => uploadForm.append('files', f));
        const upRes = await fetch(`${STRAPI_URL}/api/upload`, { method: 'POST', body: uploadForm });
        const upData = await upRes.json();
        insuranceIds = (Array.isArray(upData) ? upData : []).map((f: any) => f.id);
      }

      // 2. Customer upsert: find by IC, else create
      let customerId: number | null = null;
      const custFind = await fetch(`${STRAPI_URL}/api/customers?filters[ICNumber][$eq]=${encodeURIComponent(formData.ic)}`);
      const custData = await custFind.json();
      if (custData.data && custData.data.length > 0) {
        customerId = custData.data[0].id;
      } else {
        const custCreate = await fetch(`${STRAPI_URL}/api/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { FullName: formData.name, ICNumber: formData.ic, Phone: formData.phone, Email: formData.email, CarPlates: [formData.plate] } })
        });
        const custNew = await custCreate.json();
        customerId = custNew.data?.id || null;
      }

      // 3. Resolve branch ID from branchRaw
      const selectedBranch = branchRaw.find(b => (b.attributes?.BranchName || b.BranchName) === formData.branch);
      const branchId = selectedBranch?.id;

      // 4. Payment via Razorpay (if deposit required)
      let curlecTxId: string | null = null;
      if (p?.depositRequired && deposit > 0) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Razorpay SDK failed'));
          document.body.appendChild(script);
        });
        curlecTxId = await new Promise<string>((resolve, reject) => {
          const rzp = new (window as any).Razorpay({
            key: 'rzp_test_SVSEvMdHnU8adF',
            amount: deposit * 100,
            currency: 'MYR',
            name: 'Windscreen2U',
            description: `Deposit for ${p.part} (${p.spec})`,
            prefill: { name: formData.name, email: formData.email, contact: `+60${formData.phone}` },
            theme: { color: '#1e3a5f' },
            handler: (response: any) => resolve(response.razorpay_payment_id),
            modal: { ondismiss: () => reject(new Error('Payment cancelled')) }
          });
          rzp.open();
        });
      }

      // 5. Write booking to Strapi
      const bookingPayload: any = {
        ReferenceNumber: bookingRef,
        Status: curlecTxId ? 'Confirmed' : 'Pending',
        AppointmentDate: formData.date,
        AppointmentTime: `${formData.time}:00.000`,
        CarPlateNumber: formData.plate,
        DriverName: formData.name,
        Phone: formData.phone,
        Email: formData.email,
        ICNumber: formData.ic,
        TotalAmount: total,
        DepositPaid: deposit,
        CurlecTransactionID: curlecTxId,
        VehicleDetailsJSON: { make: formData.make, model: formData.model, year: formData.year, part: p.part, spec: p.spec },
      };
      if (branchId) bookingPayload.BranchName = { id: branchId };
      if (customerId) bookingPayload.customer = { id: customerId };
      if (insuranceIds.length > 0) bookingPayload.InsuranceFile = insuranceIds.map(id => ({ id }));

      const bkRes = await fetch(`${STRAPI_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: bookingPayload })
      });
      const bkData = await bkRes.json();
      if (!bkRes.ok) throw new Error(bkData?.error?.message || 'Booking failed');

      // 6. Show success screen
      setBookingConfirmedData({ ...calcDeposit(), ref: bookingRef });
      setBookingSuccess(true);

    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
    setLoading(false);
  };

  // --- DATE DISPLAY FORMATTER ---
  const formatDisplayDate = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`;
  };

  // --- TIME DISPLAY FORMATTER ---
  const formatDisplayTime = (t: string) => {
    if (!t) return '';
    const [h, min] = t.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour || 12}:${min} ${hour >= 12 ? 'PM' : 'AM'}`;
  };



  // --- DATE STRING NORMALIZER (Occupancy Engine) ---
  const normalizeDateString = (d: string) => {
     if (!d) return '';
     const trimmed = d.trim();
     if (trimmed.includes('/')) {
        const parts = trimmed.split('/');
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
     }
     return trimmed.split('T')[0];
  };

  return (
    <main className="min-h-screen bg-[#fafbfc] font-poppins text-slate-900 pb-32">
      <Header />
      <div id="recaptcha-wrapper"></div>
      <div className="max-w-4xl mx-auto px-6 pt-40">
        <div className="mb-12"> <Stepper currentStep={step} /> </div>
        <div className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-[0_30px_70px_-20px_rgba(30,58,95,0.05)] border border-slate-100 relative">
          
          {step === 1 && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500 font-poppins text-slate-900">
                <div className="space-y-2.5 font-poppins"> <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1e3a5f]/60 ml-1 font-poppins">Brand</label> <Combobox options={makes} value={formData.make} onChange={(v) => setFormData({...formData, make: v})} placeholder="Select Brand" /> </div>
                <div className="space-y-2.5 font-poppins"> <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1e3a5f]/60 ml-1 font-poppins">Model</label> <Combobox options={models} value={formData.model} onChange={(v) => setFormData({...formData, model: v})} placeholder="..." disabled={!formData.make} /> </div>
                <div className="space-y-2.5 font-poppins"> <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1e3a5f]/60 ml-1 font-poppins">Year</label> <Combobox options={years} value={formData.year} onChange={(v) => setFormData({...formData, year: v})} placeholder="..." disabled={!formData.model} /> </div>
             </div>
          )}

          {step === 2 && (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-500 font-poppins text-slate-900">
                {availableParts.map((p, i) => (
                  <button key={i} onClick={() => setFormData({...formData, part: p.part, selectedPartData: p})} className={`p-5 text-left border rounded-[1.5rem] transition-all flex flex-col justify-between min-h-[110px] group ${formData.selectedPartData?.id === p.id ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 ring-1 ring-[#1e3a5f]/10' : 'border-[#1e3a5f]/10 bg-white hover:border-[#1e3a5f]/30 hover:bg-slate-50/30 shadow-sm shadow-slate-200/5'}`}>
                    <div className="space-y-1 font-poppins">
                       <h4 className="text-[11px] font-bold capitalize text-[#1e3a5f] leading-tight font-poppins">{p.part?.toLowerCase()}</h4>
                       <p className="text-[9px] font-medium text-slate-500/80 font-poppins leading-relaxed tracking-tight">{p.spec}</p>
                    </div>
                    <div className="flex justify-between items-end mt-4 font-poppins">
                       <div className="flex flex-wrap items-center gap-1.5 font-poppins">
                          <p className="text-[11px] font-black text-[#1e3a5f] font-poppins">RM {p.price}</p>
                          <span className={`text-[9px] font-bold font-poppins ${p.depositRequired ? 'text-emerald-600' : 'text-slate-400'}`}>
                             ({p.depositRequired ? 'Deposit Required' : 'No Deposit'})
                          </span>
                       </div>
                       {formData.selectedPartData?.id === p.id && <CheckCircle2 className="w-4 h-4 text-[#1e3a5f] font-poppins" />}
                    </div>
                  </button>
                ))}
             </div>
          )}

          {/* STEP 3: RECTIFIED Occupancy Guard (Recursive Match Hub) */}
          {step === 3 && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in duration-500 overflow-visible font-poppins">
                <div className="space-y-10 font-poppins">
                   <div className="space-y-2.5 font-poppins">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1e3a5f]/60 ml-1 font-poppins">Branch</label>
                      <Combobox options={branchList} value={formData.branch} onChange={(v) => { setFormData({...formData, branch: v, date: '', time: ''}); }} placeholder="Select Branch" />
                   </div>
                   
                   {formData.date && availableTimes.length > 0 ? (
                      <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-700 font-poppins">
                         <div className="flex items-center gap-2 text-[#1e3a5f]/60 ml-1 font-poppins font-black"><Clock className="w-3.5 h-3.5 font-poppins" /><label className="text-[11px] font-black uppercase tracking-widest leading-none font-poppins uppercase">Select Available Slot</label></div>
                         <div className="grid grid-cols-3 gap-3">
                            {availableTimes.map((t, i) => {
                               const gridTimeNorm = normalizeTime(t);
                               const formDateNorm = normalizeDateString(formData.date);
                               const formBranchNorm = normalizeBranchName(formData.branch);

                               const isTaken = bookingsRaw.some(bk => {
                                  const attr = bk?.attributes || bk;
                                  if (!attr) return false;

                                  // Guard: skip records with missing date or time
                                  if (!attr.AppointmentDate || !attr.AppointmentTime) return false;

                                  const bkDateNorm = normalizeDateString(attr.AppointmentDate);
                                  const bkTimeNorm = normalizeTime(attr.AppointmentTime);
                                  const bkBranchNorm = normalizeBranchName(attr.BranchName);


                                  return (bkDateNorm === formDateNorm) && (bkTimeNorm === gridTimeNorm) && (bkBranchNorm === formBranchNorm);
                               });

                               return (
                                 <button disabled={isTaken} key={i} onClick={() => setFormData({...formData, time: t})} className={`p-3.5 border rounded-2xl text-[10px] font-black transition-all relative overflow-hidden font-poppins ${isTaken ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : formData.time === t ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-lg shadow-indigo-500/10 scale-[1.02]' : 'bg-white border-slate-100 text-slate-600 hover:border-orange-500/50 hover:bg-orange-50/5'}`}>
                                    <span className={isTaken ? 'line-through decoration-slate-400 decoration-2 font-poppins' : 'font-poppins'}>{t}</span>
                                 </button>
                               );
                            })}
                         </div>
                      </div>
                   ) : (
                      <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/30 flex flex-col items-center justify-center space-y-3 opacity-60"> <CalendarDays className="w-8 h-8 text-slate-200 font-poppins" /> <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 leading-relaxed whitespace-pre-wrap font-poppins text-center font-black">Pick a Brand & Date{"\n"}to view slots</p> </div>
                   )}
                </div>
                <Calendar selectedDate={formData.date} onSelectDate={(d) => setFormData({...formData, date: d, time: ''})} blockedSpecificDates={blockedDates} blockedDaysOfWeek={blockedDays} />
             </div>
          )}

          {step === 4 && (
             <div className="space-y-10 animate-in fade-in duration-500 font-poppins">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-poppins text-slate-900 border-slate-100">
                   <div className="space-y-6">
                      <div className="space-y-2 font-poppins text-slate-900"><div className="flex items-center gap-2 text-[#1e3a5f]/60 ml-1 font-poppins"><User className="w-3.5 h-3.5 font-poppins" /><label className="text-[11px] font-bold capitalize tracking-wide font-poppins">Full Name</label></div><input className="w-full p-4 bg-white border border-[#1e3a5f]/20 rounded-2xl text-xs font-bold font-poppins text-slate-900 outline-none focus:border-[#1e3a5f] transition-all" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="As per IC" /></div>
                      <div className="space-y-2 font-poppins text-slate-900"><div className="flex items-center gap-2 text-[#1e3a5f]/60 ml-1 font-poppins"><Mail className="w-3.5 h-3.5 font-poppins" /><label className="text-[11px] font-bold capitalize tracking-wide font-poppins">Email Address</label></div><input className="w-full p-4 bg-white border border-[#1e3a5f]/20 rounded-2xl text-xs font-bold font-poppins text-slate-900 outline-none focus:border-[#1e3a5f] transition-all" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="example@mail.com" /></div>
                      <div className="space-y-2 font-poppins text-slate-900"><div className="flex items-center gap-2 text-[#1e3a5f]/60 ml-1 font-poppins"><Hash className="w-3.5 h-3.5 font-poppins" /><label className="text-[11px] font-bold capitalize tracking-wide font-poppins">IC Number</label></div><input type="text" className="w-full p-4 bg-white border border-[#1e3a5f]/20 rounded-2xl text-xs font-bold tracking-[0.3em] font-poppins text-slate-900 outline-none focus:border-[#1e3a5f] transition-all" value={formData.ic} onChange={(e) => setFormData({...formData, ic: formatIC(e.target.value)})} placeholder="xxxxxx-xx-xxxx" maxLength={14} /></div>
                   </div>
                   <div className="space-y-6">
                      <div className="space-y-2 font-poppins text-slate-900"><div className="flex items-center gap-2 text-[#1e3a5f]/60 ml-1 font-poppins"><Car className="w-3.5 h-3.5 font-poppins" /><label className="text-[11px] font-bold capitalize tracking-wide font-poppins">Plate Number</label></div><input className="w-full p-4 bg-white border border-[#1e3a5f]/20 rounded-2xl text-xs font-bold uppercase tracking-widest font-poppins text-slate-900 outline-none focus:border-[#1e3a5f] transition-all" value={formData.plate} onChange={(e) => setFormData({...formData, plate: e.target.value.toUpperCase()})} placeholder="VXX 1234" /></div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[#1e3a5f]/60 ml-1 font-poppins"><Phone className="w-3.5 h-3.5 font-poppins" /><label className="text-[11px] font-bold capitalize tracking-wide font-poppins">Phone Number</label></div>
                        <div className="flex gap-2 font-poppins font-black">
                         <div className="p-4 bg-slate-100 rounded-2xl text-[11px] font-black text-[#1e3a5f]/60 font-poppins">+60</div>
                         <input className="flex-1 p-4 bg-white border border-[#1e3a5f]/20 rounded-2xl text-xs font-bold font-poppins text-slate-900 outline-none focus:border-[#1e3a5f] transition-all" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/[^0-9]/g, '')})} placeholder="123456789" readOnly={!!user} />
                         {!isVerified && !otpSent && !user && <button onClick={sendOTP} className="px-6 bg-[#1e3a5f] text-white rounded-2xl text-[9px] font-black uppercase tracking-widest font-poppins">Verify</button>}
                         {isVerified && <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl ml-2 font-poppins font-black"><CheckCircle2 className="w-5 h-5 font-poppins font-black" /></div>}
                        </div>
                        {user && isVerified && (
                          <p className="text-[10px] font-bold text-emerald-600 capitalize ml-1 mt-1">✓ Verified via your login</p>
                        )}
                      </div>
                      {otpSent && !isVerified && !user && (
                        <div className="p-2 bg-white rounded-2xl border border-orange-200/50 flex gap-2 font-poppins mt-3 animate-in fade-in slide-in-from-top-2 duration-500">
                           <input 
                             className="flex-1 p-3 bg-slate-50 border-0 rounded-xl text-center text-sm font-bold tracking-[0.2em] outline-none font-poppins text-slate-900 placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-medium" 
                             maxLength={6} 
                             placeholder="Enter 6-digit OTP"
                             value={otpCode} 
                             onChange={(e) => setOtpCode(e.target.value)} 
                           />
                           <button 
                             onClick={verifyOTP} 
                             className="px-5 bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest font-poppins hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                           >
                              Confirm
                           </button>
                        </div>
                      )}
                   </div>
                </div>
                <div className="space-y-4 font-poppins font-black text-slate-900">
                  <div className="flex items-center gap-2 text-[#1e3a5f]/60 ml-1 font-poppins font-black">
                    <FileUp className="w-3.5 h-3.5 font-poppins font-black" />
                    <label className="text-[11px] font-bold capitalize tracking-wide font-poppins font-black">Upload Relevant Document (Max 5MB)</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-poppins font-black">
                    <label className="border-2 border-dashed border-[#1e3a5f]/20 p-10 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50/50 transition-all font-poppins font-black">
                      <FileUp className="w-8 h-8 text-slate-200 mb-3 font-poppins font-black" />
                      <span className="text-[11px] font-bold capitalize text-[#1e3a5f]/40 tracking-widest font-poppins font-black underline decoration-2">Upload Files (Support pdf, jpg, png)</span>
                      <input type="file" multiple className="hidden font-poppins font-black" onChange={handleFileUpload} accept="image/*,application/pdf" />
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar font-poppins font-black text-slate-900">
                      {formData.insuranceFiles.map((file, i) => (
                        <div key={i} className="p-4 bg-white border border-[#1e3a5f]/10 rounded-2xl flex items-center justify-between font-poppins font-black">
                          <div className="flex items-center gap-3 overflow-hidden text-ellipsis font-poppins font-black">
                            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-[8px] font-black text-slate-300 font-poppins font-black">DOC</div>
                            <p className="text-[10px] font-bold text-[#1e3a5f] truncate font-poppins font-black">{file.name}</p>
                          </div>
                          <button onClick={() => setFormData(prev => ({...prev, insuranceFiles: prev.insuranceFiles.filter((_, idx) => idx !== i)}))} className="p-2 text-slate-300 hover:text-red-500 transition-all font-poppins font-black">
                            <X className="w-4 h-4 font-poppins font-black" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
             </div>
          )}

           {/* ===== STEP 5: SUMMARY & CONFIRM ===== */}
           {step === 5 && !bookingSuccess && (() => {
             const { total, deposit, balance } = calcDeposit();
             const p = formData.selectedPartData;
             return (
               <div className="animate-in fade-in duration-500 space-y-8 font-poppins">
                 {/* Section Title */}
                 <div className="text-center">
                   <p className="text-base font-black capitalize tracking-wide text-[#1e3a5f] font-poppins">Appointment Summary</p>
                 </div>
                 <div className="border border-[#1e3a5f]/10 rounded-[1.5rem] overflow-hidden">
                   {[
                     { label: 'Reference No.', value: bookingRef },
                     { label: 'Make / Model', value: `${formData.make} ${formData.model} · ${formData.year}` },
                     { label: 'Part', value: `${p?.part} ${p?.spec ? `(${p.spec})` : ''}` },
                     { label: 'Branch', value: formData.branch },
                     { label: 'Appointment', value: `${formatDisplayDate(formData.date)}  |  ${formatDisplayTime(formData.time)}` },
                     { label: 'Car Plate', value: formData.plate },
                     { label: 'Full Name', value: formData.name },
                   ].map((row, i) => (
                     <div key={i} className={`flex items-start px-6 py-4 gap-4 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                       <span className="text-[12px] font-bold capitalize tracking-wide text-[#1e3a5f] w-32 shrink-0 pt-0.5 font-poppins">{row.label}</span>
                       <span className="text-[12px] font-bold text-[#1e3a5f] font-poppins capitalize">{row.value}</span>
                     </div>
                   ))}
                   {/* Pricing Strip — Dark Navy */}
                   <div className="border-t border-[#1e3a5f] bg-[#1e3a5f] px-6 py-5 space-y-2.5">
                     <div className="flex justify-between"><span className="text-[12px] font-bold capitalize tracking-wide text-white/70 font-poppins">Total</span><span className="text-[12px] font-black text-white font-poppins">RM {total.toFixed(2)}</span></div>
                     {deposit > 0 && <div className="flex justify-between"><span className="text-[12px] font-bold capitalize tracking-wide text-emerald-300 font-poppins">Deposit Now</span><span className="text-[12px] font-black text-emerald-300 font-poppins">RM {deposit.toFixed(2)}</span></div>}
                     {deposit > 0 && <div className="flex justify-between"><span className="text-[12px] font-bold capitalize tracking-wide text-white/50 font-poppins">Balance on Day</span><span className="text-[12px] font-black text-white/80 font-poppins">RM {balance.toFixed(2)}</span></div>}
                   </div>
                 </div>
                 <div className="flex justify-center">
                   <button onClick={handleConfirmBooking} disabled={loading} className="px-12 py-4 bg-[#1e3a5f] hover:bg-[#152a45] text-white rounded-2xl text-[10px] font-black capitalize tracking-[0.2em] shadow-xl shadow-[#1e3a5f]/20 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed font-poppins">
                     {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                     {loading ? 'Processing...' : 'Payment & Confirm'}
                   </button>
                 </div>
               </div>
             );
           })()}

           {/* ===== SUCCESS SCREEN ===== */}
           {bookingSuccess && bookingConfirmedData && (() => {
             const { total, deposit, balance } = bookingConfirmedData;
             const p = formData.selectedPartData;
             return (
               <div className="animate-in fade-in zoom-in-95 duration-700 flex flex-col items-center text-center space-y-8 py-8 font-poppins">
                 <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                   <CheckCircle2 className="w-10 h-10 text-emerald-500" strokeWidth={1.5} />
                 </div>
                 <div className="space-y-1">
                   <h2 className="text-xl font-black text-[#1e3a5f] font-poppins">Booking Confirmed!</h2>
                   <p className="text-[11px] font-medium text-slate-500 font-poppins">Your appointment has been registered successfully</p>
                 </div>
                 <div className="w-full border border-[#1e3a5f]/10 rounded-[1.5rem] overflow-hidden text-left">
                   {[
                     { label: 'Reference No.', value: bookingConfirmedData.ref },
                     { label: 'Make / Model', value: `${formData.make} ${formData.model} · ${formData.year}` },
                     { label: 'Part', value: `${p?.part} ${p?.spec ? `(${p.spec})` : ''}` },
                     { label: 'Branch', value: formData.branch },
                     { label: 'Appointment', value: `${formatDisplayDate(formData.date)}  |  ${formatDisplayTime(formData.time)}` },
                   ].map((row, i) => (
                     <div key={i} className={`flex items-start px-6 py-3.5 gap-4 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                       <span className="text-[12px] font-bold capitalize tracking-wide text-[#1e3a5f] w-32 shrink-0 pt-0.5 font-poppins">{row.label}</span>
                       <span className="text-[11px] font-bold text-[#1e3a5f] font-poppins capitalize">{row.value}</span>
                     </div>
                   ))}
                   <div className="border-t border-[#1e3a5f] bg-[#1e3a5f] px-6 py-5 space-y-2.5">
                     <div className="flex justify-between"><span className="text-[12px] font-bold capitalize tracking-wide text-white/70 font-poppins">Deposit Paid</span><span className="text-[12px] font-black text-emerald-300 font-poppins">{deposit > 0 ? `RM ${deposit.toFixed(2)}` : 'None'}</span></div>
                     <div className="flex justify-between"><span className="text-[12px] font-bold capitalize tracking-wide text-white/50 font-poppins">Balance Due</span><span className="text-[12px] font-black text-white/80 font-poppins">RM {balance.toFixed(2)}</span></div>
                   </div>
                 </div>
                 <button onClick={() => router.push('/dashboard')} className="px-10 py-3.5 bg-[#1e3a5f] hover:bg-[#152a45] text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-xl shadow-[#1e3a5f]/20 transition-all flex items-center gap-2 font-poppins">
                   Go to My Dashboard <ChevronRight className="w-3.5 h-3.5" />
                 </button>
               </div>
             );
           })()}

          <div className="flex gap-4 pt-10 mt-10 border-t border-slate-50 justify-end font-poppins">
             {step > 1 && !bookingSuccess && (
               <button onClick={handlePrev} className="flex items-center gap-2 px-6 py-3.5 bg-transparent hover:text-orange-500 text-[#1e3a5f] rounded-2xl text-[9px] font-extrabold uppercase tracking-widest transition-all font-poppins font-black">
                 <ChevronLeft className="w-3.5 h-3.5" />
                 Back
               </button>
             )}
             {step < 5 && (
               <button 
                 onClick={handleNext} 
                 disabled={
                   (step === 1 && (!formData.make || !formData.model || !formData.year)) ||
                   (step === 2 && !formData.selectedPartData) ||
                   (step === 3 && (!formData.branch || !formData.date || !formData.time)) ||
                   (step === 4 && (!formData.name || !formData.email || !formData.ic || !formData.plate || !formData.phone || !isVerified))
                 }
                 className={`w-40 md:w-44 py-3.5 bg-[#1e3a5f] hover:bg-[#152a45] text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] shadow-xl shadow-[#1e3a5f]/20 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed font-poppins font-black`}
               >
                 {loading ? <Loader2 className="w-4 h-4 animate-spin font-poppins font-black" /> : 'Next'}
               </button>
             )}
          </div>
        </div>
      </div>
    </main>
  );
}
