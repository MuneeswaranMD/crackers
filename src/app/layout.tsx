import './globals.css';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import AppShell from '@/components/layout/AppShell';

import Preloader from '@/components/ui/Preloader';

export const metadata: Metadata = {
  title: 'AGANA FIREWORKS - Sri Kalieswari Traders (Thayilpatti, Sivakasi)',
  description: 'Agana Fireworks (Sri Kalieswari Traders) - Sivakasi Crackers & Fireworks Retail Billing POS Terminal (Catalog 2026)',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/jpeg' }],
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#111318] font-sans selection:bg-amber-400 selection:text-slate-950">
        <Suspense fallback={<Preloader message="Loading POS..." />}>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
