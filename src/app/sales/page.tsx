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
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');
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

  const filteredSales = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    return sales.filter((s) => {
      const matchesSearch =
        !q ||
        s.invoiceNumber.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerPhone && s.customerPhone.includes(q));

      if (!matchesSearch) return false;

      if (dateFilter === 'today') {
        return new Date(s.createdAt).toDateString() === new Date().toDateString();
      }
      if (dateFilter === 'week') {
        const past = new Date();
        past.setDate(past.getDate() - 7);
        return new Date(s.createdAt) >= past;
      }
      return true;
    });
  }, [sales, deferredSearch, dateFilter]);

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

        <div className="flex items-center gap-2 text-xs font-semibold self-stretch sm:self-auto justify-end">
          <span className="text-slate-400">Date Filter:</span>
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-1 rounded transition ${
                dateFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-2.5 py-1 rounded transition ${
                dateFilter === 'today' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-2.5 py-1 rounded transition ${
                dateFilter === 'week' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Days
            </button>
          </div>
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
              <div className="border border-slate-200 rounded-lg overflow-hidden">
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
