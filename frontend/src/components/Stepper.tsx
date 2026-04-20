'use client';

import React from 'react';
import { CarFront, Wrench, Calendar, User, CreditCard } from 'lucide-react';
import clsx from 'clsx'; // Utility for dynamic tailwind classes

const steps = [
  { id: 1, name: 'Vehicle', icon: CarFront },
  { id: 2, name: 'Part Selection', icon: Wrench }, // the user requested changing Damage to Part Selection
  { id: 3, name: 'Schedule', icon: Calendar },
  { id: 4, name: 'Information', icon: User },
  { id: 5, name: 'Payment', icon: CreditCard },
];

interface StepperProps {
  currentStep: number;
}

export default function Stepper({ currentStep }: StepperProps) {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-0">
      <div className="flex items-center justify-between relative mt-8 w-full max-w-4xl mx-auto">
        {/* Background connector line - refined at both ends */}
        <div className="absolute left-[20px] right-[20px] top-1/2 -translate-y-1/2 h-[3px] bg-slate-100 z-0"></div>

        {/* Dynamic active connector line logic */}
        <div 
          className="absolute left-[20px] top-1/2 -translate-y-1/2 h-[3px] bg-primary z-0 transition-all duration-500 ease-in-out" 
          style={{ width: `calc(((currentStep - 1) / (steps.length - 1)) * (100% - 40px))` }}
        ></div>

        {steps.map((step) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const IconWrapper = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div 
                className={clsx(
                  "w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isActive ? "border-accent bg-accent text-white shadow-xl shadow-accent/30 ring-4 ring-blue-50" : 
                  isCompleted ? "border-primary bg-primary text-white" : 
                  "border-slate-200 bg-slate-50 text-slate-300"
                )}
              >
                <IconWrapper className="w-7 h-7" />
              </div>

              <div 
                className={clsx(
                  "absolute -bottom-10 whitespace-nowrap text-[13px] font-semibold tracking-tight transition-colors duration-300",
                  isActive ? "text-accent" : 
                  isCompleted ? "text-primary" : 
                  "text-slate-300"
                )}
              >
                {step.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
