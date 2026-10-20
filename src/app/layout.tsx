import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import AppShell from '@/components/layout/AppShell';
import Preloader from '@/components/ui/Preloader';
import PwaRegister from '@/components/pwa/PwaRegister';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#111318',
};

export const metadata: Metadata = {
  title: 'AGANA FIREWORKS - Sri Kalieswari Traders (Thayilpatti, Sivakasi)',
  description: 'Agana Fireworks (Sri Kalieswari Traders) - Sivakasi Crackers & Fireworks Retail Billing POS Terminal (Catalog 2026)',
  applicationName: 'Crackers POS',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Crackers POS',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/app-icon.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Crackers POS" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased bg-[#111318] font-sans selection:bg-amber-400 selection:text-slate-950">
        <Suspense fallback={<Preloader message="Loading POS..." />}>
          <AuthProvider>
            <AppShell>{children}</AppShell>
            <PwaRegister />
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
