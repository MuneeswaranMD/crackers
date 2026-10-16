'use client';

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  X,
} from 'lucide-react';
import { db } from '@/lib/db';
import { Sale, SaleReturn, Product } from '@/types';
import { formatINR } from '@/lib/calculations';

export default function ReturnsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [foundSale, setFoundSale] = useState<Sale | null>(null);
  
  // Return form state
  const [returnItems, setReturnItems] = useState<{
    productId: string;
    productName: string;
    maxQty: number;
    returnQty: number;
    unitPrice: number;
    restockStatus: 'RESTOCKED' | 'DAMAGED_SCRAP';
  }[]>([]);
  const [returnReason, setReturnReason] = useState('DEFECTIVE_FUSE');
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'CREDIT_NOTE' | 'UPI'>('CASH');
  const [successCN, setSuccessCN] = useState<string | null>(null);

  const loadData = () => {
    db.initDefaults();
    setSales(db.getSales());
    setReturns(db.getReturns());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessCN(null);
    const sale = sales.find(
      (s) => s.invoiceNumber.toLowerCase() === invoiceSearch.trim().toLowerCase()
    );
    if (sale) {
      setFoundSale(sale);
      setReturnItems(
        sale.items.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          maxQty: i.quantity,
          returnQty: 0,
          unitPrice: i.unitPrice,
          restockStatus: 'RESTOCKED',
        }))
      );
    } else {
      alert(`Invoice "${invoiceSearch}" not found. Please verify invoice number.`);
    }
  };

  const updateItemQty = (prodId: string, qty: number) => {
    setReturnItems((prev) =>
      prev.map((i) => (i.productId === prodId ? { ...i, returnQty: Math.max(0, Math.min(i.maxQty, qty)) } : i))
    );
  };

  const updateRestockStatus = (prodId: string, status: 'RESTOCKED' | 'DAMAGED_SCRAP') => {
    setReturnItems((prev) =>
      prev.map((i) => (i.productId === prodId ? { ...i, restockStatus: status } : i))
    );
  };

  const totalRefundAmount = returnItems.reduce((sum, i) => sum + i.returnQty * i.unitPrice, 0);

  const handleProcessReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundSale) return;
    const itemsToReturn = returnItems.filter((i) => i.returnQty > 0);
    if (itemsToReturn.length === 0) {
      alert('Please specify quantity to return for at least one item.');
      return;
    }

    const cnNumber = db.getNextCreditNoteNumber();
    const returnRecord: SaleReturn = {
      id: `ret-${Date.now()}`,
      shopId: foundSale.shopId,
      saleId: foundSale.id,
      invoiceNumber: foundSale.invoiceNumber,
      creditNoteNumber: cnNumber,
      customerName: foundSale.customerName,
      reason: returnReason,
      refundMethod,
      totalRefund: totalRefundAmount,
      items: itemsToReturn.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.returnQty,
        refundRate: i.unitPrice,
        refundAmount: i.returnQty * i.unitPrice,
        restockStatus: i.restockStatus,
      })),
      createdAt: new Date().toISOString(),
    };

    db.processReturn(returnRecord);
    loadData();
    setSuccessCN(cnNumber);
    setFoundSale(null);
    setInvoiceSearch('');
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-amber-600" />
          <span>Returns & Credit Notes Module</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Issue authorized credit notes against verified customer sales invoices. Controls restocking and inventory writes.
        </p>
      </div>

      {successCN && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>
              Credit Note <strong>{successCN}</strong> generated successfully! Stock and refunds recorded.
            </span>
          </div>
          <button onClick={() => setSuccessCN(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Invoice Lookup Form */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
        <form onSubmit={handleSearchInvoice} className="flex gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              required
              placeholder="Enter Sales Invoice No (e.g. SMF/2026-27/1001)..."
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition"
          >
            Find Invoice
          </button>
        </form>
      </div>

      {/* Active Return Form if Invoice Found */}
      {foundSale && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-md text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <div className="font-bold text-slate-900 text-sm">
                Invoice #{foundSale.invoiceNumber}
              </div>
              <div className="text-slate-500">
                Customer: {foundSale.customerName || 'Cash Retail'} • Date:{' '}
                {new Date(foundSale.createdAt).toLocaleDateString('en-IN')}
              </div>
            </div>
            <button onClick={() => setFoundSale(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Product</th>
                  <th className="p-2.5 text-center">Billed Qty</th>
                  <th className="p-2.5 text-center">Return Qty</th>
                  <th className="p-2.5 text-right">Unit Rate</th>
                  <th className="p-2.5 text-center">Condition</th>
                  <th className="p-2.5 text-right">Refund Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returnItems.map((item) => (
                  <tr key={item.productId}>
                    <td className="p-2.5 font-bold text-slate-800">{item.productName}</td>
                    <td className="p-2.5 text-center">{item.maxQty}</td>
                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        min="0"
                        max={item.maxQty}
                        value={item.returnQty}
                        onChange={(e) => updateItemQty(item.productId, parseInt(e.target.value) || 0)}
                        className="w-16 p-1 border border-slate-300 rounded text-center font-bold"
                      />
                    </td>
                    <td className="p-2.5 text-right font-medium">₹{item.unitPrice.toFixed(2)}</td>
                    <td className="p-2.5 text-center">
                      <select
                        value={item.restockStatus}
                        onChange={(e) =>
                          updateRestockStatus(item.productId, e.target.value as any)
                        }
                        className="p-1 border border-slate-200 rounded text-xs font-semibold"
                      >
                        <option value="RESTOCKED">Restock (Salable)</option>
                        <option value="DAMAGED_SCRAP">Damaged (Do Not Restock)</option>
                      </select>
                    </td>
                    <td className="p-2.5 text-right font-bold text-slate-900">
                      ₹{(item.returnQty * item.unitPrice).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Reason for Return</label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
              >
                <option value="DEFECTIVE_FUSE">Defective Fuse / Did Not Ignite</option>
                <option value="DAMAGED_PACKAGING">Damaged Outer Carton</option>
                <option value="CUSTOMER_EXCHANGE">Customer Voluntary Exchange</option>
                <option value="INCORRECT_ITEM">Wrong Item Billed</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Refund Method</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
              >
                <option value="CASH">Cash Refund</option>
                <option value="CREDIT_NOTE">Store Credit Note</option>
                <option value="UPI">UPI Reversal</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm">
              Total Refund Due: <strong className="text-lg text-slate-900">{formatINR(totalRefundAmount)}</strong>
            </div>
            <button
              onClick={handleProcessReturn}
              disabled={totalRefundAmount <= 0}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black rounded-lg shadow transition"
            >
              Issue Credit Note & Restock
            </button>
          </div>
        </div>
      )}

      {/* Credit Notes Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="px-5 py-3 border-b border-slate-100 font-bold text-slate-800">
          Posted Credit Notes History ({returns.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase">
              <tr>
                <th className="p-3">Credit Note No</th>
                <th className="p-3">Original Invoice</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Reason</th>
                <th className="p-3 text-right">Refund Amount</th>
                <th className="p-3 text-center">Refund Method</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {returns.map((ret) => (
                <tr key={ret.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-mono font-bold text-slate-900">{ret.creditNoteNumber}</td>
                  <td className="p-3 font-mono text-slate-700">{ret.invoiceNumber}</td>
                  <td className="p-3 font-semibold text-slate-800">{ret.customerName || 'Retail Customer'}</td>
                  <td className="p-3 text-slate-600">{ret.reason}</td>
                  <td className="p-3 text-right font-black text-rose-700">{formatINR(ret.totalRefund)}</td>
                  <td className="p-3 text-center font-bold text-slate-700">{ret.refundMethod}</td>
                  <td className="p-3 text-slate-500">{new Date(ret.createdAt).toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {returns.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No credit notes or returns issued yet.
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
