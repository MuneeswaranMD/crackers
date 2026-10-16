'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  History,
  Search,
  Printer,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Clock,
  Eye,
  X,
  CreditCard,
  User,
  ShoppingBag,
  Globe,
  Filter,
} from 'lucide-react';
import { db } from '@/lib/db';
import { Sale, ExternalOrder, Shop } from '@/types';
import { formatINR } from '@/lib/calculations';
import {
  generateThermalReceiptHtml,
  generateA4InvoiceHtml,
  printHtmlViaIframe,
} from '@/lib/print';

export default function RecentOrdersPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [onlineOrders, setOnlineOrders] = useState<ExternalOrder[]>([]);
  const [shop, setShop] = useState<Shop>(db.getShop());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'POS' | 'ONLINE'>('ALL');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const loadData = async () => {
    db.initDefaults();
    setSales(db.getSales());
    setOnlineOrders(db.getExternalOrders());
    setShop(db.getShop());

    try {
      const [salesRes, ordersRes] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/orders'),
      ]);
      if (salesRes.ok) {
        const sData = await salesRes.json();
        if (sData.success && Array.isArray(sData.data)) {
          setSales(sData.data);
        }
      }
      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        if (oData.success && Array.isArray(oData.data)) {
          setOnlineOrders(oData.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch from Supabase:', err);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = db.onShopChange((s) => setShop(s));
    return () => unsub();
  }, []);

  const handlePrintThermal = (s: Sale) => {
    const html = generateThermalReceiptHtml(s, shop);
    printHtmlViaIframe(html);
  };

  const handlePrintA4 = (s: Sale) => {
    const html = generateA4InvoiceHtml(s, shop);
    printHtmlViaIframe(html);
  };

  // Combine and sort both POS invoices and external online orders
  const combinedOrders = [
    ...sales.map((s) => ({
      type: 'POS' as const,
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      externalOrderNumber: s.notes?.includes('WooCommerce Order #')
        ? s.notes.match(/WooCommerce Order #(\w+)/)?.[1]
        : undefined,
      customerName: s.customerName || 'Retail Walk-in Customer',
      customerPhone: s.customerPhone,
      createdAt: s.createdAt,
      grandTotal: s.grandTotal,
      paymentMethod: s.paymentMethod,
      paymentStatus: s.paymentStatus,
      status: s.status,
      itemsCount: s.items.reduce((acc, i) => acc + i.quantity, 0),
      rawSale: s,
    })),
    ...onlineOrders
      .filter((o) => !o.localInvoiceId) // don't duplicate if already invoiced to a sale
      .map((o) => ({
        type: 'ONLINE' as const,
        id: o.id,
        invoiceNumber: `WC-${o.orderNumber}`,
        externalOrderNumber: o.orderNumber,
        customerName: o.customerName || 'Online Store Customer',
        customerPhone: o.customerPhone,
        createdAt: o.externalCreatedAt,
        grandTotal: o.totalAmount,
        paymentMethod: (o.paymentMethodTitle || 'ONLINE') as any,
        paymentStatus: o.isPaid ? 'PAID' : 'PENDING',
        status: o.status.toUpperCase(),
        itemsCount: o.items?.reduce((acc, i) => acc + i.quantity, 0) || 0,
        rawOrder: o,
      })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredOrders = combinedOrders.filter((ord) => {
    if (statusFilter === 'POS' && ord.type !== 'POS') return false;
    if (statusFilter === 'ONLINE' && ord.type !== 'ONLINE') return false;

    if (search) {
      const q = search.toLowerCase();
      const matchInv = ord.invoiceNumber.toLowerCase().includes(q);
      const matchExt = ord.externalOrderNumber?.toLowerCase().includes(q);
      const matchCust = ord.customerName.toLowerCase().includes(q);
      const matchPhone = ord.customerPhone?.includes(q);
      if (!matchInv && !matchExt && !matchCust && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-amber-500" />
            <span>Recent Orders & Invoices Register</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Unified register of physical counter billing sales and online WooCommerce orders for Sree Kalieswari Traders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/pos"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Open POS Counter</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['ALL', 'POS', 'ONLINE'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setStatusFilter(mode)}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                statusFilter === mode
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {mode === 'ALL' ? 'All Orders' : mode === 'POS' ? 'POS Counter Bills' : 'WooCommerce Online'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search Invoice #, WooCommerce #, Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice / Order #</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Print & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No recent orders found matching your search.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-extrabold text-slate-900">
                      <div>{ord.invoiceNumber}</div>
                      {ord.externalOrderNumber && (
                        <div className="text-[10px] text-amber-700 font-semibold">
                          WC #{ord.externalOrderNumber}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {ord.type === 'POS' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                          POS COUNTER
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1 w-max">
                          <Globe className="w-3 h-3 text-amber-600" />
                          <span>WOOCOMMERCE</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{ord.customerName}</div>
                      <div className="text-[10px] text-slate-400">{ord.customerPhone || 'Walk-in'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      <div>{new Date(ord.createdAt).toLocaleDateString('en-IN')}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(ord.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">
                      {ord.itemsCount} Pcs
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      ₹{ord.grandTotal.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ord.paymentStatus === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {ord.paymentStatus}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">{ord.paymentMethod}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-[10px]">
                      <span className="text-slate-700">{ord.status}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {ord.type === 'POS' && (
                          <>
                            <button
                              onClick={() => handlePrintThermal(ord.rawSale)}
                              className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                              title="Print 80mm Thermal Receipt"
                            >
                              <Printer className="w-4 h-4 text-amber-600" />
                            </button>
                            <button
                              onClick={() => handlePrintA4(ord.rawSale)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                              title="Print A4 GST Tax Invoice"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSelectedSale(ord.rawSale)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                              title="View Invoice Summary"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {ord.type === 'ONLINE' && (
                          <Link
                            href="/online-orders"
                            className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition"
                            title="Manage Online Order"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 text-xs">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold">Sale Invoice: {selectedSale.invoiceNumber}</span>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="flex justify-between border-b pb-3 text-slate-600">
                <div>
                  <div className="font-bold text-slate-900">{selectedSale.customerName || 'Walk-in Customer'}</div>
                  <div>Phone: {selectedSale.customerPhone || 'N/A'}</div>
                </div>
                <div className="text-right">
                  <div>Date: {new Date(selectedSale.createdAt).toLocaleDateString('en-IN')}</div>
                  <div>Mode: <strong>{selectedSale.billingMode}</strong></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-800">Items:</div>
                <div className="divide-y divide-slate-100 border rounded-lg overflow-hidden">
                  {selectedSale.items.map((i, idx) => (
                    <div key={idx} className="p-2 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{i.product.name}</div>
                        <div className="text-[10px] text-slate-400">{i.quantity} x ₹{i.unitPrice}</div>
                      </div>
                      <div className="font-black text-slate-900">₹{i.totalAmount.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-slate-700 font-medium">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{selectedSale.subtotal.toFixed(2)}</span>
                </div>
                {selectedSale.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount:</span>
                    <span>-₹{selectedSale.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Taxable Value:</span>
                  <span>₹{selectedSale.taxableValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (CGST 9% + SGST 9%):</span>
                  <span>₹{selectedSale.totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-slate-950 pt-2 border-t">
                  <span>Grand Total:</span>
                  <span>₹{selectedSale.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t flex justify-between">
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="px-3.5 py-1.5 border rounded-lg font-bold hover:bg-slate-100"
              >
                Close
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintThermal(selectedSale)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>80mm Thermal</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintA4(selectedSale)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>A4 Invoice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
