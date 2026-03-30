import React from 'react';
import Image from 'next/image';

export function Logo({ className = "w-16 h-16", withBackground = false }: { className?: string, withBackground?: boolean }) {
  return (
    <div className={`relative ${className} ${withBackground ? 'bg-background rounded-3xl' : ''}`}>
      <Image 
        src="/icon.svg" 
        alt="Smart School Logo" 
        fill 
        priority
        className="object-contain"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
