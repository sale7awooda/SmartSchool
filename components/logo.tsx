import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useSettings } from '@/lib/settings-context';

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
  const { settings } = useSettings();
  const schoolName = settings?.school_name || 'School Name';
  const systemSubtitle = settings?.school_type || "Primary School";
  const logoUrl = settings?.logo_url;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div 
        className={cn(
          "relative shrink-0 flex items-center justify-center",
          withBackground ? "p-3 bg-white shadow-xl rounded-xl border border-primary/10" : "bg-transparent"
        )}
        style={{ width: size, height: size }}
      >
        <Image 
          src={logoUrl || "/icon.svg"} 
          alt={"School Icon"} 
          fill 
          priority
          className="object-contain p-1"
          referrerPolicy="no-referrer"
        />
      </div>
      {withText && (
        <div className="flex flex-col leading-none max-w-[200px]" suppressHydrationWarning>
          <span className="text-[1.1rem] font-bold text-foreground tracking-tight truncate" suppressHydrationWarning>
            {schoolName}
          </span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-1 truncate" suppressHydrationWarning>
            {systemSubtitle}
          </span>
        </div>
      )}
    </div>
  );
}
