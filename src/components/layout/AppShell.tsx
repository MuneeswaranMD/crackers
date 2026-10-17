'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  History,
  Receipt,
  Globe,
  RotateCcw,
  Package,
  Layers,
  Boxes,
  SlidersHorizontal,
  Truck,
  Building2,
  Users,
  Wallet,
  BarChart3,
  ShieldCheck,
  Printer,
  Settings,
  RefreshCw,
  Menu,
  X,
  Wifi,
  WifiOff,
  UserCircle,
  HelpCircle,
  Maximize2,
  Flame,
  LogOut,
  AlertTriangle,
  Lock,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { Shop, Product } from '@/types';
import Preloader from '@/components/ui/Preloader';

const NAVIGATION_ITEMS = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['OWNER_ADMIN', 'CASHIER', 'INVENTORY_STAFF'] },
  { name: 'POS Billing', href: '/pos', icon: ShoppingCart, highlight: true, roles: ['OWNER_ADMIN', 'CASHIER'] },
  { name: 'Recent Orders', href: '/recent-orders', icon: History, roles: ['OWNER_ADMIN', 'CASHIER'] },
  { name: 'Sales Invoices', href: '/sales', icon: Receipt, roles: ['OWNER_ADMIN', 'CASHIER'] },
  { name: 'Online Orders', href: '/online-orders', icon: Globe, highlight: true, roles: ['OWNER_ADMIN', 'CASHIER', 'INVENTORY_STAFF'] },
  { name: 'Returns & Credit Notes', href: '/returns', icon: RotateCcw, roles: ['OWNER_ADMIN', 'CASHIER'] },
  { name: 'Products', href: '/products', icon: Package, roles: ['OWNER_ADMIN', 'INVENTORY_STAFF'] },
  { name: 'Categories', href: '/categories', icon: Layers, roles: ['OWNER_ADMIN', 'INVENTORY_STAFF'] },
  { name: 'Inventory', href: '/inventory', icon: Boxes, roles: ['OWNER_ADMIN', 'INVENTORY_STAFF'] },
  { name: 'Stock Adjustments', href: '/stock-adjustments', icon: SlidersHorizontal, roles: ['OWNER_ADMIN', 'INVENTORY_STAFF'] },
  { name: 'Purchases', href: '/purchases', icon: Truck, roles: ['OWNER_ADMIN', 'INVENTORY_STAFF'] },
  { name: 'Suppliers', href: '/suppliers', icon: Building2, roles: ['OWNER_ADMIN', 'INVENTORY_STAFF'] },
  { name: 'Customers', href: '/customers', icon: Users, roles: ['OWNER_ADMIN', 'CASHIER'] },
  { name: 'Expenses', href: '/expenses', icon: Wallet, roles: ['OWNER_ADMIN'] },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['OWNER_ADMIN'] },
  { name: 'Users & Roles', href: '/users', icon: ShieldCheck, roles: ['OWNER_ADMIN'] },
  { name: 'Printer Settings', href: '/printer-settings', icon: Printer, roles: ['OWNER_ADMIN', 'CASHIER'] },
  { name: 'Shop Settings', href: '/shop-settings', icon: Settings, roles: ['OWNER_ADMIN'] },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [shortcutModal, setShortcutModal] = useState(false);
  const [shop, setShop] = useState<Shop>(() => db.getShop());
  const [printerStatus, setPrinterStatus] = useState<string>('80mm Ready');
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // Global search state
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Notifications modal / state
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Network listener & shortcuts & dynamic shop updates
  useEffect(() => {
    db.initDefaults();
    setShop(db.getShop());
    const unsubShop = db.onShopChange((updated) => setShop(updated));

    const settings = db.getSettings();
    setPrinterStatus(`${settings.thermalPrinterPaperWidth || '80mm'} Ready`);

    // Calculate pending sync items
    const checkSync = () => {
      const sales = db.getSales();
      const pending = sales.filter((s) => !s.isSynced).length;
      setPendingSyncCount(pending);
    };
    checkSync();

    if (typeof window !== 'undefined') {
      setOnline(navigator.onLine);
    }

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setShortcutModal((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      unsubShop();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Global product search filter
  useEffect(() => {
    if (!globalSearch.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    const q = globalSearch.toLowerCase();
    const prods = db.getProducts().filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.tamilName && p.tamilName.toLowerCase().includes(q)) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q))
    );
    setSearchResults(prods.slice(0, 6));
    setShowSearchDropdown(true);
  }, [globalSearch]);

  const isLoginPage = pathname === '/login' || pathname?.startsWith('/login');

  // Route protection redirect checks
  useEffect(() => {
    if (!loading) {
      if (!user && !isLoginPage) {
        const dest = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
        router.replace(`/login${dest}`);
      } else if (user && isLoginPage) {
        const redirectTo = searchParams.get('redirect') || '/';
        router.replace(redirectTo);
      }
    }
  }, [user, loading, isLoginPage, pathname, router, searchParams]);

  // If on login route: DO NOT render any sidebar, header, or authenticated shell
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading state while verifying authentication
  if (loading) {
    return <Preloader message="Authenticating..." />;
  }

  // If unauthenticated on protected route: render blank background while redirecting
  if (!user) {
    return <div className="min-h-screen w-screen bg-[#111318]" />;
  }

  // Role-based Access Check for current route
  const currentNav = NAVIGATION_ITEMS.find((item) => item.href === pathname);
  const isAllowed = !currentNav || currentNav.roles.includes(user.role);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const getPageTitle = () => {
    if (pathname === '/') return 'Store Overview & Dashboard';
    if (pathname === '/pos') return 'Point of Sale (POS) Billing';
    if (pathname === '/recent-orders') return 'Recent Orders Register';
    if (pathname === '/online-orders') return 'WooCommerce Online Orders';
    if (pathname === '/sales') return 'Sales Tax Invoices';
    if (pathname === '/returns') return 'Sales Returns & Credit Notes';
    if (pathname === '/products') return 'Fireworks Products Catalog';
    if (pathname === '/categories') return 'Cracker Categories';
    if (pathname === '/inventory') return 'Inventory & Godown Stock';
    if (pathname === '/stock-adjustments') return 'Stock Adjustments';
    if (pathname === '/purchases') return 'Purchases & Inward Stock';
    if (pathname === '/suppliers') return 'Manufacturers & Suppliers';
    if (pathname === '/customers') return 'Customer Directory';
    if (pathname === '/expenses') return 'Shop Expenses';
    if (pathname === '/reports') return 'Sales & Tax Reports';
    if (pathname === '/users') return 'Staff Users & Role Permissions';
    if (pathname === '/printer-settings') return '80mm Thermal & A4 Printer Setup';
    if (pathname === '/shop-settings') return 'Store Profile & Billing Config';
    if (pathname === '/sync') return 'Data Backup & Cloud Synchronization';
    return 'Fireworks POS';
  };

  const renderNavList = (isMobile = false) => (
    <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
      {NAVIGATION_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        const hasAccess = item.roles.includes(user.role);

        // Hide items cashier has zero business seeing
        if (
          !hasAccess &&
          user.role === 'CASHIER' &&
          ['/expenses', '/reports', '/users', '/shop-settings', '/sync'].includes(item.href)
        ) {
          return null;
        }

        return (
          <Link
            key={item.href}
            href={hasAccess ? item.href : '#'}
            onClick={() => isMobile && setMobileDrawerOpen(false)}
            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isActive
                ? 'bg-[#1F2937] text-white font-black shadow-md'
                : item.highlight
                ? 'bg-slate-50 text-[#1F2937] hover:bg-amber-50 font-bold border border-slate-200'
                : hasAccess
                ? 'text-slate-600 hover:bg-slate-100 hover:text-[#1F2937]'
                : 'text-slate-600 opacity-50 cursor-not-allowed'
            }`}
          >
            <Icon
              className={`w-4 h-4 flex-shrink-0 transition-transform ${
                isActive
                  ? 'text-[#111318] scale-110'
                  : item.highlight
                  ? 'text-amber-600 group-hover:scale-110'
                  : 'text-slate-400 group-hover:text-slate-700'
              }`}
            />
            {(sidebarOpen || isMobile) && <span className="truncate">{item.name}</span>}
            {(sidebarOpen || isMobile) && item.highlight && (
              <span className="ml-auto text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow">
                {item.href === '/pos' ? 'FAST' : 'SYNC'}
              </span>
            )}
            {(sidebarOpen || isMobile) && !hasAccess && (
              <Lock className="w-3 h-3 text-slate-600 ml-auto" />
            )}

            {/* Collapsed Tooltip */}
            {!sidebarOpen && !isMobile && (
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#1F2937] text-white text-[11px] font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-slate-700">
                {item.name}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white p-0 font-sans antialiased text-[#1F2937]">
      {/* 1. Left Fixed Dark Navigation Sidebar (#111318) */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } hidden md:flex flex-col bg-white text-slate-700 transition-all duration-200 z-30 select-none flex-shrink-0 border-r border-[#E5E7EB]`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-[#E5E7EB] bg-white">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-sm flex-shrink-0">
              <img src="/logo.png" alt="Averqon Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
            {sidebarOpen && (
              <div className="leading-tight overflow-hidden">
                <div className="font-black text-xs tracking-wider text-[#1F2937] uppercase truncate">
                  Sree Kalieswari
                </div>
                <div className="text-[10px] text-teal-600 font-bold uppercase tracking-wider truncate">
                  Traders Sivakasi
                </div>
                <div className="text-[9px] text-slate-400 font-medium">
                  FIREWORKS POS · AVERQON
                </div>
              </div>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/80 transition"
            title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Item List */}
        {renderNavList(false)}

        {/* Bottom User Profile Section */}
        <div className="p-3 border-t border-[#E5E7EB] bg-slate-50 text-xs">
          {sidebarOpen ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium text-[11px]">Staff Terminal:</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-black uppercase tracking-wider border border-amber-500/30">
                  {user.role.replace('_', ' ')}
                </span>
              </div>
              <div className="font-bold text-slate-100 truncate text-xs flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="truncate">{user.name}</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate font-mono">{user.email}</div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 font-bold text-[11px] hover:bg-rose-950/40 px-2 py-1 rounded transition"
                  title="Sign Out of Terminal"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
                <span className="text-[10px] text-slate-600 font-semibold">Averqon v2.1</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div title={`${user.name} (${user.role})`}>
                <UserCircle className="w-6 h-6 text-amber-400" />
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile/Tablet Drawer Backdrop & Sidebar */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-full bg-white text-slate-800 flex flex-col shadow-2xl z-10 border-r border-[#E5E7EB]">
            <div className="h-16 flex items-center justify-between px-4 border-b border-[#E5E7EB] bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center shadow-sm flex-shrink-0">
                  <img src="/logo.png" alt="Averqon Logo" className="w-full h-full object-contain rounded-md" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase text-slate-900">Sree Kalieswari Traders</div>
                  <div className="text-[9px] text-teal-600 font-bold">FIREWORKS POS · AVERQON</div>
                </div>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavList(true)}
            <div className="p-3 border-t border-[#E5E7EB] bg-slate-50">
              <div className="text-xs font-bold text-slate-800">{user.name}</div>
              <div className="text-[10px] text-amber-400 uppercase font-black">{user.role.replace('_', ' ')}</div>
              <button
                onClick={logout}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-rose-950/40 text-rose-400 text-xs font-bold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Application Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F5F6F8]">
        {/* White Top Navigation Bar across main application area */}
        <header className="h-16 bg-white border-b border-[#E5E7EB] px-4 md:px-5 flex items-center justify-between z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider hidden sm:block">
                Sree Kalieswari Traders · Sivakasi
              </div>
              <h1 className="text-base md:text-lg font-black text-[#1F2937] tracking-tight leading-tight">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          {/* Center/Right controls */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Global Search Bar */}
            <div className="relative hidden lg:block" ref={searchContainerRef}>
              <div className="flex items-center gap-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-xl px-3 py-1.5 w-64 focus-within:w-80 focus-within:border-amber-500 focus-within:bg-white transition-all shadow-sm">
                <Search className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Global item or SKU search..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  onFocus={() => globalSearch.trim() && setShowSearchDropdown(true)}
                  className="bg-transparent border-none outline-none text-xs text-[#1F2937] placeholder-[#6B7280] w-full"
                />
                {globalSearch && (
                  <button onClick={() => setGlobalSearch('')} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Global search dropdown */}
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute top-full mt-1.5 left-0 w-80 bg-white border border-[#E5E7EB] rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                    <span>Products Found ({searchResults.length})</span>
                    <span className="text-amber-600">Click to Bill</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {searchResults.map((p) => (
                      <Link
                        key={p.id}
                        href={`/pos?search=${encodeURIComponent(p.name)}`}
                        onClick={() => setShowSearchDropdown(false)}
                        className="p-2.5 hover:bg-amber-50/60 flex items-center justify-between transition group"
                      >
                        <div>
                          <div className="text-xs font-bold text-[#1F2937] group-hover:text-amber-700">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-[#6B7280]">
                            SKU: {p.sku} · Stock: {p.currentStock} {p.uom}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-amber-600">₹{p.sellingPrice}</div>
                          <div className="text-[9px] text-slate-400 line-through">₹{p.mrp}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Recent Orders Button */}
            <Link
              href="/recent-orders"
              className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-xl text-xs font-bold bg-[#F5F6F8] hover:bg-amber-50 text-[#1F2937] hover:text-amber-700 border border-[#E5E7EB] hover:border-amber-300 transition shadow-sm"
              title="Recent Orders Register"
            >
              <History className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Recent Orders</span>
            </Link>

            {/* Supabase Cloud Live Status Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                online
                  ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                  : 'bg-rose-50 text-[#DC2626] border border-rose-200 animate-pulse'
              }`}
              title={online ? 'Connected directly to Supabase Cloud PostgreSQL database' : 'Network offline'}
            >
              {online ? <Wifi className="w-3.5 h-3.5 text-[#16A34A]" /> : <WifiOff className="w-3.5 h-3.5 text-[#DC2626]" />}
              <span className="hidden sm:inline">{online ? 'Supabase Live' : 'Offline'}</span>
            </div>

            {/* Printer Status */}
            <Link
              href="/printer-settings"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 hover:bg-amber-50 text-[#1F2937] hover:text-amber-800 border border-slate-200 transition"
              title="Printer Status: Thermal & A4"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>{printerStatus}</span>
            </Link>

            {/* Notifications Button */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-[#E5E7EB] rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-bold text-slate-800">
                    <span>Notifications & Alerts</span>
                    <button onClick={() => setNotificationsOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="py-2 space-y-2 text-xs">
                    <div className="p-2 bg-amber-50 rounded-lg border border-amber-200/60 text-amber-900">
                      <div className="font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Diwali Retail Billing Ready</span>
                      </div>
                      <div className="text-[10px] text-amber-700 mt-0.5">
                        GST 18% & Tamil Nadu retail pricing applied.
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">
                      <div className="font-bold">WooCommerce Online Sync Active</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Automatic webhook listener configured for external sales.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Keyboard Shortcuts Trigger (F1) */}
            <button
              onClick={() => setShortcutModal(true)}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#F5F6F8] hover:bg-slate-200 text-slate-700 border border-[#E5E7EB] transition"
              title="Keyboard Shortcuts (F1)"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Keys</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition hidden sm:block"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* User Profile & Sign Out Button */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#E5E7EB]">
              <div className="hidden md:block text-right">
                <div className="text-xs font-bold text-[#1F2937] leading-tight truncate max-w-[120px]">
                  {user.name}
                </div>
                <div className="text-[10px] text-amber-600 font-bold uppercase">
                  {user.role.replace('_', ' ')}
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#111318] hover:bg-slate-800 text-white shadow-sm transition"
                title="Sign Out of Terminal"
              >
                <LogOut className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Page Body with Access Guard */}
        <main className="flex-1 overflow-y-auto p-3 md:p-4 bg-[#F5F6F8]">
          {isAllowed ? (
            children
          ) : (
            <div className="max-w-md mx-auto my-16 bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-lg text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Restricted Module Access</h3>
                <p className="text-xs text-[#6B7280] mt-1">
                  Your current account role (<strong>{user.role.replace('_', ' ')}</strong>) does not have permission to view this module.
                </p>
              </div>
              <Link
                href="/pos"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B] hover:bg-amber-400 text-[#111318] font-black rounded-xl text-xs shadow transition"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Return to POS Billing</span>
              </Link>
            </div>
          )}
        </main>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {shortcutModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-[#E5E7EB] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-[#111318] text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <HelpCircle className="w-5 h-5" />
                <span>POS Keyboard Shortcuts</span>
              </div>
              <button
                onClick={() => setShortcutModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-700">F1</span>
                  <span className="text-slate-500">Shortcut Guide</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-700">F2</span>
                  <span className="text-slate-500">Focus Product Search</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-700">F3</span>
                  <span className="text-slate-500">Customer Select</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-700">F6</span>
                  <span className="text-slate-500">Hold Current Bill</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-700">F7</span>
                  <span className="text-slate-500">Recall Held Bills</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-700">F8</span>
                  <span className="text-slate-500">Payment Toggle</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-700">F9</span>
                  <span className="text-slate-500">Print 80mm Receipt</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-700">F10</span>
                  <span className="text-slate-500">Print A4 Invoice</span>
                </div>
              </div>
              <div className="text-xs text-slate-500 pt-2 border-t border-slate-200">
                Sree Kalieswari Traders · Sivakasi high-speed cracker billing.
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setShortcutModal(false)}
                className="px-4 py-2 bg-[#111318] text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
