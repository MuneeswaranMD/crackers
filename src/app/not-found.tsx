import Link from 'next/link';
import { ArrowLeft, Flame } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#F5F6F8] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-slate-200 p-2 shadow-sm">
          <img src="/logo.png" alt="Averqon Logo" className="h-full w-full object-contain rounded-xl" />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Averqon POS</p>
        <h1 className="mt-2 text-2xl font-black text-[#1F2937]">Page not found</h1>
        <p className="mt-2 text-sm text-[#6B7280]">The requested screen is not available in this terminal.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#F59E0B] px-4 py-2.5 text-sm font-black text-[#111318] transition hover:bg-amber-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
