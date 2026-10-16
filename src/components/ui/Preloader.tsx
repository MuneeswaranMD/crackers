'use client';

import React from 'react';

interface PreloaderProps {
  message?: string;
  submessage?: string;
}

export default function Preloader({
  message = 'Initializing Averqon POS Engine...',
  submessage = 'Sree Kalieswari Traders · Sivakasi Fireworks POS',
}: PreloaderProps) {
  return (
    <div className="fixed inset-0 z-[9999] min-h-screen w-screen bg-[#0B0F17] flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Background radial ambient glow matching teal/cyan/lime brand */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-teal-500/10 via-emerald-500/10 to-cyan-500/10 blur-3xl pointer-events-none animate-pulse" />

      {/* Center Logo Container */}
      <div className="relative flex flex-col items-center z-10">
        {/* Animated breathing glow ring */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-teal-500/30 via-emerald-400/20 to-cyan-400/30 blur-lg animate-pulse" />
          
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/15 p-3 flex items-center justify-center shadow-[0_10px_40px_rgba(0,180,167,0.25)]">
            <img
              src="/logo.png"
              alt="Averqon Logo"
              className="w-16 h-16 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] transform transition-transform hover:scale-105"
            />
          </div>
        </div>

        {/* Business and Software Brand Typography */}
        <div className="text-center space-y-1">
          <div className="text-sm font-black tracking-[0.25em] text-white uppercase drop-shadow-sm">
            SREE KALIESWARI TRADERS
          </div>
          <div className="text-[11px] font-bold text-teal-400 tracking-wider uppercase">
            {submessage}
          </div>
          <div className="text-[10px] text-slate-400 font-mono tracking-wide">
            Powered by Averqon Retail Engine v2.1
          </div>
        </div>

        {/* Modern Shimmering Indeterminate Progress Bar */}
        <div className="mt-7 w-48 h-1 bg-slate-800/80 rounded-full overflow-hidden relative shadow-inner">
          <div
            className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(45,212,191,0.8)]"
            style={{
              animation: 'shimmerSlide 1.6s ease-in-out infinite alternate',
            }}
          />
        </div>

        {/* Real-time Status Caption */}
        <div className="mt-3 text-[11px] text-slate-400 font-medium tracking-wide flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{message}</span>
        </div>

        {/* Green Crackers Compliance Badge */}
        <div className="mt-8 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold tracking-wider uppercase flex items-center gap-1.5 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>CSIR-NEERI Green Crackers Compliant Terminal</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmerSlide {
          0% {
            left: -30%;
          }
          100% {
            left: 85%;
          }
        }
      `}</style>
    </div>
  );
}
