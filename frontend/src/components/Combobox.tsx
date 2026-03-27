'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

interface ComboboxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  emptyMessage?: string;
}

const Combobox: React.FC<ComboboxProps> = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder,
  disabled = false,
  emptyMessage = "No results found."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = (options || []).filter(opt => 
    opt?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* TRIGGER: SLIM & ULTRA-MODERN (PY-3.5) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3.5 pl-6 text-left border rounded-2xl flex items-center justify-between transition-all duration-300 ${
          disabled ? 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed' : 
          isOpen ? 'bg-white border-[#1e3a5f] shadow-xl shadow-[#1e3a5f]/5 ring-1 ring-[#1e3a5f]/10' : 'bg-transparent border-[#1e3a5f]/20 hover:border-[#1e3a5f]'
        }`}
      >
        <span className={`text-[11px] font-bold capitalize truncate ${value ? 'text-[#1e3a5f]' : 'text-slate-400'}`}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-500 ${isOpen ? 'rotate-180 text-[#1e3a5f]' : 'text-slate-300'}`} />
      </button>

      {/* DROPDOWN: THE PORTAL ARCHITECTURE (NO CLIPPING, HIGH DENSITY) */}
      {isOpen && !disabled && (
        <div className="absolute top-full mt-2 w-full bg-white border border-[#1e3a5f]/10 rounded-2xl shadow-[0_30px_70px_-15px_rgba(30,58,95,0.2)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="p-3 border-b border-slate-50 bg-white sticky top-0 z-10">
             <div className="relative flex items-center">
                <Search className="absolute left-3.5 w-3.5 h-3.5 text-slate-300" />
                <input 
                  autoFocus
                  className="w-full bg-slate-50/80 border-0 p-3 pl-10 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-[#1e3a5f]/5 transition-all placeholder:text-slate-300"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
          </div>
          
          {/* HIGH-DENSITY LIST AREA (MAX-H-80 TO SHOW 12+ ITEMS AT ONCE) */}
          <div className="max-h-80 overflow-y-auto p-2 list-portal-area custom-scrollbar-portal">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, i) => (
                <button
                  key={i}
                  className={`w-full text-left p-3 rounded-xl text-[10px] font-black capitalize transition-all mb-0.5 flex items-center justify-between ${
                    value === opt ? 'bg-[#1e3a5f] text-white shadow-lg' : 'text-slate-500 hover:bg-[#1e3a5f]/5 hover:text-[#1e3a5f]'
                  }`}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  {opt}
                  {value === opt && <Check className="w-4 h-4" />}
                </button>
              ))
            ) : (
              <div className="p-10 text-center space-y-2">
                 <p className="text-[10px] font-black capitalize text-slate-300 leading-relaxed text-center">{emptyMessage}</p>
              </div>
            )}
          </div>

          <style jsx>{`
            .custom-scrollbar-portal::-webkit-scrollbar { width: 5px; }
            .custom-scrollbar-portal::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar-portal::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
            .custom-scrollbar-portal::-webkit-scrollbar-thumb:hover { background: #f97316; }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default Combobox;
