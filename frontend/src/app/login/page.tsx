'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, ChevronRight, CheckCircle2, Loader2, User, Mail, Hash, AlertCircle } from 'lucide-react';
import Header from '../../components/Header';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

declare global { interface Window { recaptchaVerifier: any; } }

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1338';

type Stage = 'phone' | 'otp' | 'newUser' | 'done';

const formatIC = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  if (digits.length <= 6) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
};

export default function LoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newProfile, setNewProfile] = useState({ fullName: '', ic: '', email: '' });

  // Already logged in → skip to dashboard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) router.replace('/dashboard');
    });
    return () => unsub();
  }, [router]);

  const sendOTP = async () => {
    if (!phone || phone.length < 9) return setError('Enter a valid phone number.');
    setError('');
    setLoading(true);
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-wrapper', { size: 'invisible' });
      }
      const result = await signInWithPhoneNumber(auth, `+60${phone.replace(/^0+/, '')}`, window.recaptchaVerifier);
      setConfirmationResult(result);
      setStage('otp');
    } catch (e: any) {
      setError('Failed to send OTP. Please try again.');
      window.recaptchaVerifier = null;
    }
    setLoading(false);
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) return setError('Enter the 6-digit OTP.');
    setError('');
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      // Check if customer exists in Strapi
      const cleanPhone = phone.replace(/^0+/, '');
      const res = await fetch(`${STRAPI_URL}/api/customers?filters[Phone][$eq]=${cleanPhone}`);
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        // Existing customer → go to dashboard
        router.replace('/dashboard');
      } else {
        // New customer → show profile form
        setStage('newUser');
      }
    } catch (e: any) {
      setError('Invalid OTP. Please try again.');
    }
    setLoading(false);
  };

  const saveNewProfile = async () => {
    if (!newProfile.fullName || !newProfile.ic) return setError('Full Name and IC Number are required.');
    setError('');
    setLoading(true);
    try {
      const cleanPhone = phone.replace(/^0+/, '');
      await fetch(`${STRAPI_URL}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            FullName: newProfile.fullName,
            ICNumber: newProfile.ic,
            Email: newProfile.email || null,
            Phone: cleanPhone,
          }
        })
      });
      router.replace('/dashboard');
    } catch {
      setError('Could not save profile. Please try again.');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#fafbfc] font-inter flex flex-col">
      <Header />
      <div id="recaptcha-wrapper" />

      <div className="flex-1 flex items-center justify-center px-6 pt-28 pb-12">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Card */}
          <div className="bg-white border border-[#1e3a5f]/10 rounded-[2.5rem] p-10 space-y-8 shadow-xl shadow-[#1e3a5f]/5">
            
            {/* Header moved inside card */}
            <div className="mb-2">
              <h1 className="text-xl font-black text-[#1e3a5f] capitalize tracking-tight">
                {stage === 'newUser' ? 'Complete Profile' : 'Welcome Back'}
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {stage === 'phone' && 'Sign in with your mobile number'}
                {stage === 'otp' && `OTP sent to +60${phone}`}
                {stage === 'newUser' && 'A few details to get started'}
              </p>
            </div>

            {/* ── STAGE: Phone ── */}
            {stage === 'phone' && (
              <div className="space-y-6 pt-2">
                <div className="space-y-2">
                  <div className="flex border border-[#1e3a5f]/10 rounded-2xl overflow-hidden bg-slate-50/30 focus-within:border-[#1e3a5f] transition-all">
                    <div className="px-5 py-4 bg-slate-50 border-r border-[#1e3a5f]/5 text-[11px] font-black text-[#1e3a5f]/40 flex items-center">+60</div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="Mobile Phone Number"
                      className="flex-1 p-4 bg-transparent text-xs font-black text-[#1e3a5f] outline-none placeholder:text-slate-300"
                      onKeyDown={e => e.key === 'Enter' && sendOTP()}
                    />
                  </div>
                </div>
                {error && <p className="text-[10px] text-red-500 font-bold flex items-center gap-1.5 ml-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
                <button
                  onClick={sendOTP}
                  disabled={loading}
                  className="w-full py-4 bg-[#1e3a5f] hover:bg-[#152a45] text-white rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-[#1e3a5f]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Get OTP Code</span><ChevronRight className="w-4 h-4" /></>}
                </button>
              </div>
            )}

            {/* ── STAGE: OTP ── */}
            {stage === 'otp' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#1e3a5f]/40 ml-1">Enter OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="— — — — — —"
                    className="w-full p-6 bg-slate-50 border border-[#1e3a5f]/10 rounded-2xl text-center text-xl font-black tracking-[0.5em] text-[#1e3a5f] outline-none focus:border-[#1e3a5f] transition-all placeholder:text-slate-200"
                    onKeyDown={e => e.key === 'Enter' && verifyOTP()}
                  />
                </div>
                {error && <p className="text-[10px] text-red-500 font-bold flex items-center gap-1.5 ml-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
                <button
                  onClick={verifyOTP}
                  disabled={loading || otp.length !== 6}
                  className="w-full py-4 bg-[#1e3a5f] hover:bg-[#152a45] text-white rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-[#1e3a5f]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Verify & Continue</span><ChevronRight className="w-4 h-4" /></>}
                </button>
                <button onClick={() => { setStage('phone'); setOtp(''); setError(''); }} className="w-full text-[9px] font-black text-slate-400 hover:text-[#1e3a5f] transition-colors uppercase tracking-widest">
                  ← Change mobile number
                </button>
              </div>
            )}

            {/* ── STAGE: New User Profile ── */}
            {stage === 'newUser' && (
              <div className="space-y-6">
                {[
                  { label: 'Full Name', key: 'fullName', placeholder: 'As per IC', type: 'text' },
                  { label: 'IC Number', key: 'ic', placeholder: 'xxxxxx-xx-xxxx', type: 'text' },
                  { label: 'Email Address', key: 'email', placeholder: 'your@email.com (Optional)', type: 'email' },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key} className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#1e3a5f]/40 ml-1">{label}</label>
                    <input
                      type={type}
                      value={(newProfile as any)[key]}
                      onChange={e => setNewProfile(prev => ({
                        ...prev,
                        [key]: key === 'ic' ? formatIC(e.target.value) : e.target.value
                      }))}
                      placeholder={placeholder}
                      className="w-full p-4 bg-slate-50 border border-[#1e3a5f]/10 rounded-2xl text-xs font-black text-[#1e3a5f] outline-none focus:border-[#1e3a5f] transition-all placeholder:text-slate-300"
                    />
                  </div>
                ))}
                {error && <p className="text-[10px] text-red-500 font-bold flex items-center gap-1.5 ml-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
                <button
                  onClick={saveNewProfile}
                  disabled={loading || !newProfile.fullName || !newProfile.ic}
                  className="w-full py-4 bg-[#1e3a5f] hover:bg-[#152a45] text-white rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-[#1e3a5f]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Save & Explore Dashboard</span><ChevronRight className="w-4 h-4" /></>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
