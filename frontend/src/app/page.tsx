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
    selectedBranchData: null as any,
    paymentMode: 'Cash' as 'Cash' | 'Insurance',
    priceType: 'Original' as 'Original' | 'Aftermarket'
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
      const filtered = vehicleRaw.filter(v => (v.attributes?.Make?.toUpperCase() || v.Make?.toUpperCase()) === formData.make && (v.attributes?.Model || v.Model) === formData.model && (v.attributes?.Year?.toString() || v.Year?.toString()) === formData.year);
      
      const parts = filtered.map(v => ({
         id: v.id, 
         part: v.attributes?.Part || v.Part, 
         spec: v.attributes?.Spec_Variant || v.Spec_Variant || 'Standard', 
         price_original: v.attributes?.Price_Original || v.Price_Original || 0,
         price_aftermarket: v.attributes?.Price_Aftermarket || v.Price_Aftermarket || 0,
         depositRequired: v.attributes?.Deposit_Required ?? (v.Deposit_Required === "true" || v.Deposit_Required === true) ?? false, 
         depositPercentage: v.attributes?.Deposit_Percentage ?? v.Deposit_Percentage ?? 10
      }));

      // Check if any matching model has a Repair_Price
      const repairPrice = filtered[0]?.attributes?.Repair_Price || filtered[0]?.Repair_Price;
      if (repairPrice && repairPrice > 0) {
        parts.unshift({
           id: 'REPAIR-' + (filtered[0]?.documentId || filtered[0]?.id),
           part: 'Windscreen Repair',
           spec: 'Chip or Small Crack Fix',
           price_original: parseFloat(repairPrice),
           price_aftermarket: 0,
           depositRequired: false,
           depositPercentage: 0
        });
      }
      setAvailableParts(parts);
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
             const parts = t.split('-');
             if (parts.length !== 3) return null;
             // If already YYYY-MM-DD (first part is 4 digits)
             if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
             // Otherwise assume DD-MM-YYYY
             const [d, m, y] = parts;
             return (d && m && y) ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : null;
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
    if (!p) return { total: 0, deposit: 0, balance: 0 };
    
    // Choose selected price based on priceType
    const selectedPrice = (formData.priceType === 'Aftermarket' && p.price_aftermarket > 0) 
      ? p.price_aftermarket 
      : p.price_original;

    if (!p.depositRequired) return { total: selectedPrice, deposit: 0, balance: selectedPrice };
    const pct = p.depositPercentage ?? 10;
    const deposit = Math.round((selectedPrice * pct) / 100);
    return { total: selectedPrice, deposit, balance: selectedPrice - deposit };
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

      // 4. Payment via Razorpay (IF CASH MODE + DEPOSIT REQ)
      let curlecTxId: string | null = null;
      if (formData.paymentMode === 'Cash' && p?.depositRequired && deposit > 0) {
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
            theme: { color: '#f97316' },
            handler: (response: any) => resolve(response.razorpay_payment_id),
            modal: { ondismiss: () => reject(new Error('Payment cancelled')) }
          });
          rzp.open();
        });
      }

      // 5. Write booking to Strapi
      const bookingPayload: any = {
        ReferenceNumber: bookingRef,
        Status: formData.paymentMode === 'Insurance' ? 'Pending' : (curlecTxId ? 'Confirmed' : 'Pending'),
        PaymentMode: formData.paymentMode,
        AppointmentDate: formData.date,
        AppointmentTime: `${formData.time}:00.000`,
        CarPlateNumber: formData.plate,
        DriverName: formData.name,
        Phone: formData.phone,
        Email: formData.email,
        ICNumber: formData.paymentMode === 'Insurance' ? formData.ic : undefined,
        TotalAmount: total,
        DepositPaid: formData.paymentMode === 'Insurance' ? 0 : deposit,
        CurlecTransactionID: curlecTxId,
        VehicleDetailsJSON: { 
          make: formData.make?.trim(), 
          model: formData.model?.trim(),
          year: formData.year?.trim(), 
          part: p.part?.trim(), 
          spec: p.spec?.trim() || '',
          priceType: formData.priceType
        },
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

      // 6. Show success screen - Pass paymentMode to success data
      setBookingConfirmedData({ ...calcDeposit(), ref: bookingRef, paymentMode: formData.paymentMode });
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
    <main className="min-h-screen bg-white font-inter text-slate-900 flex flex-col">
      <Header />
      <div id="recaptcha-wrapper"></div>
      <div className="flex-1 max-w-5xl mx-auto px-6 pt-40 w-full mb-20">
        <div className="bg-white p-8 md:p-14 rounded-[45px] shadow-[0_20px_70px_-10px_rgba(30,58,95,0.08)] border border-slate-100 relative">
          
          {/* Wizard Header (Inside Card) */}
          <div className="text-center mb-24">
            <h1 className="text-3xl md:text-4xl font-black font-inter text-primary tracking-tighter mb-12">
              Book Your Appointment
            </h1>
            <Stepper currentStep={step} />
          </div>
          
          <div className="relative">
          
          {step === 1 && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500 font-inter text-slate-900">
                <div className="space-y-6 font-inter"> <label className="text-[13px] font-black capitalize text-primary ml-1 font-inter">Car Make</label> <Combobox options={makes} value={formData.make} onChange={(v) => setFormData({...formData, make: v})} placeholder="Select Car Make" emptyMessage="Car make not found" /> </div>
                <div className="space-y-6 font-inter"> <label className="text-[13px] font-black capitalize text-primary ml-1 font-inter">Model</label> <Combobox options={models} value={formData.model} onChange={(v) => setFormData({...formData, model: v})} placeholder="Select Model" disabled={!formData.make} emptyMessage="Model not found" /> </div>
                <div className="space-y-6 font-inter"> <label className="text-[13px] font-black capitalize text-primary ml-1 font-inter">Year</label> <Combobox options={years} value={formData.year} onChange={(v) => setFormData({...formData, year: v})} placeholder="Select Year" disabled={!formData.model} emptyMessage="Year not found" /> </div>
             </div>
          )}

          {step === 2 && (
             <div className="space-y-8 animate-in fade-in duration-500">
                {/* Price Type Toggle */}
                <div className="flex justify-center">
                    <div className="bg-slate-100 p-1.5 rounded-3xl flex items-center border border-slate-200">
                       <button 
                         onClick={() => setFormData({...formData, priceType: 'Original'})}
                         className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all ${formData.priceType === 'Original' ? 'bg-white text-primary shadow-lg shadow-primary/5' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                         Original Parts
                       </button>
                       <button 
                         onClick={() => setFormData({...formData, priceType: 'Aftermarket'})}
                         className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all ${formData.priceType === 'Aftermarket' ? 'bg-white text-primary shadow-lg shadow-primary/5' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                         Aftermarket
                       </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-inter text-slate-900">
                   {availableParts.map((p, i) => {
                     const hasAftermarket = p.price_aftermarket > 0;
                     const displayPrice = formData.priceType === 'Aftermarket' && hasAftermarket ? p.price_aftermarket : p.price_original;
                     const isSelected = formData.selectedPartData?.id === p.id;

                     return (
                       <button key={i} onClick={() => setFormData({...formData, part: p.part, selectedPartData: p})} className={`p-6 text-left border rounded-[28px] transition-all flex flex-col justify-between min-h-[170px] group relative ${isSelected ? 'border-accent bg-accent/5 ring-1 ring-accent/10 shadow-xl shadow-accent/5' : 'border-slate-100 bg-white hover:border-accent/40 hover:bg-slate-50/50 shadow-sm'}`}>
                         <div className="space-y-1.5 font-inter">
                            <h4 className="text-[14px] font-black capitalize text-primary leading-tight font-inter">{p.part?.toLowerCase()}</h4>
                            <p className="text-[11px] font-semibold text-slate-400 font-inter leading-relaxed tracking-tight">{p.spec}</p>
                         </div>
                         
                         <div className="mt-4 space-y-2">
                            {formData.priceType === 'Aftermarket' && hasAftermarket && (
                               <p className="text-[10px] font-bold text-slate-300 line-through">RM {p.price_original}</p>
                            )}
                            <div className="flex justify-between items-center font-inter">
                               <div className="flex flex-col gap-1.5 font-inter">
                                  <p className="text-[16px] font-black text-primary font-inter">RM {displayPrice}</p>
                                  <div className="flex">
                                     <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-emerald-500 text-white shadow-lg shadow-emerald-500/10">
                                        {p.depositRequired ? 'Deposit Required' : 'No Deposit'}
                                     </span>
                                  </div>
                               </div>
                               {isSelected && <CheckCircle2 className="w-5 h-5 text-accent font-inter" />}
                            </div>
                            {formData.priceType === 'Original' && hasAftermarket && (
                               <p className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter pt-1">Aftermarket Available: RM {p.price_aftermarket}</p>
                            )}
                         </div>
                       </button>
                     );
                   })}
                </div>
             </div>
          )}

          {/* STEP 3: RECTIFIED Occupancy Guard (Recursive Match Hub) */}
          {step === 3 && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in duration-500 overflow-visible font-inter">
                <div className="space-y-10 font-inter">
                   <div className="space-y-2.5 font-inter">
                       <label className="text-[11px] font-black capitalize text-primary ml-1 font-inter">Branch</label>
                      <Combobox options={branchList} value={formData.branch} onChange={(v) => { setFormData({...formData, branch: v, date: '', time: ''}); }} placeholder="Select Branch" emptyMessage="Branch not found" />
                   </div>
                   
                   {formData.date && availableTimes.length > 0 ? (
                      <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-700 font-inter">
                          <div className="flex items-center gap-2 text-primary ml-1 font-inter font-black"><Clock className="w-3.5 h-3.5 font-inter" /><label className="text-[11px] font-black capitalize tracking-tight leading-none font-inter">Select Available Slot</label></div>
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
                                 <button disabled={isTaken} key={i} onClick={() => setFormData({...formData, time: t})} className={`p-3.5 border rounded-2xl text-[10px] font-black transition-all relative overflow-hidden font-inter ${isTaken ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : formData.time === t ? 'bg-accent text-white border-accent shadow-lg shadow-accent/10 scale-[1.02]' : 'bg-white border-slate-100 text-slate-600 hover:border-accent/50 hover:bg-accent/5'}`}>
                                    <span className={isTaken ? 'line-through decoration-slate-400 decoration-2 font-inter' : 'font-inter'}>{t}</span>
                                 </button>
                               );
                            })}
                         </div>
                      </div>
                   ) : (
                       <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/30 flex flex-col items-center justify-center space-y-3 opacity-60"> <CalendarDays className="w-8 h-8 text-slate-200 font-inter" /> <p className="text-[9px] font-black capitalize tracking-tight text-slate-300 leading-relaxed whitespace-pre-wrap font-inter text-center">Pick a Car Make & Date{"\n"}to view slots</p> </div>
                   )}
                </div>
                <Calendar selectedDate={formData.date} onSelectDate={(d) => setFormData({...formData, date: d, time: ''})} blockedSpecificDates={blockedDates} blockedDaysOfWeek={blockedDays} />
             </div>
          )}

          {step === 4 && (
            <div className="space-y-12 animate-in fade-in duration-500 font-inter">
              
              {/* PAYMENT MODE SELECTOR */}
               <div className="flex flex-col items-center gap-6">
                <label className="text-[12px] font-black uppercase tracking-[0.2em] text-primary">Select Payment Method</label>
                <div className="flex bg-slate-100 p-1.5 rounded-3xl w-full max-w-md border border-slate-200">
                  <button 
                    onClick={() => setFormData({...formData, paymentMode: 'Cash'})}
                    className={`flex-1 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.paymentMode === 'Cash' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-primary/40 hover:text-primary'}`}
                  >
                    Cash Payment
                  </button>
                  <button 
                    onClick={() => setFormData({...formData, paymentMode: 'Insurance'})}
                    className={`flex-1 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.paymentMode === 'Insurance' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-primary/40 hover:text-primary'}`}
                  >
                    Insurance Claim
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-inter text-slate-900 border-slate-100">
                <div className="space-y-6">
                  <div className="space-y-2 font-inter text-slate-900">
                    <div className="flex items-center gap-2 text-primary ml-1 font-inter"><User className="w-3.5 h-3.5 font-inter" /><label className="text-[11px] font-bold capitalize tracking-wide font-inter">Full Name</label></div>
                    <input className="w-full p-4 bg-white border border-primary/20 rounded-2xl text-xs font-bold font-inter text-slate-900 outline-none focus:border-accent transition-all placeholder:text-slate-500" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="As per IC" />
                  </div>
                  <div className="space-y-2 font-inter text-slate-900">
                    <div className="flex items-center gap-2 text-primary ml-1 font-inter"><Mail className="w-3.5 h-3.5 font-inter" /><label className="text-[11px] font-bold capitalize tracking-wide font-inter">Email Address</label></div>
                    <input className="w-full p-4 bg-white border border-primary/20 rounded-2xl text-xs font-bold font-inter text-slate-900 outline-none focus:border-accent transition-all placeholder:text-slate-500" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="example@mail.com" />
                  </div>
                  
                  {formData.paymentMode === 'Insurance' && (
                    <div className="space-y-2 font-inter text-slate-900 animate-in slide-in-from-top-4">
                      <div className="flex items-center gap-2 text-primary ml-1 font-inter"><Hash className="w-3.5 h-3.5 font-inter" /><label className="text-[11px] font-bold capitalize tracking-wide font-inter">IC Number</label></div>
                      <input type="text" className="w-full p-4 bg-white border border-primary/20 rounded-2xl text-xs font-bold tracking-[0.3em] font-inter text-slate-900 outline-none focus:border-accent transition-all placeholder:text-slate-500" value={formData.ic} onChange={(e) => setFormData({...formData, ic: formatIC(e.target.value)})} placeholder="xxxxxx-xx-xxxx" maxLength={14} />
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="space-y-2 font-inter text-slate-900">
                    <div className="flex items-center gap-2 text-primary ml-1 font-inter"><Car className="w-3.5 h-3.5 font-inter" /><label className="text-[11px] font-bold capitalize tracking-wide font-inter">Plate Number</label></div>
                    <input className="w-full p-4 bg-white border border-primary/20 rounded-2xl text-xs font-bold uppercase tracking-widest font-inter text-slate-900 outline-none focus:border-accent transition-all" value={formData.plate} onChange={(e) => setFormData({...formData, plate: e.target.value.toUpperCase()})} placeholder="VXX 1234" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary ml-1 font-inter"><Phone className="w-3.5 h-3.5 font-inter" /><label className="text-[11px] font-bold capitalize tracking-wide font-inter">Phone Number</label></div>
                    <div className={`flex items-center bg-white border rounded-2xl overflow-hidden transition-all ${user ? 'bg-slate-50 border-primary/10' : 'border-primary/20 focus-within:border-accent'}`}>
                      <div className="p-4 bg-slate-50/50 border-r border-primary/10 text-[11px] font-black text-primary font-inter">+60</div>
                      <input 
                        className="flex-1 p-4 bg-transparent text-xs font-bold font-inter text-slate-900 outline-none placeholder:text-slate-500" 
                        value={formData.phone} 
                        onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/[^0-9]/g, '')})} 
                        placeholder="123456789" 
                        readOnly={!!user} 
                      />
                      {!isVerified && !otpSent && !user && (
                        <button onClick={sendOTP} className="mr-2 px-6 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest font-inter hover:bg-accent transition-all">Verify</button>
                      )}
                      {isVerified && <div className="px-4 text-emerald-600 font-inter font-black"><CheckCircle2 className="w-5 h-5 font-inter font-black" /></div>}
                    </div>
                    {user && isVerified && (
                      <p className="text-[10px] font-bold text-emerald-600 capitalize ml-1 mt-1">✓ Verified via your login</p>
                    )}
                  </div>
                  {otpSent && !isVerified && !user && (
                    <div className="p-2 bg-white rounded-2xl border border-orange-200/50 flex gap-2 font-inter mt-3 animate-in fade-in slide-in-from-top-2 duration-500">
                       <input 
                         className="flex-1 p-3 bg-slate-50 border-0 rounded-xl text-center text-sm font-bold tracking-[0.2em] outline-none font-inter text-slate-900 placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-medium" 
                         maxLength={6} 
                         placeholder="OTP Code"
                         value={otpCode} 
                         onChange={(e) => setOtpCode(e.target.value)} 
                       />
                       <button onClick={handleFileUpload} className="px-5 bg-accent text-white rounded-xl text-[9px] font-black uppercase tracking-widest font-inter hover:bg-primary transition-all shadow-lg shadow-accent/20">Confirm</button>
                    </div>
                  )}
                </div>
              </div>

              {formData.paymentMode === 'Insurance' && (
                <div className="space-y-6 font-inter font-black text-slate-900 animate-in zoom-in-95">
                  <div className="flex items-center gap-2 text-primary ml-1 font-inter font-black">
                    <FileUp className="w-3.5 h-3.5 font-inter font-black" />
                    <label className="text-[11px] font-bold capitalize tracking-wide font-inter font-black text-xs">Upload Insurance Policy & Documents (Required for Claims)</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-inter font-black">
                    <label className="border-2 border-dashed border-primary/20 p-10 rounded-[30px] flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50/50 transition-all font-inter font-black">
                      <FileUp className="w-8 h-8 text-slate-200 mb-3 font-inter font-black" />
                      <span className="text-[11px] font-bold capitalize text-primary/40 tracking-widest font-inter font-black underline decoration-2 text-center">Add Claim Documents</span>
                      <input type="file" multiple className="hidden font-inter font-black" onChange={handleFileUpload} accept="image/*,application/pdf" />
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar font-inter font-black text-slate-900 bg-slate-50/50 p-4 rounded-[2rem]">
                      {formData.insuranceFiles.map((file, i) => (
                        <div key={i} className="p-4 bg-white border border-primary/10 rounded-2xl flex items-center justify-between font-inter font-black">
                          <div className="flex items-center gap-3 overflow-hidden text-ellipsis font-inter font-black">
                            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-[8px] font-black text-slate-300 font-inter font-black">DOC</div>
                            <p className="text-[10px] font-bold text-primary truncate font-inter font-black">{file.name}</p>
                          </div>
                          <button onClick={() => setFormData(prev => ({...prev, insuranceFiles: prev.insuranceFiles.filter((_, idx) => idx !== i)}))} className="p-2 text-slate-300 hover:text-red-500 transition-all font-inter font-black">
                             <X className="w-4 h-4 font-inter font-black" />
                          </button>
                        </div>
                      ))}
                      {formData.insuranceFiles.length === 0 && (
                        <p className="text-[10px] text-slate-300 italic text-center mt-8">No documents uploaded yet</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

           {/* ===== STEP 5: SUMMARY & CONFIRM ===== */}
           {step === 5 && !bookingSuccess && (() => {
             const { total, deposit, balance } = calcDeposit();
             const p = formData.selectedPartData;
             return (
               <div className="animate-in fade-in duration-500 space-y-8 font-inter">
                 {/* Section Title */}
                 <div className="text-center">
                   <p className="text-base font-black capitalize tracking-wide text-primary font-inter">Appointment Summary</p>
                 </div>
                 <div className="border border-primary/10 rounded-[1.5rem] overflow-hidden">
                   {[
                     { label: 'Reference No.', value: bookingRef },
                     { label: 'Make / Model', value: `${formData.make} ${formData.model} · ${formData.year}` },
                     { label: 'Part', value: `${p?.part} ${p?.spec ? `(${p.spec})` : ''} · ${formData.priceType} Part` },
                     { label: 'Branch', value: formData.branch },
                     { label: 'Appointment', value: `${formatDisplayDate(formData.date)}  |  ${formatDisplayTime(formData.time)}` },
                     { label: 'Car Plate', value: formData.plate },
                     { label: 'Full Name', value: formData.name },
                   ].map((row, i) => (
                     <div key={i} className={`flex items-start px-6 py-4 gap-4 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                       <span className="text-[12px] font-bold capitalize tracking-wide text-primary w-32 shrink-0 pt-0.5 font-inter">{row.label}</span>
                       <span className="text-[12px] font-bold text-primary font-inter capitalize">{row.value}</span>
                     </div>
                   ))}
                   {/* Pricing Strip — Primary */}
                   <div className={formData.paymentMode === "Cash" ? "border-t border-primary bg-primary px-6 py-5 space-y-2.5" : "hidden"}>
                     <div className="flex justify-between"><span className="text-[12px] font-bold capitalize tracking-wide text-white/70 font-inter">Total</span><span className="text-[12px] font-black text-white font-inter">RM {total.toFixed(2)}</span></div>
                     {deposit > 0 && <div className="flex justify-between"><span className="text-[12px] font-bold capitalize tracking-wide text-accent font-inter">Deposit Now</span><span className="text-[12px] font-black text-accent font-inter">RM {deposit.toFixed(2)}</span></div>}
                     {deposit > 0 && <div className="flex justify-between"><span className="text-[12px] font-bold capitalize tracking-wide text-white/50 font-inter">Balance on Day</span><span className="text-[12px] font-black text-white/80 font-inter">RM {balance.toFixed(2)}</span></div>}
                   </div>
                 </div>
                 {formData.paymentMode === "Insurance" && <div className="border-t border-emerald-100 bg-emerald-50/50 px-6 py-4 flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-emerald-600" /><p className="text-[11px] font-bold text-emerald-800">Insurance Claim Mode: Submission will be RM 0.00 today.</p></div>}
                 <div className="flex justify-center">
                   <button onClick={handleConfirmBooking} disabled={loading} className="px-14 py-5 bg-primary hover:bg-accent text-white rounded-2xl text-[12px] font-semibold capitalize tracking-[0.2em] shadow-xl shadow-primary/20 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed font-inter">
                     {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                     {loading ? 'Processing...' : (formData.paymentMode === 'Insurance' ? 'Submit Claim Request' : 'Proceed Payment')}
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
               <div className="animate-in fade-in zoom-in-95 duration-700 flex flex-col items-center text-center space-y-8 py-8 font-inter">
                 <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                   <CheckCircle2 className="w-10 h-10 text-emerald-500" strokeWidth={1.5} />
                 </div>
                 <div className="space-y-1">
                   <h2 className="text-xl font-black text-primary font-inter">{bookingConfirmedData.paymentMode === "Insurance" ? "Claim Submitted!" : "Booking Confirmed!"}</h2>
                   <p className="text-[11px] font-medium text-slate-500 font-inter">{bookingConfirmedData.paymentMode === "Insurance" ? "Our team will audit your claim and contact you shortly." : "Your appointment has been registered successfully"}</p>
                 </div>
                 <div className="w-full border border-primary/10 rounded-[1.5rem] overflow-hidden text-left">
                   {[
                     { label: 'Reference No.', value: bookingConfirmedData.ref },
                     { label: 'Make / Model', value: `${formData.make} ${formData.model} · ${formData.year}` },
                     { label: 'Part', value: `${p?.part} ${p?.spec ? `(${p.spec})` : ''}` },
                     { label: 'Branch', value: formData.branch },
                     { label: 'Appointment', value: `${formatDisplayDate(formData.date)}  |  ${formatDisplayTime(formData.time)}` },
                   ].map((row, i) => (
                     <div key={i} className={`flex items-start px-6 py-3.5 gap-4 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                       <span className="text-[12px] font-bold capitalize tracking-wide text-primary w-32 shrink-0 pt-0.5 font-inter">{row.label}</span>
                       <span className="text-[11px] font-bold text-primary font-inter capitalize">{row.value}</span>
                     </div>
                   ))}
                   <div className={bookingConfirmedData.paymentMode === "Cash" ? "border-t border-primary bg-primary px-6 py-5 space-y-2.5" : "hidden"}>
                     <div className="flex justify-between"><span className="text-[12px] font-bold capitalize tracking-wide text-white/70 font-inter">Deposit Paid</span><span className="text-[12px] font-black text-accent font-inter">{deposit > 0 ? `RM ${deposit.toFixed(2)}` : 'None'}</span></div>
                     <div className="flex justify-between"><span className="text-[12px] font-bold capitalize tracking-wide text-white/50 font-inter">Balance Due</span><span className="text-[12px] font-black text-white/80 font-inter">RM {balance.toFixed(2)}</span></div>
                   </div>
                   {bookingConfirmedData.paymentMode === "Insurance" && <div className="border-t border-emerald-100 bg-emerald-50 px-6 py-5 flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-600" /><span className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest leading-none">Claim Recorded (RM 0.00 Paid Today)</span></div>}
                 </div>
                 <button onClick={() => router.push('/dashboard')} className="px-10 py-3.5 bg-primary hover:bg-accent text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all flex items-center gap-2 font-inter">
                   Go to My Dashboard <ChevronRight className="w-3.5 h-3.5" />
                 </button>
               </div>
             );
           })()}

           <div className="flex gap-4 pt-4 mt-4 justify-end font-inter">
             {step > 1 && !bookingSuccess && (
               <button onClick={handlePrev} className="flex items-center gap-2 px-6 py-3.5 bg-transparent hover:text-orange-500 text-[#f97316] rounded-2xl text-[9px] font-extrabold uppercase tracking-widest transition-all font-inter font-black">
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
                   (step === 4 && (
                     !formData.name || !formData.email || !formData.plate || !formData.phone || !isVerified ||
                     (formData.paymentMode === 'Insurance' && (!formData.ic || formData.insuranceFiles.length === 0))
                   ))
                 }
                 className={`w-40 md:w-44 py-3.5 bg-primary hover:bg-accent text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed font-inter font-black`}
               >
                 {loading ? <Loader2 className="w-4 h-4 animate-spin font-inter font-black" /> : 'Next'}
               </button>
             )}
          </div>
        </div>
      </div>

      </div>
 
      <footer className="w-full text-center py-6 bg-primary">
        <p className="text-[11px] font-semibold text-white uppercase tracking-[0.2em] font-inter">
          Copyright 2026 Windscreen2u
        </p>
      </footer>
    </main>
  );
}
