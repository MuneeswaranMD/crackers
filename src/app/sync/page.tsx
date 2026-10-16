'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Database, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function SyncPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to Dashboard
    const timer = setTimeout(() => {
      router.replace('/');
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
        <Database className="w-6 h-6 animate-pulse" />
      </div>
      <h2 className="text-xl font-black text-slate-900">Direct Supabase Cloud Connected</h2>
      <p className="text-xs text-slate-500 leading-relaxed">
        Offline database synchronization has been replaced. All sales, customers, products, and online orders are now stored and retrieved directly in your live <strong>Supabase PostgreSQL</strong> database.
      </p>
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
        <CheckCircle2 className="w-4 h-4" />
        <span>Cloud Database Active</span>
      </div>
      <div className="pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
        >
          <span>Go to Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
