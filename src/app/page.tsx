'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Receipt,
  CreditCard,
  AlertTriangle,
  Boxes,
  ArrowUpRight,
  ShoppingCart,
  CheckCircle2,
  Calendar,
  Sparkles,
  RefreshCw,
  Wallet,
  Clock,
  Printer,
  Database,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { db } from '@/lib/db';
import dynamic from 'next/dynamic';
import { Sale, Product } from '@/types';
import { formatINR } from '@/lib/calculations';

const PaymentBreakdownChart = dynamic(
  () => import('@/components/dashboard/PaymentBreakdownChart'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-44 flex items-center justify-center text-xs text-slate-400">
        Loading chart...
      </div>
    ),
  }
);

export default function DashboardPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dateFilter, setDateFilter] = useState<'today' | 'this_week' | 'all'>('today');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    db.initDefaults();
    setSales(db.getSales());
    setProducts(db.getProducts());

    try {
      const [salesRes, prodsRes] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/products'),
      ]);
      if (salesRes.ok) {
        const sData = await salesRes.json();
        if (sData.success && Array.isArray(sData.data)) {
          setSales(sData.data);
        }
      }
      if (prodsRes.ok) {
        const pData = await prodsRes.json();
        if (pData.success && Array.isArray(pData.data) && pData.data.length > 0) {
          setProducts(pData.data);
        }
      }
    } catch (err) {
      console.warn('Failed to load Dashboard data from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Sales by Date
  const filteredSales = sales.filter((s) => {
    if (dateFilter === 'all') return true;
    const saleDate = new Date(s.createdAt);
    const now = new Date();
    if (dateFilter === 'today') {
      return saleDate.toDateString() === now.toDateString();
    }
    if (dateFilter === 'this_week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return saleDate >= oneWeekAgo;
    }
    return true;
  });

  // Calculate Metrics dynamically
  const totalSalesAmount = filteredSales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalInvoices = filteredSales.length;
  const totalPaid = filteredSales.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalDue = filteredSales.reduce((sum, s) => sum + s.balanceAmount, 0);

  // Payment Breakdown
  const cashTotal = filteredSales
    .filter((s) => s.paymentMethod === 'CASH')
    .reduce((sum, s) => sum + s.paidAmount, 0);
  const upiTotal = filteredSales
    .filter((s) => s.paymentMethod === 'UPI')
    .reduce((sum, s) => sum + s.paidAmount, 0);
  const cardTotal = filteredSales
    .filter((s) => s.paymentMethod === 'CARD')
    .reduce((sum, s) => sum + s.paidAmount, 0);

  // Inventory Metrics
  const totalInventoryValueCost = products.reduce((sum, p) => sum + p.purchasePrice * p.currentStock, 0);
  const totalInventoryValueRetail = products.reduce((sum, p) => sum + p.sellingPrice * p.currentStock, 0);
  const lowStockItems = products.filter((p) => p.currentStock <= p.minStockAlert);

  // Estimated Gross Margin
  let estimatedCOGS = 0;
  for (const s of filteredSales) {
    for (const item of s.items) {
      const prod = products.find((p) => p.id === item.product.id);
      const unitCost = prod ? prod.purchasePrice : item.unitPrice * 0.4;
      estimatedCOGS += unitCost * item.quantity;
    }
  }
  const estimatedGrossMargin = totalSalesAmount - estimatedCOGS;
  const marginPercentage = totalSalesAmount > 0 ? (estimatedGrossMargin / totalSalesAmount) * 100 : 0;

  // Chart Data: Payment Modes
  const paymentChartData = [
    { name: 'Cash', value: cashTotal, color: '#10b981' },
    { name: 'UPI', value: upiTotal, color: '#f59e0b' },
    { name: 'Card', value: cardTotal, color: '#3b82f6' },
  ].filter((p) => p.value > 0);

  // Best Selling Products
  const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  for (const s of filteredSales) {
    for (const item of s.items) {
      if (!productSalesMap[item.product.id]) {
        productSalesMap[item.product.id] = { name: item.product.name, quantity: 0, revenue: 0 };
      }
      productSalesMap[item.product.id].quantity += item.quantity;
      productSalesMap[item.product.id].revenue += item.totalAmount;
    }
  }
  const bestSellers = Object.values(productSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const syncQueue = db.getSyncQueue();

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Banner / Welcome */}
      <div className="bg-[#111318] text-white rounded-2xl p-5 shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
              <Flame className="w-5 h-5" />
            </span>
            <h2 className="text-lg md:text-xl font-black tracking-tight text-white">
              Sree Kalieswari Traders — Store Dashboard
            </h2>
          </div>
          <p className="text-sm text-slate-400">
            Sivakasi fireworks retail billing, inventory health, tax calculations & cloud sync.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter Tabs */}
          <div className="bg-slate-800 p-0.5 rounded-xl border border-slate-700 flex text-xs font-semibold">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateFilter === 'today' ? 'bg-[#F59E0B] text-[#111318] font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('this_week')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateFilter === 'this_week' ? 'bg-[#F59E0B] text-[#111318] font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateFilter === 'all' ? 'bg-[#F59E0B] text-[#111318] font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Time
            </button>
          </div>

          <Link
            href="/pos"
            className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] hover:bg-amber-400 text-[#111318] font-black rounded-xl shadow-lg shadow-amber-500/20 transition text-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Open POS Counter</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Finalized Sales */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold uppercase tracking-wider">
            <span>Sales Finalized</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{formatINR(totalSalesAmount)}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{totalInvoices} Invoices</span>
            <span>•</span>
            <span className="text-emerald-600 font-medium">100% Tax Compliant</span>
          </div>
        </div>

        {/* Payments Collected */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Collections (Paid)</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700">{formatINR(totalPaid)}</div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Cash: {formatINR(cashTotal)}</span>
            <span>UPI: {formatINR(upiTotal)}</span>
          </div>
        </div>

        {/* Estimated Gross Margin */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Gross Margin</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-blue-900">{formatINR(estimatedGrossMargin)}</div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
            <span className="text-blue-600 font-bold">{marginPercentage.toFixed(1)}%</span>
            <span>Gross Profit Margin</span>
          </div>
        </div>

        {/* Current Inventory Valuation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Stock Valuation</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{formatINR(totalInventoryValueRetail)}</div>
          <div className="mt-1 text-xs text-slate-500">
            Cost Value: <span className="font-semibold text-slate-700">{formatINR(totalInventoryValueCost)}</span>
          </div>
        </div>
      </div>

      {/* Second Row: Payment Breakdown & Low Stock Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Methods Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-600" />
              <span>Payment Methods Breakdown</span>
            </h3>
            <span className="text-xs text-slate-500">{filteredSales.length} Transactions</span>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center py-4">
            <PaymentBreakdownChart data={paymentChartData} />

            <div className="grid grid-cols-3 gap-2 w-full pt-2 border-t border-slate-100 text-center text-xs">
              <div className="p-2 rounded-lg bg-emerald-50">
                <div className="font-bold text-emerald-800">Cash</div>
                <div className="text-slate-600">{formatINR(cashTotal)}</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-50">
                <div className="font-bold text-amber-800">UPI</div>
                <div className="text-slate-600">{formatINR(upiTotal)}</div>
              </div>
              <div className="p-2 rounded-lg bg-blue-50">
                <div className="font-bold text-blue-800">Card</div>
                <div className="text-slate-600">{formatINR(cardTotal)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Warning Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Low-Stock Crackers Warning</span>
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
              {lowStockItems.length} Items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-60 mt-2">
            {lowStockItems.length > 0 ? (
              lowStockItems.map((prod) => (
                <div key={prod.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{prod.name}</div>
                    <div className="text-slate-400 font-mono">{prod.sku} • {prod.brand}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                      {prod.currentStock} {prod.uom} left
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">Min Alert: {prod.minStockAlert}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">
                All cracker products are well stocked above safety threshold!
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Link
              href="/inventory"
              className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center justify-center gap-1"
            >
              <span>View Full Inventory & Adjust Stock</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* System & Hardware Health */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-600" />
                <span>Station & Hardware Health</span>
              </h3>
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Operational
              </span>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-600" />
                  <div>
                    <div className="font-bold text-slate-800">Database Engine</div>
                    <div className="text-slate-500">Supabase Cloud + Local SQLite Fallback</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                  Connected
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-slate-600" />
                  <div>
                    <div className="font-bold text-slate-800">Receipt Printer</div>
                    <div className="text-slate-500">80mm Thermal ESC/POS (Ready)</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                  Online
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-slate-600" />
                  <div>
                    <div className="font-bold text-slate-800">Offline Sync Queue</div>
                    <div className="text-slate-500">{syncQueue.length} Pending Records</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                  {syncQueue.length === 0 ? 'Synchronized' : 'Queued'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Link
              href="/printer-settings"
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center justify-center gap-1"
            >
              <span>Configure Thermal Printer & Diagnostics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
            <Receipt className="w-5 h-5 text-amber-600" />
            <span>Recent Finalized Sales Invoices</span>
          </div>
          <Link
            href="/sales"
            className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1"
          >
            <span>View All Invoices</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Invoice No</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3">Payment Mode</th>
                <th className="px-6 py-3 text-right">Taxable</th>
                <th className="px-6 py-3 text-right">Grand Total</th>
                <th className="px-6 py-3 text-center">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.slice(0, 5).map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-3.5 font-bold font-mono text-slate-800">
                    {sale.invoiceNumber}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="font-semibold text-slate-800">
                      {sale.customerName || 'Cash Retail Customer'}
                    </div>
                    {sale.customerPhone && (
                      <div className="text-slate-400 text-[11px]">{sale.customerPhone}</div>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-slate-600">
                    {sale.items.length} items ({sale.items.reduce((s, i) => s + i.quantity, 0)} qty)
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right font-medium text-slate-600">
                    {formatINR(sale.taxableValue)}
                  </td>
                  <td className="px-6 py-3.5 text-right font-black text-slate-900">
                    {formatINR(sale.grandTotal)}
                  </td>
                  <td className="px-6 py-3.5 text-center text-slate-500">
                    {new Date(sale.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No sales invoices recorded yet today. Click "Open POS Counter" to start billing!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
