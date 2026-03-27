'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  strapiCustomer: any | null;
  refreshCustomer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  status: 'checking',
  strapiCustomer: null,
  refreshCustomer: async () => {}
});

export const useAuth = () => useContext(AuthContext);

async function fetchStrapiCustomer(phone: string) {
  try {
    // Firebase stores phone with country code e.g. "+601234567890"
    // Try exact match first, then strip the +60 prefix
    const res = await fetch(
      `http://localhost:1338/api/customers?filters[Phone][$eq]=${encodeURIComponent(phone)}`
    );
    const json = await res.json();
    if (json.data?.[0]) return json.data[0];

    // Fallback: try without country code prefix
    const localPhone = phone.replace(/^\+60/, '');
    const res2 = await fetch(
      `http://localhost:1338/api/customers?filters[Phone][$eq]=${localPhone}`
    );
    const json2 = await res2.json();
    return json2.data?.[0] || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [strapiCustomer, setStrapiCustomer] = useState<any | null>(null);

  const refreshCustomer = async () => {
    if (!user?.phoneNumber) return;
    const customer = await fetchStrapiCustomer(user.phoneNumber);
    setStrapiCustomer(customer);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.phoneNumber) {
        setStatus('authenticated');
        const customer = await fetchStrapiCustomer(firebaseUser.phoneNumber);
        setStrapiCustomer(customer);
        // Keep localStorage in sync for backwards compat
        const localPhone = firebaseUser.phoneNumber.replace(/^\+60/, '');
        localStorage.setItem('ws2u_customer_phone', localPhone);
      } else {
        setStatus('unauthenticated');
        setStrapiCustomer(null);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, strapiCustomer, refreshCustomer }}>
      {children}
    </AuthContext.Provider>
  );
}
