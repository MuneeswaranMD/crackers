'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Printer,
  FileText,
  CreditCard,
  QrCode,
  DollarSign,
  UserPlus,
  PauseCircle,
  PlayCircle,
  Percent,
  CheckCircle2,
  AlertCircle,
  Flame,
  ShieldCheck,
  RefreshCw,
  X,
  User,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Layers,
  Zap,
  Sliders,
  ChevronRight,
  Check,
} from 'lucide-react';
import { db, getProductImageUrl } from '@/lib/db';
import { Product, Category, Customer, CartItem, Sale, BillingMode, PaymentMethod, InvoiceType } from '@/types';
import {
  calculateLineItem,
  calculateCartItem,
  calculateInvoiceTotals,
  formatINR,
  roundTo2,
} from '@/lib/calculations';
import {
  generateThermalReceiptHtml,
  generateA4InvoiceHtml,
  printHtmlViaIframe,
} from '@/lib/print';

export default function POSPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [filterPopularOnly, setFilterPopularOnly] = useState(false);

  // Cart & Invoice State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [billingMode, setBillingMode] = useState<BillingMode>('GST');
  const [billDiscountPct, setBillDiscountPct] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [tenderedCash, setTenderedCash] = useState<string>('');
  const [splitCashAmount, setSplitCashAmount] = useState<string>('');
  const [splitUpiAmount, setSplitUpiAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals & Held Bills
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastFinalizedSale, setLastFinalizedSale] = useState<Sale | null>(null);
  const [heldBills, setHeldBills] = useState<{ id: string; name: string; timestamp: string; cart: CartItem[] }[]>([]);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerCity, setNewCustomerCity] = useState('Sivakasi');
  const [newCustomerState, setNewCustomerState] = useState('Tamil Nadu');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadInitialData = async () => {
    db.initDefaults();
    setProducts(db.getProducts());
    setCategories(db.getCategories());
    setCustomers(db.getCustomers());
    setHeldBills(db.getHeldBills());
    const settings = db.getSettings();
    setBillingMode(settings.defaultBillingMode);

    try {
      const [prodsRes, catsRes, custsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/customers'),
      ]);
      if (prodsRes.ok) {
        const pData = await prodsRes.json();
        if (pData.success && Array.isArray(pData.data) && pData.data.length > 0) {
          setProducts(pData.data);
        }
      }
      if (catsRes.ok) {
        const cData = await catsRes.json();
        if (cData.success && Array.isArray(cData.data) && cData.data.length > 0) {
          setCategories(cData.data);
        }
      }
      if (custsRes.ok) {
        const cuData = await custsRes.json();
        if (cuData.success && Array.isArray(cuData.data) && cuData.data.length > 0) {
          setCustomers(cuData.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch POS initial data from Supabase:', err);
    }
  };

  // Load initial data once on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // POS Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setShowCustomerModal((prev) => !prev);
      } else if (e.key === 'F6') {
        e.preventDefault();
        handleHoldBill();
      } else if (e.key === 'F7') {
        e.preventDefault();
        setShowHeldModal(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        setPaymentMethod((prev) => (prev === 'CASH' ? 'UPI' : prev === 'UPI' ? 'CARD' : 'CASH'));
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleFinalizeSale('THERMAL');
      } else if (e.key === 'F10') {
        e.preventDefault();
        handleFinalizeSale('A4');
      } else if (e.key === 'Escape') {
        setShowCustomerModal(false);
        setShowHeldModal(false);
        setShowSuccessModal(false);
        setErrorBanner(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedCustomer, billingMode, billDiscountPct, paymentMethod, tenderedCash, isSubmitting]);

  // Honour product selections made from the shell-wide search bar.
  useEffect(() => {
    const shellSearch = searchParams.get('search');
    if (shellSearch) setSearchQuery(shellSearch);
  }, [searchParams]);

  // Recalculate Totals via trusted billing calculations engine
  const calculatedLines = useMemo(() => {
    return cart.map((item) =>
      calculateLineItem(
        {
          mrp: item.product.mrp,
          unitPrice: item.product.sellingPrice,
          quantity: item.quantity,
          discountPercentage: item.discountPercentage,
          cgstRate: 9,
          sgstRate: 9,
        },
        billingMode
      )
    );
  }, [cart, billingMode]);

  const invoiceTotals = useMemo(() => {
    return calculateInvoiceTotals(calculatedLines, billDiscountPct, billingMode);
  }, [calculatedLines, billDiscountPct, billingMode]);

  // Split payment initialization helper
  useEffect(() => {
    if (paymentMethod === 'SPLIT') {
      const half = Math.round(invoiceTotals.grandTotal / 2);
      setSplitCashAmount(half.toString());
      setSplitUpiAmount((invoiceTotals.grandTotal - half).toString());
    }
  }, [paymentMethod, invoiceTotals.grandTotal]);

  // Add Item to Cart (or increment if already in cart)
  const addToCart = (product: Product) => {
    setErrorBanner(null);
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);

    if (existingIndex >= 0) {
      const updated = [...cart];
      const newQty = updated[existingIndex].quantity + 1;
      const settings = db.getSettings();
      if (!settings.allowNegativeStock && newQty > product.currentStock) {
        setErrorBanner(`Stock limit reached for "${product.name}" (${product.currentStock} in stock).`);
        return;
      }
      updated[existingIndex].quantity = newQty;
      setCart(updated);
    } else {
      if (product.currentStock <= 0 && !db.getSettings().allowNegativeStock) {
        setErrorBanner(`"${product.name}" is out of stock.`);
        return;
      }
      setCart([
        ...cart,
        calculateCartItem(product, 1, product.sellingPrice, 0, billingMode, 18),
      ]);
    }
  };

  // Barcode / Quick SKU enter key handler
  const handleBarcodeSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      const code = searchQuery.trim().toLowerCase();
      const matched = products.find(
        (p) =>
          p.barcode.toLowerCase() === code ||
          p.sku.toLowerCase() === code ||
          p.name.toLowerCase() === code
      );
      if (matched) {
        addToCart(matched);
        setSearchQuery('');
      } else {
        setErrorBanner(`No fireworks found with Barcode/SKU: "${searchQuery}"`);
      }
    }
  };

  // Modify Quantity
  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    const updated = [...cart];
    const prod = updated[index].product;
    if (!db.getSettings().allowNegativeStock && newQty > prod.currentStock) {
      setErrorBanner(`Only ${prod.currentStock} units available for "${prod.name}".`);
      return;
    }
    updated[index].quantity = newQty;
    setCart(updated);
  };

  // Modify Line Discount
  const updateLineDiscount = (index: number, discPct: number) => {
    const updated = [...cart];
    updated[index].discountPercentage = Math.min(100, Math.max(0, discPct));
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setTenderedCash('');
    setBillDiscountPct(0);
    setErrorBanner(null);
  };

  // Hold and Recall Bills
  const handleHoldBill = () => {
    if (cart.length === 0) return;
    const name = prompt('Enter a label for this held bill (e.g. Counter Rush Customer 1):') || `Bill #${heldBills.length + 1}`;
    db.saveHeldBill(name, cart);
    setHeldBills(db.getHeldBills());
    setCart([]);
    setSelectedCustomer(null);
  };

  const handleResumeBill = (held: { id: string; name: string; cart: CartItem[] }) => {
    setCart(held.cart);
    db.removeHeldBill(held.id);
    setHeldBills(db.getHeldBills());
    setShowHeldModal(false);
  };

  // Create Quick Customer
  const handleCreateCustomer = () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) return;
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      shopId: 'shop-sivakasi-01',
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim(),
      email: newCustomerEmail.trim() || undefined,
      addressLine: newCustomerAddress.trim() || undefined,
      city: newCustomerCity.trim() || 'Sivakasi',
      state: newCustomerState.trim() || 'Tamil Nadu',
      creditBalance: 0,
      isActive: true,
    };
    db.saveCustomer(newCust);
    setCustomers(db.getCustomers());
    setSelectedCustomer(newCust);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerAddress('');
    setNewCustomerEmail('');
    setShowCustomerModal(false);
  };

  // Transactional Finalize Sale
  const handleFinalizeSale = (printFormat: 'THERMAL' | 'A4') => {
    if (isSubmitting) return;
    setErrorBanner(null);

    if (cart.length === 0) {
      setErrorBanner('Cart is empty. Please add cracker items to proceed.');
      return;
    }

    // Revalidate stock
    const settings = db.getSettings();
    if (!settings.allowNegativeStock) {
      for (const item of cart) {
        const currentInDb = db.getProductById(item.product.id);
        if (currentInDb && item.quantity > currentInDb.currentStock) {
          setErrorBanner(`Cannot checkout. Not enough stock for "${item.product.name}" (${currentInDb.currentStock} remaining).`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const shop = db.getShop();
      const invoiceNumber = db.getNextInvoiceNumber();

      let paid = invoiceTotals.grandTotal;
      let changeGiven = 0;

      if (paymentMethod === 'CASH') {
        const tenderedNum = parseFloat(tenderedCash);
        if (!isNaN(tenderedNum) && tenderedNum >= invoiceTotals.grandTotal) {
          paid = tenderedNum;
          changeGiven = tenderedNum - invoiceTotals.grandTotal;
        }
      }

      const fullSale: Sale = {
        id: `sale-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        shopId: shop.id,
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name || 'Walk-in Retail Customer',
        customerPhone: selectedCustomer?.phone || '',
        customerEmail: selectedCustomer?.email || '',
        customerAddress: selectedCustomer?.addressLine || '',
        customerCity: selectedCustomer?.city || '',
        customerState: selectedCustomer?.state || '',
        customerGstin: selectedCustomer?.gstin || '',
        cashierName: 'Counter POS 1',
        deviceId: 'POS-TERMINAL-01',
        invoiceNumber,
        financialYear: '2026-27',
        invoiceType: billingMode === 'GST' ? 'GST_TAX_INVOICE' : 'RETAIL_BILL',
        billingMode,
        subtotal: invoiceTotals.subtotal,
        discountAmount: invoiceTotals.totalDiscount,
        taxableValue: invoiceTotals.taxableValue,
        cgstAmount: invoiceTotals.cgstAmount,
        sgstAmount: invoiceTotals.sgstAmount,
        igstAmount: invoiceTotals.igstAmount,
        totalTax: invoiceTotals.totalTax,
        roundOff: invoiceTotals.roundOff,
        grandTotal: invoiceTotals.grandTotal,
        paidAmount: invoiceTotals.grandTotal,
        balanceAmount: 0,
        paymentStatus: 'PAID',
        paymentMethod,
        status: 'FINALIZED',
        idempotencyKey: `idemp-${Date.now()}-${invoiceNumber}`,
        isSynced: false,
        items: cart.map((item, idx) => ({
          ...item,
          ...calculatedLines[idx],
        })),
        payments: [
          {
            id: `pay-${Date.now()}`,
            saleId: '',
            paymentMethod,
            amount: invoiceTotals.grandTotal,
            receivedAmount: paid,
            changeGiven,
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
      };

      const result = db.finalizeSale(fullSale);
      if (!result.success) {
        setErrorBanner(result.error || 'Failed to finalize sale.');
        setIsSubmitting(false);
        return;
      }

      // Asynchronously persist sale to Supabase PostgreSQL in real-time
      fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullSale),
      }).catch((err) => console.warn('[Supabase Sync Background Warning]:', err));

      // Refresh Products stock in UI
      setProducts(db.getProducts());
      setLastFinalizedSale(fullSale);
      setShowSuccessModal(true);

      // Auto trigger print
      if (printFormat === 'THERMAL') {
        const html = generateThermalReceiptHtml(fullSale, shop);
        printHtmlViaIframe(html);
      } else {
        const html = generateA4InvoiceHtml(fullSale, shop);
        printHtmlViaIframe(html);
      }

      // Reset Cart
      setCart([]);
      setSelectedCustomer(null);
      setTenderedCash('');
      setBillDiscountPct(0);
    } catch (err: any) {
      setErrorBanner(err.message || 'Error occurred while checking out.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filterLowStockOnly && p.currentStock > p.minStockAlert) {
        return false;
      }
      if (filterPopularOnly && p.currentStock <= 0) {
        return false;
      }
      const matchesCategory = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.tamilName && p.tamilName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery)) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery, filterLowStockOnly, filterPopularOnly]);

  const shop = db.getShop();
  const upiQrString = `upi://pay?pa=${shop.upiId || 'kalieswaritraders@sbi'}&pn=${encodeURIComponent(
    shop.name
  )}&am=${invoiceTotals.grandTotal}&cu=INR&tn=${encodeURIComponent('Crackers Bill')}`;

  // Helper for category badge color
  const getCategoryColor = (catName?: string) => {
    const name = catName?.toLowerCase() || '';
    if (name.includes('sparkler') || name.includes('மத்தாப்பு')) return 'text-amber-600 bg-amber-50 border-amber-200';
    if (name.includes('flower') || name.includes('புஸ்வாணம்')) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (name.includes('chakkar') || name.includes('சக்கரம்')) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (name.includes('rocket') || name.includes('ராக்கெட்')) return 'text-purple-600 bg-purple-50 border-purple-200';
    if (name.includes('gift') || name.includes('பாக்ஸ்')) return 'text-rose-600 bg-rose-50 border-rose-200';
    return 'text-slate-700 bg-slate-50 border-slate-200';
  };

  const getProductEmoji = (product: Product) => {
    const label = (product.name + ' ' + (product.categoryName || '')).toLowerCase();
    if (label.includes('rocket')) return '🚀';
    if (label.includes('flower') || label.includes('fountain')) return '🌼';
    if (label.includes('chakkar')) return '🌀';
    if (label.includes('sparkler')) return '✨';
    if (label.includes('gift') || label.includes('box')) return '🎁';
    return '🎆';
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] min-h-[620px] gap-3 select-none font-sans">
      {/* 1. CENTRAL PRODUCT SELECTION AREA (Left & Center) */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        {/* Top Search & Barcode Scan Workspace */}
        <div className="p-2.5 bg-white border-b border-[#E5E7EB] flex flex-col sm:flex-row items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#6B7280]" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleBarcodeSubmit}
              placeholder="Search Crackers by Name, தமிழ் பெயர், Brand, SKU or Scan Barcode (F2)..."
              className="w-full bg-[#F5F6F8] border border-[#E5E7EB] text-[#1F2937] pl-9 pr-9 py-2 rounded-xl text-xs sm:text-sm placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:bg-white font-medium transition"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Barcode scanner readiness indicator & Recall Held Bills */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between">
            <div
              className="text-xs px-3 py-2 rounded-xl bg-slate-50 text-[#1F2937] font-mono flex items-center gap-1.5 border border-[#E5E7EB]"
              title="Barcode scanner auto-adds on Enter"
            >
              <Barcode className="w-4 h-4 text-amber-600" />
              <span className="hidden xl:inline text-[11px] font-bold">Scanner Ready</span>
            </div>

            {heldBills.length > 0 && (
              <button
                onClick={() => setShowHeldModal(true)}
                className="px-3 py-2 rounded-xl bg-[#F59E0B] hover:bg-amber-400 text-[#111318] text-xs font-black flex items-center gap-1.5 shadow-sm transition"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Resume ({heldBills.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Chips (DashPOS Style) */}
        <div className="px-3 py-2 bg-white border-b border-[#E5E7EB] flex items-center gap-1.5 overflow-x-auto text-xs font-bold scrollbar-none">
          {/* All Fireworks */}
          <button
            onClick={() => {
              setSelectedCategory('ALL');
              setFilterLowStockOnly(false);
              setFilterPopularOnly(false);
            }}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all shadow-sm ${
              selectedCategory === 'ALL' && !filterLowStockOnly && !filterPopularOnly
                ? 'bg-[#F59E0B] text-[#111318] font-black'
                : 'bg-white text-[#1F2937] hover:bg-slate-100 border border-[#E5E7EB]'
            }`}
          >
            All Products ({products.length})
          </button>

          {/* Popular Shortcuts */}
          <button
            onClick={() => {
              setFilterPopularOnly(!filterPopularOnly);
              setFilterLowStockOnly(false);
            }}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1 ${
              filterPopularOnly
                ? 'bg-amber-500 text-slate-950 font-black shadow'
                : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Popular Items</span>
          </button>

          {/* Categories */}
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setFilterLowStockOnly(false);
                setFilterPopularOnly(false);
              }}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                selectedCategory === cat.id && !filterLowStockOnly && !filterPopularOnly
                  ? 'bg-[#F59E0B] text-[#111318] font-black shadow'
                  : 'bg-white text-[#1F2937] hover:bg-slate-100 border border-[#E5E7EB]'
              }`}
            >
              {cat.name}
            </button>
          ))}

          {/* Low Stock Filter for staff */}
          <button
            onClick={() => {
              setFilterLowStockOnly(!filterLowStockOnly);
              setFilterPopularOnly(false);
            }}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1 ${
              filterLowStockOnly
                ? 'bg-rose-600 text-white font-black shadow'
                : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
            }`}
            title="Filter Low Stock items"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Low Stock</span>
          </button>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 bg-[#F5F6F8] content-start auto-rows-max items-start">
          {filteredProducts.map((prod) => {
            const inCart = cart.find((i) => i.product.id === prod.id);
            const isLowStock = prod.currentStock <= prod.minStockAlert;
            const isOutOfStock = prod.currentStock <= 0;
            const discountPct = prod.mrp > prod.sellingPrice ? Math.round(((prod.mrp - prod.sellingPrice) / prod.mrp) * 100) : 0;
            const productImg = prod.imageUrl || getProductImageUrl(prod);

            return (
              <div
                key={prod.id}
                onClick={() => addToCart(prod)}
                className={`flex flex-col h-auto rounded-2xl border bg-white p-2.5 transition-all duration-150 cursor-pointer select-none relative group hover:border-[#F59E0B] hover:shadow-lg shadow-sm border-[#E5E7EB] hover:-translate-y-0.5 ${
                  isOutOfStock ? 'opacity-60 bg-slate-50' : ''
                }`}
              >
                {/* Product Packaging Image */}
                <div className="relative mb-2 w-full h-28 sm:h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80">
                  <img
                    src={productImg}
                    alt={prod.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 pointer-events-none" />
                  <span
                    className={`absolute right-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold shadow-sm backdrop-blur-md ${
                      isOutOfStock
                        ? 'bg-rose-500/90 text-white'
                        : 'bg-emerald-600/90 text-white'
                    }`}
                  >
                    {isOutOfStock ? 'Unavailable' : 'Available'}
                  </span>
                  <span className="absolute left-1.5 bottom-1.5 rounded-md bg-black/60 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-mono font-medium text-amber-300">
                    {prod.brand}
                  </span>
                </div>

                {/* Top Badges: Category icon & Stock Pill */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${getCategoryColor(
                      prod.categoryName
                    )}`}
                  >
                    <Flame className="w-3 h-3 text-amber-500" />
                    <span className="truncate max-w-[85px]">{prod.categoryName || 'Firework'}</span>
                  </span>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isOutOfStock
                        ? 'bg-rose-50 text-[#DC2626] border-rose-200'
                        : isLowStock
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                    }`}
                  >
                    {prod.currentStock} {prod.uom}
                  </span>
                </div>

                {/* Product Name, Tamil Title & SKU */}
                <div className="my-1">
                  <div className="font-bold text-[#1F2937] text-xs leading-snug group-hover:text-amber-700 line-clamp-2">
                    {prod.name}
                  </div>
                  {prod.tamilName && (
                    <div className="text-[11px] text-[#6B7280] font-medium line-clamp-1 mt-0.5">
                      {prod.tamilName}
                    </div>
                  )}
                  <div className="text-[10px] text-[#6B7280] mt-1 flex items-center justify-between">
                    <span>{prod.packSize}</span>
                    <span className="font-mono text-[9px] text-slate-400">SKU: {prod.sku}</span>
                  </div>
                </div>

                {/* Pricing, Tax badge & Add to Cart button */}
                <div className="pt-2 border-t border-slate-100 mt-2 flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#6B7280] line-through">
                        ₹{prod.mrp.toFixed(0)}
                      </span>
                      {discountPct > 0 && (
                        <span className="text-[9px] font-extrabold px-1 rounded bg-amber-100 text-amber-800">
                          -{discountPct}%
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-black text-[#1F2937]">
                      ₹{prod.sellingPrice.toFixed(2)}
                    </div>
                    <div className="text-[9px] text-[#6B7280]">18% GST incl.</div>
                  </div>

                  {inCart ? (
                    <span className="w-8 h-8 rounded-xl bg-[#F59E0B] text-[#111318] font-black text-xs flex items-center justify-center shadow-md">
                      {inCart.quantity}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="w-8 h-8 rounded-xl bg-[#F5F6F8] group-hover:bg-[#F59E0B] group-hover:text-[#111318] text-[#1F2937] flex items-center justify-center transition border border-[#E5E7EB]"
                      title="Add to Cart"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-16 text-center text-[#6B7280]">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-600" />
              <p className="font-bold text-sm text-[#1F2937]">No fireworks found</p>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Try selecting another category or check your search keywords.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. RIGHT-SIDE BILLING CART & CHECKOUT PANEL (#FFFFFF, border #E5E7EB) */}
      <div className="w-full lg:w-[360px] xl:w-[380px] flex flex-col bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden flex-shrink-0">
        {/* Cart Top Bar: Current Sale Header */}
        <div className="p-3.5 bg-white border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-600" />
            <h2 className="font-black text-sm text-[#1F2937] tracking-tight">Current Sale</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
              {cart.reduce((s, i) => s + i.quantity, 0)} items
            </span>
          </div>

          {/* Invoice Type: GST vs Retail Bill */}
          <div className="flex bg-[#F5F6F8] p-0.5 rounded-xl border border-[#E5E7EB] text-xs">
            <button
              onClick={() => setBillingMode('GST')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                billingMode === 'GST'
                  ? 'bg-[#F59E0B] text-[#111318] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              GST (18%)
            </button>
            <button
              onClick={() => setBillingMode('NON_GST')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                billingMode === 'NON_GST'
                  ? 'bg-[#F59E0B] text-[#111318] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              Retail Bill
            </button>
          </div>
        </div>

        {/* Customer Selector Strip */}
        <div className="px-3.5 py-2 bg-[#F5F6F8] border-b border-[#E5E7EB] flex items-center justify-between text-xs">
          <button
            onClick={() => setShowCustomerModal(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-[#1F2937] border border-[#E5E7EB] hover:border-amber-300 transition font-semibold"
          >
            <User className="w-3.5 h-3.5 text-amber-600" />
            <span className="truncate max-w-[200px]">
              {selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone})` : 'Walk-in Customer (F3)'}
            </span>
          </button>
          {selectedCustomer && (
            <button
              onClick={() => setSelectedCustomer(null)}
              className="text-[#6B7280] hover:text-rose-600 p-1"
              title="Remove customer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Error Notification Banner */}
        {errorBanner && (
          <div className="px-3 py-2 bg-rose-50 border-b border-rose-200 text-[#DC2626] text-xs flex items-center justify-between font-medium animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button onClick={() => setErrorBanner(null)} className="text-rose-500 hover:text-rose-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Cart Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2.5">
          {cart.map((item, index) => (
            <div
              key={item.product.id}
              className="py-2.5 px-2 hover:bg-slate-50 rounded-xl transition flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[#1F2937] truncate">{item.product.name}</div>
                <div className="text-[11px] text-[#6B7280] flex items-center gap-1.5 mt-0.5">
                  <span>₹{item.unitPrice.toFixed(2)}</span>
                  <span>•</span>
                  <span>{item.product.packSize}</span>
                  {item.discountPercentage > 0 && (
                    <span className="text-amber-700 font-bold bg-amber-50 px-1 rounded">
                      -{item.discountPercentage}%
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity [-] [qty] [+] */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateQuantity(index, item.quantity - 1)}
                  className="w-6 h-6 rounded-lg bg-[#F5F6F8] hover:bg-slate-200 text-[#1F2937] flex items-center justify-center font-bold"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                  className="w-10 text-center font-bold text-[#1F2937] border border-[#E5E7EB] rounded-lg py-0.5 focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
                />
                <button
                  onClick={() => updateQuantity(index, item.quantity + 1)}
                  className="w-6 h-6 rounded-lg bg-[#F5F6F8] hover:bg-slate-200 text-[#1F2937] flex items-center justify-center font-bold"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Line Total & Remove button */}
              <div className="text-right pl-2">
                <div className="font-black text-[#1F2937] text-xs">
                  ₹{calculatedLines[index]?.totalAmount.toFixed(2)}
                </div>
                <button
                  onClick={() => removeFromCart(index)}
                  className="text-slate-300 hover:text-rose-600 transition mt-0.5 p-0.5"
                  title="Remove Item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="py-16 text-center text-[#6B7280] flex flex-col items-center justify-center">
              <ShoppingBag className="w-10 h-10 mb-2 text-slate-300" />
              <div className="font-bold text-[#1F2937] text-sm">Cart is Empty</div>
              <div className="text-xs text-[#6B7280] mt-1">Select crackers from catalog or scan barcode</div>
            </div>
          )}
        </div>

        {/* Bill Summary Section */}
        <div className="p-3 bg-[#F5F6F8] border-t border-[#E5E7EB] space-y-1.5 text-xs">
          <div className="flex justify-between text-[#6B7280]">
            <span>Subtotal ({invoiceTotals.totalItems} items, {invoiceTotals.totalQuantity} pcs):</span>
            <span className="font-semibold text-[#1F2937]">₹{invoiceTotals.subtotal.toFixed(2)}</span>
          </div>

          {/* Bill Extra Discount */}
          <div className="flex items-center justify-between text-[#6B7280]">
            <div className="flex items-center gap-1.5">
              <span>Extra Discount:</span>
              <div className="flex items-center border border-[#E5E7EB] rounded-lg bg-white px-1.5 py-0.5">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={billDiscountPct || ''}
                  onChange={(e) => setBillDiscountPct(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-7 text-center text-xs font-bold focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">%</span>
              </div>
            </div>
            <span className="font-semibold text-[#16A34A]">
              -₹{invoiceTotals.totalDiscount.toFixed(2)}
            </span>
          </div>

          {billingMode === 'GST' && (
            <>
              <div className="flex justify-between text-[#6B7280]">
                <span>Taxable Value:</span>
                <span className="font-semibold text-[#1F2937]">₹{invoiceTotals.taxableValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#6B7280] text-[11px]">
                <span>CGST (9%) + SGST (9%):</span>
                <span>₹{invoiceTotals.totalTax.toFixed(2)}</span>
              </div>
            </>
          )}

          {invoiceTotals.roundOff !== 0 && (
            <div className="flex justify-between text-[#6B7280] text-[11px]">
              <span>Round Off:</span>
              <span>₹{invoiceTotals.roundOff.toFixed(2)}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="pt-2 border-t border-[#E5E7EB] flex items-baseline justify-between">
            <span className="font-black text-[#1F2937] text-sm">GRAND TOTAL:</span>
            <span className="text-2xl font-black text-[#1F2937] tracking-tight">
              {formatINR(invoiceTotals.grandTotal)}
            </span>
          </div>
        </div>

        {/* Payment and Checkout Section */}
        <div className="p-3 bg-white border-t border-[#E5E7EB] space-y-2">
          {/* Payment Method Selector */}
          <div className="grid grid-cols-4 gap-1 text-xs font-bold">
            <button
              onClick={() => setPaymentMethod('CASH')}
              className={`py-2 rounded-xl flex flex-col items-center justify-center gap-0.5 border transition ${
                paymentMethod === 'CASH'
                  ? 'bg-[#111318] text-white border-[#111318] shadow'
                  : 'bg-[#F5F6F8] text-[#1F2937] border-[#E5E7EB] hover:bg-slate-100'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px]">Cash</span>
            </button>
            <button
              onClick={() => setPaymentMethod('UPI')}
              className={`py-2 rounded-xl flex flex-col items-center justify-center gap-0.5 border transition ${
                paymentMethod === 'UPI'
                  ? 'bg-[#111318] text-white border-[#111318] shadow'
                  : 'bg-[#F5F6F8] text-[#1F2937] border-[#E5E7EB] hover:bg-slate-100'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px]">UPI</span>
            </button>
            <button
              onClick={() => setPaymentMethod('CARD')}
              className={`py-2 rounded-xl flex flex-col items-center justify-center gap-0.5 border transition ${
                paymentMethod === 'CARD'
                  ? 'bg-[#111318] text-white border-[#111318] shadow'
                  : 'bg-[#F5F6F8] text-[#1F2937] border-[#E5E7EB] hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px]">Card</span>
            </button>
            <button
              onClick={() => setPaymentMethod('SPLIT')}
              className={`py-2 rounded-xl flex flex-col items-center justify-center gap-0.5 border transition ${
                paymentMethod === 'SPLIT'
                  ? 'bg-[#111318] text-white border-[#111318] shadow'
                  : 'bg-[#F5F6F8] text-[#1F2937] border-[#E5E7EB] hover:bg-slate-100'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[11px]">Split</span>
            </button>
          </div>

          {/* Cash Tendered & Change Due */}
          {paymentMethod === 'CASH' && (
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="text-[#6B7280] font-semibold whitespace-nowrap">Tendered:</span>
              <input
                type="number"
                placeholder={invoiceTotals.grandTotal.toString()}
                value={tenderedCash}
                onChange={(e) => setTenderedCash(e.target.value)}
                className="flex-1 px-2.5 py-1.5 border border-[#E5E7EB] rounded-xl font-bold text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
              />
              {tenderedCash && parseFloat(tenderedCash) >= invoiceTotals.grandTotal && (
                <span className="text-[#16A34A] font-bold whitespace-nowrap bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                  Change: ₹{(parseFloat(tenderedCash) - invoiceTotals.grandTotal).toFixed(2)}
                </span>
              )}
            </div>
          )}

          {/* UPI Live QR Preview */}
          {paymentMethod === 'UPI' && (
            <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-amber-900">Scan & Pay via any UPI App</div>
                <div className="text-[11px] text-slate-600 font-mono">{shop.upiId || 'kalieswaritraders@sbi'}</div>
                <div className="text-[10px] text-amber-700">Amount: ₹{invoiceTotals.grandTotal.toFixed(2)}</div>
              </div>
              <div className="w-12 h-12 bg-white rounded-lg border border-amber-300 flex items-center justify-center shadow-sm">
                <QrCode className="w-8 h-8 text-[#111318]" />
              </div>
            </div>
          )}

          {/* Split Payment inputs */}
          {paymentMethod === 'SPLIT' && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500">Cash Amount:</label>
                <input
                  type="number"
                  value={splitCashAmount}
                  onChange={(e) => setSplitCashAmount(e.target.value)}
                  className="w-full px-2 py-1 border border-slate-200 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500">UPI Amount:</label>
                <input
                  type="number"
                  value={splitUpiAmount}
                  onChange={(e) => setSplitUpiAmount(e.target.value)}
                  className="w-full px-2 py-1 border border-slate-200 rounded-lg font-bold"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons: Hold, Clear & Prominent Complete Sale Button */}
        <div className="p-3 bg-[#111318] text-white flex items-center gap-2">
          <button
            onClick={handleHoldBill}
            disabled={cart.length === 0}
            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold flex items-center gap-1 transition"
            title="Hold Bill (F6)"
          >
            <PauseCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Hold</span>
          </button>

          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 disabled:opacity-40 text-slate-400 hover:text-rose-400 transition"
            title="Clear Cart"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Primary Action: Complete Sale Button */}
          <button
            onClick={() => handleFinalizeSale('THERMAL')}
            disabled={cart.length === 0 || isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-amber-400 disabled:opacity-40 text-[#111318] font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition"
          >
            <Printer className="w-4 h-4" />
            <span>{isSubmitting ? 'Finalizing...' : 'Complete & Print (F9)'}</span>
          </button>

          {/* Secondary Print Option: A4 Invoice */}
          <button
            onClick={() => handleFinalizeSale('A4')}
            disabled={cart.length === 0 || isSubmitting}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-400 transition"
            title="Print A4 Tax Invoice (F10)"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-[#E5E7EB] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-[#111318] text-white flex items-center justify-between">
              <span className="font-bold text-amber-400 text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>Select or Register Customer</span>
              </span>
              <button onClick={() => setShowCustomerModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              {/* Customer Search */}
              <div>
                <input
                  type="text"
                  placeholder="Search customer name or phone..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 mb-2"
                />
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-[#E5E7EB] rounded-xl">
                  {customers
                    .filter(
                      (c) =>
                        !customerSearchQuery ||
                        c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                        c.phone.includes(customerSearchQuery)
                    )
                    .map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowCustomerModal(false);
                        }}
                        className="p-2.5 hover:bg-amber-50 cursor-pointer flex justify-between items-center transition"
                      >
                        <div>
                          <div className="font-bold text-[#1F2937]">{c.name}</div>
                          <div className="text-[#6B7280] font-mono text-[11px]">{c.phone} • {c.city}</div>
                        </div>
                        {c.creditBalance > 0 && (
                          <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            Due: ₹{c.creditBalance}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Add New Quick Customer */}
              <div className="pt-3 border-t border-[#E5E7EB] space-y-2">
                <div className="font-bold text-[#1F2937]">Register New Customer:</div>
                <input
                  type="text"
                  placeholder="Customer Full Name *"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
                <input
                  type="tel"
                  placeholder="Mobile Phone Number *"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
                <input
                  type="text"
                  placeholder="Address Line (Street, Door No, Area)"
                  value={newCustomerAddress}
                  onChange={(e) => setNewCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="City (Default: Sivakasi)"
                    value={newCustomerCity}
                    onChange={(e) => setNewCustomerCity(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                  />
                  <input
                    type="text"
                    placeholder="State (Tamil Nadu)"
                    value={newCustomerState}
                    onChange={(e) => setNewCustomerState(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email Address (Optional)"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
                <button
                  onClick={handleCreateCustomer}
                  disabled={!newCustomerName.trim() || !newCustomerPhone.trim()}
                  className="w-full py-2 bg-[#111318] hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl transition"
                >
                  Save & Apply Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Held Bills Recall Modal */}
      {showHeldModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-[#E5E7EB] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-[#111318] text-white flex items-center justify-between">
              <span className="font-bold text-amber-400 text-sm flex items-center gap-2">
                <PauseCircle className="w-4 h-4" />
                <span>Recall Held Bills ({heldBills.length})</span>
              </span>
              <button onClick={() => setShowHeldModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 divide-y divide-slate-100 max-h-72 overflow-y-auto text-xs">
              {heldBills.map((held) => (
                <div key={held.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#1F2937]">{held.name}</div>
                    <div className="text-[#6B7280] text-[11px] mt-0.5">
                      Held at {held.timestamp} • {held.cart.length} items
                    </div>
                  </div>
                  <button
                    onClick={() => handleResumeBill(held)}
                    className="px-3 py-1.5 bg-[#F59E0B] hover:bg-amber-400 text-[#111318] font-bold rounded-xl transition"
                  >
                    Resume Bill
                  </button>
                </div>
              ))}
              {heldBills.length === 0 && (
                <div className="py-8 text-center text-[#6B7280]">No held bills found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Finalized Sale Confirmation Modal */}
      {showSuccessModal && lastFinalizedSale && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-[#E5E7EB] overflow-hidden animate-in fade-in zoom-in-95 text-center p-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#16A34A] flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-[#1F2937]">Sale Successfully Finalized!</h3>
              <p className="text-xs text-[#6B7280] mt-1">
                Invoice Number: <span className="font-mono font-bold text-slate-800">{lastFinalizedSale.invoiceNumber}</span>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-[#E5E7EB] text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Customer:</span>
                <span className="font-bold text-[#1F2937]">{lastFinalizedSale.customerName || 'Walk-in'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Amount Paid:</span>
                <span className="font-extrabold text-[#1F2937]">{formatINR(lastFinalizedSale.paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Payment Method:</span>
                <span className="font-bold text-[#1F2937]">{lastFinalizedSale.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Stock Movement:</span>
                <span className="font-semibold text-[#16A34A]">
                  {lastFinalizedSale.items.reduce((s, i) => s + i.quantity, 0)} Items Deducted
                </span>
              </div>
            </div>

            {/* Reprint Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  const html = generateThermalReceiptHtml(lastFinalizedSale, shop);
                  printHtmlViaIframe(html);
                }}
                className="py-2.5 px-3 rounded-xl bg-[#111318] hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Reprint 80mm</span>
              </button>
              <button
                onClick={() => {
                  const html = generateA4InvoiceHtml(lastFinalizedSale, shop);
                  printHtmlViaIframe(html);
                }}
                className="py-2.5 px-3 rounded-xl border border-[#E5E7EB] hover:bg-slate-100 text-[#1F2937] font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <FileText className="w-4 h-4 text-slate-600" />
                <span>Reprint A4 PDF</span>
              </button>
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#F59E0B] hover:bg-amber-400 text-[#111318] font-black text-sm shadow transition"
            >
              Start Next Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
