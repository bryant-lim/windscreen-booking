'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import clsx from 'clsx';

interface CalendarProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  blockedDaysOfWeek: string[]; // e.g. ["Sunday", "Saturday"]
  blockedSpecificDates: string[]; // e.g. ["2026-12-25"]
}

export default function Calendar({ 
  selectedDate, 
  onSelectDate, 
  blockedDaysOfWeek = [], 
  blockedSpecificDates = [] 
}: CalendarProps) {
  const [viewDate, setViewDate] = useState(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = [];
  // Add empty slots for the first week
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-10" />);
  }

  // Add the actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

    const isPast = date < today;
    const isToday = date.getTime() === today.getTime();
    const isOffDay = blockedDaysOfWeek.includes(dayName);
    const isHoliday = blockedSpecificDates.includes(dateStr);
    
    // Constraint: No same-day booking
    const isBlocked = isPast || isToday || isOffDay || isHoliday;
    const isSelected = selectedDate === dateStr;

    days.push(
      <div 
        key={day}
        onClick={() => !isBlocked && onSelectDate(dateStr)}
        className={clsx(
          "h-10 flex items-center justify-center rounded-lg text-sm font-bold transition-all cursor-pointer relative group",
          isSelected ? "bg-[#1e3a5f] text-white shadow-lg" : 
          isBlocked ? "text-slate-200 cursor-not-allowed bg-slate-50/50" : 
          "text-slate-700 hover:bg-[#f5a623]/10 hover:text-[#f5a623]"
        )}
      >
        {day}
        {isToday && !isSelected && (
          <div className="absolute bottom-1 w-1 h-1 bg-red-400 rounded-full" title="Today"></div>
        )}
      </div>
    );
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="w-full bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-[#1e3a5f] text-sm tracking-wide uppercase">
          {monthNames[month]} {year}
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={handlePrevMonth} 
            className="p-1.5 hover:bg-slate-50 rounded-md border border-slate-100"
          >
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>
          <button 
            onClick={handleNextMonth} 
            className="p-1.5 hover:bg-slate-50 rounded-md border border-slate-100"
          >
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="h-8 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
            {d}
          </div>
        ))}
        {days}
      </div>

      <div className="pt-4 border-t border-slate-50 flex flex-wrap gap-4 mt-2">
         <div className="flex items-center gap-1.5 grayscale opacity-50">
            <div className="w-2.5 h-2.5 bg-slate-200 rounded-sm"></div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter">Unavailable</span>
         </div>
         <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-[#1e3a5f] rounded-sm"></div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter">Selected</span>
         </div>
         <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 border border-red-300 rounded-sm"></div>
            <span className="text-[10px] uppercase font-bold text-red-500 tracking-tighter">Today (Blocked)</span>
         </div>
      </div>
      
      <p className="mt-4 text-[10px] text-slate-400 flex items-center gap-2 italic">
        <Info className="w-3 h-3" />
        Same-day bookings are not accepted.
      </p>
    </div>
  );
}
