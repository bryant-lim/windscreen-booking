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
    <main className="min-h-screen bg-[#fafbfc] font-poppins flex flex-col">
      <Header />
      <div id="recaptcha-wrapper" />

      <div className="flex-1 flex items-center justify-center px-6 pt-28 pb-12">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Logo / Title */}
          <div className="text-center mb-10 space-y-2">
            <div className="inline-flex w-14 h-14 bg-[#1e3a5f] rounded-2xl items-center justify-center mb-4 shadow-xl shadow-[#1e3a5f]/20">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black text-[#1e3a5f] capitalize tracking-tight">
              {stage === 'newUser' ? 'Complete Your Profile' : 'Welcome Back'}
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              {stage === 'phone' && 'Sign in with your mobile number'}
              {stage === 'otp' && `OTP sent to +60${phone}`}
              {stage === 'newUser' && 'Just a few details to get you started'}
            </p>
          </div>

          {/* Card */}
          <div className="bg-white border border-[#1e3a5f]/10 rounded-[2rem] p-8 space-y-5 shadow-xl shadow-[#1e3a5f]/5">

            {/* ── STAGE: Phone ── */}
            {stage === 'phone' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold capitalize tracking-wide text-[#1e3a5f]/60 ml-1 flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> Phone Number
                  </label>
                  <div className="flex gap-2">
                    <div className="p-4 bg-slate-50 border border-[#1e3a5f]/10 rounded-2xl text-[11px] font-black text-[#1e3a5f]/60">+60</div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456789"
                      className="flex-1 p-4 bg-white border border-[#1e3a5f]/20 rounded-2xl text-xs font-bold text-[#1e3a5f] outline-none focus:border-[#1e3a5f] transition-all"
                      onKeyDown={e => e.key === 'Enter' && sendOTP()}
                    />
                  </div>
                </div>
                {error && <p className="text-[10px] text-red-500 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
                <button
                  onClick={sendOTP}
                  disabled={loading}
                  className="w-full py-4 bg-[#1e3a5f] hover:bg-[#152a45] text-white rounded-2xl text-[10px] font-black capitalize tracking-wide shadow-lg shadow-[#1e3a5f]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Send OTP</span><ChevronRight className="w-4 h-4" /></>}
                </button>
              </>
            )}

            {/* ── STAGE: OTP ── */}
            {stage === 'otp' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold capitalize tracking-wide text-[#1e3a5f]/60 ml-1">Enter OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit code"
                    className="w-full p-4 bg-white border border-[#1e3a5f]/20 rounded-2xl text-center text-lg font-black tracking-[0.5em] text-[#1e3a5f] outline-none focus:border-[#1e3a5f] transition-all"
                    onKeyDown={e => e.key === 'Enter' && verifyOTP()}
                  />
                </div>
                {error && <p className="text-[10px] text-red-500 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
                <button
                  onClick={verifyOTP}
                  disabled={loading || otp.length !== 6}
                  className="w-full py-4 bg-[#1e3a5f] hover:bg-[#152a45] text-white rounded-2xl text-[10px] font-black capitalize tracking-wide shadow-lg shadow-[#1e3a5f]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Verify & Continue</span><ChevronRight className="w-4 h-4" /></>}
                </button>
                <button onClick={() => { setStage('phone'); setOtp(''); setError(''); }} className="w-full text-[10px] text-slate-400 hover:text-[#1e3a5f] transition-colors capitalize">
                  ← Change number
                </button>
              </>
            )}

            {/* ── STAGE: New User Profile ── */}
            {stage === 'newUser' && (
              <>
                {[
                  { label: 'Full Name', icon: User, key: 'fullName', placeholder: 'As per IC', type: 'text' },
                  { label: 'IC Number', icon: Hash, key: 'ic', placeholder: 'xxxxxx-xx-xxxx', type: 'text' },
                  { label: 'Email Address', icon: Mail, key: 'email', placeholder: 'Optional', type: 'email' },
                ].map(({ label, icon: Icon, key, placeholder, type }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[11px] font-bold capitalize tracking-wide text-[#1e3a5f]/60 ml-1 flex items-center gap-1.5">
                      <Icon className="w-3 h-3" /> {label}
                    </label>
                    <input
                      type={type}
                      value={(newProfile as any)[key]}
                      onChange={e => setNewProfile(prev => ({
                        ...prev,
                        [key]: key === 'ic' ? formatIC(e.target.value) : e.target.value
                      }))}
                      placeholder={placeholder}
                      className="w-full p-4 bg-white border border-[#1e3a5f]/20 rounded-2xl text-xs font-bold text-[#1e3a5f] outline-none focus:border-[#1e3a5f] transition-all"
                    />
                  </div>
                ))}
                {error && <p className="text-[10px] text-red-500 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
                <button
                  onClick={saveNewProfile}
                  disabled={loading || !newProfile.fullName || !newProfile.ic}
                  className="w-full py-4 bg-[#1e3a5f] hover:bg-[#152a45] text-white rounded-2xl text-[10px] font-black capitalize tracking-wide shadow-lg shadow-[#1e3a5f]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Save & Continue</span><ChevronRight className="w-4 h-4" /></>}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
