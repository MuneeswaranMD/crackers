'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  X,
  Trash2,
  Download,
} from 'lucide-react';
import { db } from '@/lib/db';
import { Purchase, Supplier, Product, PurchaseItem } from '@/types';
import { formatINR } from '@/lib/calculations';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // New Purchase Form
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<{ productId: string; quantity: number; unitCost: number }[]>([]);
  const [paidAmount, setPaidAmount] = useState('0');

  const loadData = () => {
    db.initDefaults();
    setPurchases(db.getPurchases());
    const sups = db.getSuppliers();
    setSuppliers(sups);
    if (sups.length > 0 && !supplierId) setSupplierId(sups[0].id);
    const prods = db.getProducts();
    setProducts(prods);
    if (prods.length > 0 && items.length === 0) {
      setItems([{ productId: prods[0].id, quantity: 50, unitCost: prods[0].purchasePrice }]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addItemRow = () => {
    if (products.length > 0) {
      setItems([...items, { productId: products[0].id, quantity: 20, unitCost: products[0].purchasePrice }]);
    }
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, val: any) => {
    const updated = [...items];
    if (field === 'productId') {
      const p = products.find((x) => x.id === val);
      updated[index].productId = val;
      if (p) updated[index].unitCost = p.purchasePrice;
    } else if (field === 'quantity') {
      updated[index].quantity = parseInt(val) || 0;
    } else if (field === 'unitCost') {
      updated[index].unitCost = parseFloat(val) || 0;
    }
    setItems(updated);
  };

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
  const tax = subtotal * 0.18; // Standard 18% GST on fireworks
  const grandTotal = Math.round(subtotal + tax);

  const handlePostPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !invoiceNo.trim() || items.length === 0) return;

    const sup = suppliers.find((s) => s.id === supplierId);
    const purchaseObj: Purchase = {
      id: `pur-${Date.now()}`,
      shopId: 'shop-sivakasi-01',
      supplierId,
      supplierName: sup?.companyName || 'Supplier',
      supplierInvoiceNo: invoiceNo.trim(),
      invoiceDate,
      receivedDate: new Date().toISOString().split('T')[0],
      subtotal,
      taxAmount: tax,
      grandTotal,
      paidAmount: parseFloat(paidAmount) || 0,
      status: 'POSTED',
      items: items.map((i) => {
        const prod = products.find((p) => p.id === i.productId);
        return {
          productId: i.productId,
          productName: prod?.name || 'Product',
          quantity: i.quantity,
          unitCost: i.unitCost,
          taxRate: 18,
          totalCost: i.quantity * i.unitCost * 1.18,
        };
      }),
      createdAt: new Date().toISOString(),
    };

    db.postPurchase(purchaseObj);
    loadData();
    setModalOpen(false);
    setInvoiceNo('');
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-600" />
            <span>Purchases & Goods Inward Register</span>
          </h2>
          <p className="text-xs text-slate-500">
            Record stock receiving from Sivakasi cracker manufacturers, update purchase ledger, and track supplier payables.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Record Purchase (Inward)</span>
        </button>
      </div>

      {/* Mobile Purchases Card View (md:hidden) */}
      <div className="md:hidden space-y-3">
        {purchases.map((p) => (
          <div
            key={p.id}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-900">{p.supplierInvoiceNo}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  p.paidAmount >= p.grandTotal
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-800'
                }`}
              >
                {p.paidAmount >= p.grandTotal ? 'PAID' : `DUE: ₹${(p.grandTotal - p.paidAmount).toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between items-start border-y border-slate-100 py-1.5">
              <div>
                <div className="font-semibold text-slate-800">{p.supplierName}</div>
                <div className="text-[11px] text-slate-400">
                  {p.items.length} items ({p.items.reduce((s, i) => s + i.quantity, 0)} boxes)
                </div>
              </div>
              <div className="text-[11px] text-slate-500">{p.invoiceDate}</div>
            </div>
            <div className="flex justify-between items-center pt-0.5">
              <div className="text-[11px] text-slate-500">
                Taxable: ₹{p.subtotal.toFixed(2)} • GST: ₹{p.taxAmount.toFixed(2)}
              </div>
              <div className="font-black text-slate-900 text-sm">{formatINR(p.grandTotal)}</div>
            </div>
          </div>
        ))}
        {purchases.length === 0 && (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
            No purchase inward records entered yet.
          </div>
        )}
      </div>

      {/* Table: Desktop/Tablet View (hidden md:block) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Purchase Date</th>
                <th className="p-3">Supplier Invoice No</th>
                <th className="p-3">Supplier Name</th>
                <th className="p-3 text-center">Items Received</th>
                <th className="p-3 text-right">Taxable</th>
                <th className="p-3 text-right">GST (18%)</th>
                <th className="p-3 text-right">Grand Total</th>
                <th className="p-3 text-center">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 text-slate-600">{p.invoiceDate}</td>
                  <td className="p-3 font-mono font-bold text-slate-900">{p.supplierInvoiceNo}</td>
                  <td className="p-3 font-semibold text-slate-800">{p.supplierName}</td>
                  <td className="p-3 text-center">
                    {p.items.length} products ({p.items.reduce((s, i) => s + i.quantity, 0)} boxes)
                  </td>
                  <td className="p-3 text-right text-slate-600">₹{p.subtotal.toFixed(2)}</td>
                  <td className="p-3 text-right text-slate-600">₹{p.taxAmount.toFixed(2)}</td>
                  <td className="p-3 text-right font-black text-slate-900 text-sm">
                    {formatINR(p.grandTotal)}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.paidAmount >= p.grandTotal
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {p.paidAmount >= p.grandTotal ? 'PAID' : `DUE: ₹${(p.grandTotal - p.paidAmount).toFixed(2)}`}
                    </span>
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No purchase inward records entered yet. Click "Record Purchase" to add supplier stock!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Purchase Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 text-xs">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-amber-400 text-sm flex items-center gap-2">
                <Truck className="w-4 h-4" />
                <span>Record Supplier Purchase (Goods Inward)</span>
              </span>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePostPurchase} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Select Supplier *</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Supplier Bill No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SFW/24/981"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span>Inward Fireworks Items</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs text-amber-600 hover:text-amber-800 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {items.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={row.productId}
                      onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                      className="flex-1 p-1.5 border border-slate-300 rounded bg-white text-xs font-semibold"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.packSize})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={row.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      className="w-20 p-1.5 border border-slate-300 rounded bg-white text-center font-bold"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Unit Cost"
                      value={row.unitCost}
                      onChange={(e) => updateItem(idx, 'unitCost', e.target.value)}
                      className="w-24 p-1.5 border border-slate-300 rounded bg-white text-right font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Totals Summary */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-right">
                <div>Subtotal: <strong>₹{subtotal.toFixed(2)}</strong></div>
                <div>GST (18%): <strong>₹{tax.toFixed(2)}</strong></div>
                <div className="text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                  Grand Total: {formatINR(grandTotal)}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Paid Amount (₹)</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="Enter amount paid to supplier..."
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg shadow"
                >
                  Post Inward & Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
