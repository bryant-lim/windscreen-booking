'use client';

import React, { useEffect, useState } from 'react';
import { 
  MessageCircle,
  X,
  Send
} from 'lucide-react';

const WhatsAppButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('60123456789'); // Default support number

  useEffect(() => {
    // Reveal button after a short delay for a premium entrance
    const timer = setTimeout(() => setIsVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleSupportClick = () => {
    // --- THE SUPPORT INTELLIGENCE LOOP ---
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const message = encodeURIComponent(`Hello WS2U Support, I need help with this page: ${currentUrl}`);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[9999] group animate-in fade-in slide-in-from-bottom-5 duration-500">
       {/* TOOLTIP ON HOVER */}
       <div className="absolute bottom-full right-0 mb-4 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 pointer-events-none">
          <div className="bg-[#1e3a5f] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-2xl border border-white/10">
             Need Help? Chat Support
          </div>
          <div className="w-3 h-3 bg-[#1e3a5f] rotate-45 mx-auto -mt-1.5 border-r border-b border-white/10 ml-auto mr-8"></div>
       </div>

       {/* THE MASTER BUTTON (EMERALD PANTONE) */}
       <button 
         onClick={handleSupportClick}
         className="w-16 h-16 bg-[#25D366] text-white rounded-[2rem] shadow-[0_20px_40px_-5px_rgba(37,211,102,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all group relative overflow-hidden"
       >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <MessageCircle className="w-8 h-8 fill-white/10" strokeWidth={2.5} />
          
          {/* PULSE INDICATOR */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#25D366] border-2 border-white rounded-full"></div>
       </button>
    </div>
  );
};

export default WhatsAppButton;
