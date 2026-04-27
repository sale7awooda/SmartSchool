import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  withText?: boolean;
  withBackground?: boolean;
  size?: number;
}

export function Logo({ 
  className, 
  withText = false, 
  withBackground = false, 
  size = 48 
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div 
        className={cn(
          "relative shrink-0 overflow-hidden",
          withBackground ? "p-3 bg-white rounded-2xl shadow-xl border border-primary/10" : ""
        )}
        style={{ width: size, height: size }}
      >
        <Image 
          src="/icon.svg" 
          alt="Smart School Icon" 
          fill 
          priority
          className="object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
      {withText && (
        <div className="flex flex-col leading-none">
          <span className="text-xl font-black text-primary tracking-tighter uppercase">SMART SCHOOL</span>
          <span className="text-[9px] font-bold text-primary/60 uppercase tracking-widest mt-0.5">Management System</span>
        </div>
      )}
    </div>
  );
}
