import './globals.css';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import AppShell from '@/components/layout/AppShell';

import Preloader from '@/components/ui/Preloader';

export const metadata: Metadata = {
  title: 'Crackers POS - Sree Kalieswari Traders (Sivakasi)',
  description: 'Sree Kalieswari Traders - Sivakasi Crackers & Fireworks Retail Billing POS Terminal powered by Averqon',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/logo.png',
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
        <Suspense fallback={<Preloader message="Loading Averqon POS..." />}>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
