'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  DollarSign,
  TrendingUp,
  Receipt,
  PieChart as PieIcon,
  ShieldCheck,
} from 'lucide-react';
import { db } from '@/lib/db';
import { Sale, Expense, Product } from '@/types';
import { formatINR } from '@/lib/calculations';

export default function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');

  const loadData = () => {
    db.initDefaults();
    setSales(db.getSales());
    setExpenses(db.getExpenses());
    setProducts(db.getProducts());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter by period
  const filteredSales = sales.filter((s) => {
    if (period === 'all') return true;
    const d = new Date(s.createdAt);
    const now = new Date();
    if (period === 'today') return d.toDateString() === now.toDateString();
    if (period === 'week') {
      const p = new Date();
      p.setDate(now.getDate() - 7);
      return d >= p;
    }
    if (period === 'month') {
      const p = new Date();
      p.setMonth(now.getMonth() - 1);
      return d >= p;
    }
    return true;
  });

  // Financial aggregates
  const totalGrossRevenue = filteredSales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalTaxable = filteredSales.reduce((sum, s) => sum + s.taxableValue, 0);
  const totalCGST = filteredSales.reduce((sum, s) => sum + s.cgstAmount, 0);
  const totalSGST = filteredSales.reduce((sum, s) => sum + s.sgstAmount, 0);
  const totalTaxes = filteredSales.reduce((sum, s) => sum + s.totalTax, 0);
  const totalDiscounts = filteredSales.reduce((sum, s) => sum + s.discountAmount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // COGS Calculation
  let totalCOGS = 0;
  for (const s of filteredSales) {
    for (const item of s.items) {
      const prod = products.find((p) => p.id === item.product.id);
      const unitCost = prod ? prod.purchasePrice : item.unitPrice * 0.4;
      totalCOGS += unitCost * item.quantity;
    }
  }
  const grossProfit = totalGrossRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;

  // Product sales aggregation
  const productAgg: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const s of filteredSales) {
    for (const item of s.items) {
      if (!productAgg[item.product.id]) {
        productAgg[item.product.id] = { name: item.product.name, qty: 0, revenue: 0 };
      }
      productAgg[item.product.id].qty += item.quantity;
      productAgg[item.product.id].revenue += item.totalAmount;
    }
  }
  const topProducts = Object.values(productAgg).sort((a, b) => b.qty - a.qty);

  // Cashier Aggregation
  const cashierAgg: Record<string, { invoices: number; total: number }> = {};
  for (const s of filteredSales) {
    const name = s.cashierName || 'Counter POS 1';
    if (!cashierAgg[name]) cashierAgg[name] = { invoices: 0, total: 0 };
    cashierAgg[name].invoices += 1;
    cashierAgg[name].total += s.grandTotal;
  }

  const exportGSTR1CSV = () => {
    const headers = ['HSN Code', 'Description', 'UOM', 'Total Qty', 'Total Value', 'Taxable Value', 'Integrated Tax Rate', 'Integrated Tax Amt', 'Central Tax Rate', 'Central Tax Amt', 'State/UT Tax Rate', 'State/UT Tax Amt'];
    const rows = [
      [
        '3604',
        'Fireworks & Pyrotechnics',
        'BOX',
        filteredSales.reduce((s, i) => s + i.items.reduce((acc, it) => acc + it.quantity, 0), 0),
        totalGrossRevenue,
        totalTaxable,
        '0%',
        '0.00',
        '9%',
        totalCGST,
        '9%',
        totalSGST,
      ],
    ];
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GSTR1_Fireworks_HSN3604_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-600" />
            <span>Sales & GST Tax Reports</span>
          </h2>
          <p className="text-xs text-slate-500">
            Audit-ready revenue statements, GSTR-1 HSN 3604 tax summaries, gross profit, and cashier registers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded transition ${
                period === 'today' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded transition ${
                period === 'week' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded transition ${
                period === 'month' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded transition ${
                period === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={exportGSTR1CSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow transition"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export GSTR-1 (HSN 3604)</span>
          </button>
        </div>
      </div>

      {/* P&L Financial Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 font-semibold uppercase">Gross Revenue</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{formatINR(totalGrossRevenue)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{filteredSales.length} Total Invoices</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 font-semibold uppercase">Cost of Goods Sold (COGS)</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{formatINR(totalCOGS)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Purchased Stock Value</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 font-semibold uppercase">Estimated Gross Profit</div>
          <div className="text-xl font-extrabold text-emerald-700 mt-1">{formatINR(grossProfit)}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {totalGrossRevenue > 0 ? ((grossProfit / totalGrossRevenue) * 100).toFixed(1) : 0}% Margin
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 font-semibold uppercase">Net Operating Profit</div>
          <div className="text-xl font-extrabold text-blue-800 mt-1">{formatINR(netProfit)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">After ₹{totalExpenses.toFixed(2)} Expenses</div>
        </div>
      </div>

      {/* GSTR-1 Tax Summary Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Tamil Nadu GST Tax Statement (HSN 3604 Fireworks)</span>
          </h3>
          <span className="font-mono text-slate-500 font-semibold">State Code: 33 (Tamil Nadu)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-center">
          <div>
            <span className="text-slate-400 font-semibold">Net Taxable Value</span>
            <div className="text-base font-extrabold text-slate-800 mt-0.5">{formatINR(totalTaxable)}</div>
          </div>
          <div>
            <span className="text-slate-400 font-semibold">CGST (9%)</span>
            <div className="text-base font-extrabold text-slate-800 mt-0.5">{formatINR(totalCGST)}</div>
          </div>
          <div>
            <span className="text-slate-400 font-semibold">SGST (9%)</span>
            <div className="text-base font-extrabold text-slate-800 mt-0.5">{formatINR(totalSGST)}</div>
          </div>
          <div>
            <span className="text-slate-400 font-semibold">Total GST Collected</span>
            <div className="text-base font-black text-amber-600 mt-0.5">{formatINR(totalTaxes)}</div>
          </div>
        </div>
      </div>

      {/* Two columns: Top Best Sellers & Cashier Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Best Selling Fireworks */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
            Top Selling Fireworks by Volume
          </div>
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto mt-2">
            {topProducts.slice(0, 7).map((p, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">{p.name}</div>
                  <div className="text-slate-400 text-[11px]">{p.qty} Boxes sold</div>
                </div>
                <div className="font-black text-slate-900">{formatINR(p.revenue)}</div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <div className="py-8 text-center text-slate-400">No product sales yet.</div>
            )}
          </div>
        </div>

        {/* Cashier-wise Performance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
            Cashier-wise Counter Sales
          </div>
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto mt-2">
            {Object.entries(cashierAgg).map(([name, stat], idx) => (
              <div key={idx} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">{name}</div>
                  <div className="text-slate-400 text-[11px]">{stat.invoices} Billed Invoices</div>
                </div>
                <div className="font-black text-slate-900">{formatINR(stat.total)}</div>
              </div>
            ))}
            {Object.keys(cashierAgg).length === 0 && (
              <div className="py-8 text-center text-slate-400">No sales transactions logged.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
