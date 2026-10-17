'use client';

import React from 'react';

interface PreloaderProps {
  message?: string;
  submessage?: string;
}

export default function Preloader({
  message = 'Loading...',
  submessage = 'Agana Fireworks',
}: PreloaderProps) {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0b0f17] flex flex-col items-center justify-center select-none p-4">
      <div className="flex flex-col items-center text-center">
        {/* Simple elegant spinner with logo */}
        <div className="relative w-12 h-12 mb-3.5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-slate-800 border-t-amber-400 animate-spin" />
          <img
            src="/logo.png"
            alt="Logo"
            className="w-6 h-6 object-contain opacity-90"
          />
        </div>

        {/* Minimal title & caption */}
        <div className="text-xs font-semibold tracking-widest text-slate-200 uppercase">
          {submessage}
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          {message}
        </div>
      </div>
    </div>
  );
}
