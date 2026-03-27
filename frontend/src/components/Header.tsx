'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User, LogOut, LayoutDashboard } from 'lucide-react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { usePathname } from 'next/navigation';

const Header = () => {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const handleSignOut = () => signOut(auth);

  return (
    <header className="fixed top-0 left-0 w-full z-50 transition-all duration-300 bg-[#1e3a5f] border-b border-white/5 py-4">
      <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
        {/* LOGO BOX ONLY AS REQUESTED */}
        <Link href="/" className="relative group flex items-center gap-3">
           <div className="relative h-14 w-14 md:h-16 md:w-16 transition-transform duration-500 overflow-hidden">
             <Image 
               src="https://w2u.creativatestudio.my/wp-content/uploads/2025/09/Windscreen2U-Logo-square.png" 
               alt="Windscreen2U"
               fill
               className="object-contain"
               priority
             />
           </div>
        </Link>

        {/* AUTH ACTION TOP RIGHT */}
        <div className="flex items-center gap-4">
           {user ? (
              <div className="flex items-center gap-3">
                 {pathname !== '/dashboard' && (
                   <Link href="/dashboard" className="flex items-center gap-2.5 px-6 py-2.5 bg-white/5 hover:bg-white/20 border border-white/10 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all">
                      <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                   </Link>
                 )}
                 <button onClick={handleSignOut} className="p-2.5 bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white rounded-full transition-all border border-orange-500/20">
                    <LogOut className="w-4 h-4" />
                 </button>
              </div>
           ) : (
                pathname === '/login' ? (
                  <Link href="/" className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all">
                     ← Back to Home
                  </Link>
                ) : (
                  <Link href="/login" className="flex items-center gap-2.5 px-6 py-2.5 bg-white/5 hover:bg-orange-500/10 border border-white/10 hover:border-orange-500/30 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-orange-500/5 group">
                    <User className="w-3.5 h-3.5 text-white/40 group-hover:text-orange-500 transition-colors" /> Log In
                  </Link>
                )
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;
