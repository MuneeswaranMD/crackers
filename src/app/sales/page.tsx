'use client';

import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import {
  Receipt,
  Search,
  Printer,
  FileText,
  RotateCcw,
  Download,
  Filter,
  Eye,
  X,
  Calendar,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { db } from '@/lib/db';
import { Sale, Shop } from '@/types';
import { formatINR } from '@/lib/calculations';
import {
  generateThermalReceiptHtml,
  generateA4InvoiceHtml,
  printHtmlViaIframe,
} from '@/lib/print';

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  type DatePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [shop, setShop] = useState<Shop>(db.getShop());

  useEffect(() => {
    db.initDefaults();
    setSales(db.getSales());
    setShop(db.getShop());

    fetch('/api/sales')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setSales(data.data);
        }
      })
      .catch((err) => console.warn('Failed to load sales from Supabase:', err));
  }, []);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const toYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'today') {
      const todayStr = toYMD(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yestStr = toYMD(yesterday);
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === 'week') {
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 7);
      setStartDate(toYMD(past7));
      setEndDate(toYMD(now));
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(now));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const filteredSales = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    return sales.filter((s) => {
      const matchesSearch =
        !q ||
        s.invoiceNumber.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerPhone && s.customerPhone.includes(q));

      if (!matchesSearch) return false;

      const saleDate = new Date(s.createdAt);

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (saleDate < start) return false;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (saleDate > end) return false;
      }

      return true;
    });
  }, [sales, deferredSearch, startDate, endDate]);

  const salesSummary = useMemo(() => {
    return filteredSales.reduce(
      (acc, s) => {
        acc.totalInvoices += 1;
        acc.totalRevenue += s.grandTotal || 0;
        acc.totalTaxable += s.taxableValue || 0;
        acc.totalTax += s.totalTax || 0;
        return acc;
      },
      { totalInvoices: 0, totalRevenue: 0, totalTaxable: 0, totalTax: 0 }
    );
  }, [filteredSales]);

  const exportSalesCSV = () => {
    const headers = [
      'Invoice Number',
      'Date',
      'Customer',
      'Phone',
      'Billing Mode',
      'Subtotal',
      'Discount',
      'Taxable Value',
      'Tax Amount',
      'Grand Total',
      'Payment Method',
      'Status',
    ];
    const rows = filteredSales.map((s) => [
      s.invoiceNumber,
      new Date(s.createdAt).toLocaleString('en-IN'),
      `"${s.customerName || 'Cash Retail'}"`,
      s.customerPhone || '',
      s.billingMode,
      s.subtotal,
      s.discountAmount,
      s.taxableValue,
      s.totalTax,
      s.grandTotal,
      s.paymentMethod,
      s.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sales_register_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-600" />
            <span>Sales Invoices Register</span>
          </h2>
          <p className="text-xs text-slate-500">
            View, search, reprint, or inspect all posted retail invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportSalesCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice no, customer name or phone..."
            className="w-full pl-9 pr-9 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          {search !== deferredSearch ? (
            <Loader2 className="w-4 h-4 absolute right-3 top-2 text-amber-500 animate-spin" />
          ) : search ? (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        {/* Date Filter Panel */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold self-stretch sm:self-auto justify-end">
          <div className="flex flex-wrap items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: '7 Days' },
                { id: 'month', label: 'This Month' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id)}
                className={`px-2.5 py-1 rounded transition text-xs ${
                  datePreset === p.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date Picker Inputs (Always accessible or when custom selected) */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('custom');
              }}
              className="bg-transparent text-xs font-mono font-medium text-slate-800 outline-none w-28"
              title="Start Date"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('custom');
              }}
              className="bg-transparent text-xs font-mono font-medium text-slate-800 outline-none w-28"
              title="End Date"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => handlePresetChange('all')}
                className="text-slate-400 hover:text-slate-600 ml-1"
                title="Clear date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filtered Sales Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 font-semibold">Total Invoices</div>
          <div className="text-lg font-black text-slate-900 mt-0.5">
            {salesSummary.totalInvoices}
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 font-semibold">Total Revenue</div>
          <div className="text-lg font-black text-amber-700 mt-0.5">
            {formatINR(salesSummary.totalRevenue)}
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 font-semibold">Taxable Amount</div>
          <div className="text-lg font-black text-slate-800 mt-0.5">
            {formatINR(salesSummary.totalTaxable)}
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 font-semibold">18% GST Collected</div>
          <div className="text-lg font-black text-emerald-700 mt-0.5">
            {formatINR(salesSummary.totalTax)}
          </div>
        </div>
      </div>

      {/* Mobile Responsive Sales Invoices: Cards View for Mobile (< md) */}
      <div className="md:hidden space-y-3">
        {filteredSales.map((sale) => (
          <div
            key={sale.id}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5 transition active:border-amber-400"
          >
            {/* Top: Invoice No & Badges */}
            <div className="flex items-center justify-between">
              <div className="font-mono font-black text-slate-900 text-sm">
                {sale.invoiceNumber}
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    sale.billingMode === 'GST'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {sale.billingMode}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                  {sale.paymentMethod}
                </span>
              </div>
            </div>

            {/* Customer & Timestamp */}
            <div className="flex justify-between items-start text-xs border-y border-slate-100 py-2">
              <div>
                <div className="font-bold text-slate-800">
                  {sale.customerName || 'Cash Retail Customer'}
                </div>
                {sale.customerPhone && (
                  <div className="text-slate-400 text-[11px] font-mono">{sale.customerPhone}</div>
                )}
              </div>
              <div className="text-right text-[11px] text-slate-500">
                {new Date(sale.createdAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </div>
            </div>

            {/* Totals Breakdown & Action Buttons */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div>
                <span className="text-[11px] text-slate-500">
                  Taxable: {formatINR(sale.taxableValue)} • Tax: {formatINR(sale.totalTax)}
                </span>
                <div className="text-base font-black text-slate-900 leading-tight mt-0.5">
                  {formatINR(sale.grandTotal)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedSale(sale)}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const html = generateThermalReceiptHtml(sale, shop, true);
                    printHtmlViaIframe(html);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-sm transition active:scale-95"
                  title="Reprint 80mm Receipt"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>80mm</span>
                </button>
                <button
                  onClick={() => {
                    const html = generateA4InvoiceHtml(sale, shop);
                    printHtmlViaIframe(html);
                  }}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-blue-50 text-blue-600 transition"
                  title="Reprint A4 PDF"
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredSales.length === 0 && (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
            No sales invoices found matching your filters.
          </div>
        )}
      </div>

      {/* Sales Invoices Table: Desktop/Tablet View (hidden md:block) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Invoice No</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Customer Details</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Taxable</th>
                <th className="px-4 py-3 text-right">Tax</th>
                <th className="px-4 py-3 text-right">Grand Total</th>
                <th className="px-4 py-3 text-center">Payment</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">
                    {sale.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(sale.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">
                      {sale.customerName || 'Cash Retail Customer'}
                    </div>
                    {sale.customerPhone && (
                      <div className="text-slate-400 text-[11px] font-mono">{sale.customerPhone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sale.billingMode === 'GST'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {sale.billingMode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-600">
                    {formatINR(sale.taxableValue)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatINR(sale.totalTax)}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                    {formatINR(sale.grandTotal)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const html = generateThermalReceiptHtml(sale, shop, true);
                          printHtmlViaIframe(html);
                        }}
                        className="p-1.5 rounded hover:bg-amber-50 text-amber-600 transition"
                        title="Reprint 80mm Receipt"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const html = generateA4InvoiceHtml(sale, shop);
                          printHtmlViaIframe(html);
                        }}
                        className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition"
                        title="Reprint A4 PDF"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No sales invoices found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="font-bold text-amber-400 text-sm">
                  Invoice Details: {selectedSale.invoiceNumber}
                </div>
                <div className="text-[11px] text-slate-400">
                  {new Date(selectedSale.createdAt).toLocaleString('en-IN')}
                </div>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500">Customer:</span>
                  <div className="font-bold text-slate-800 text-sm">
                    {selectedSale.customerName || 'Cash Retail Customer'}
                  </div>
                  <div className="text-slate-500">{selectedSale.customerPhone || 'N/A'}</div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Payment Mode:</span>
                  <div className="font-bold text-slate-800">{selectedSale.paymentMethod}</div>
                  <div className="text-emerald-700 font-bold">
                    Paid: {formatINR(selectedSale.paidAmount)}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Price</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSale.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2">
                          <div className="font-semibold text-slate-800">{item.product.name}</div>
                          <div className="text-slate-400 text-[10px]">{item.product.brand}</div>
                        </td>
                        <td className="p-2 text-center font-bold">{item.quantity}</td>
                        <td className="p-2 text-right">₹{item.unitPrice.toFixed(2)}</td>
                        <td className="p-2 text-right font-bold">₹{item.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-right">
                <div>Subtotal: <strong>₹{selectedSale.subtotal.toFixed(2)}</strong></div>
                {selectedSale.discountAmount > 0 && (
                  <div className="text-emerald-700">Discount: -₹{selectedSale.discountAmount.toFixed(2)}</div>
                )}
                <div>Taxable Value: <strong>₹{selectedSale.taxableValue.toFixed(2)}</strong></div>
                <div>CGST (9%) + SGST (9%): <strong>₹{selectedSale.totalTax.toFixed(2)}</strong></div>
                <div className="text-base font-black text-slate-900 pt-1 border-t border-slate-200">
                  Grand Total: {formatINR(selectedSale.grandTotal)}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  const html = generateThermalReceiptHtml(selectedSale, shop, true);
                  printHtmlViaIframe(html);
                }}
                className="px-3 py-2 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Thermal 80mm</span>
              </button>
              <button
                onClick={() => {
                  const html = generateA4InvoiceHtml(selectedSale, shop);
                  printHtmlViaIframe(html);
                }}
                className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>A4 Tax Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
