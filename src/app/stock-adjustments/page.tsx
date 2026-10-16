'use client';

import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { db } from '@/lib/db';
import { Product } from '@/types';

export default function StockAdjustmentsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProdId, setSelectedProdId] = useState('');
  const [newStock, setNewStock] = useState('');
  const [reason, setReason] = useState('PHYSICAL_COUNT_AUDIT');
  const [customRemarks, setCustomRemarks] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = () => {
    db.initDefaults();
    const prods = db.getProducts();
    setProducts(prods);
    if (prods.length > 0 && !selectedProdId) {
      setSelectedProdId(prods[0].id);
      setNewStock(prods[0].currentStock.toString());
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProductChange = (prodId: string) => {
    setSelectedProdId(prodId);
    const p = products.find((x) => x.id === prodId);
    if (p) setNewStock(p.currentStock.toString());
  };

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(newStock);
    if (isNaN(qty) || qty < 0) return;

    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) return;

    const fullReason = `${reason}: ${customRemarks || 'Physical godown stock reconciliation'}`;
    db.recordStockAdjustment(selectedProdId, qty, fullReason);

    loadData();
    setSuccessMsg(`Successfully adjusted stock for "${prod.name}" to ${qty} ${prod.uom}. Ledger updated!`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const selectedProduct = products.find((p) => p.id === selectedProdId);
  const diff = selectedProduct ? parseInt(newStock || '0') - selectedProduct.currentStock : 0;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-amber-600" />
          <span>Physical Stock Adjustments</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Reconcile physical warehouse counts, record damp/damaged fireworks write-offs, and update stock ledger with auditable reasons.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Adjustment Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-xs">
        <form onSubmit={handleApplyAdjustment} className="space-y-4">
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">Select Fireworks Item *</label>
            <select
              value={selectedProdId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.brand}) — Current Stock: {p.currentStock} {p.uom}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-slate-400 font-semibold block">Current Recorded:</span>
                <span className="text-base font-extrabold text-slate-800">
                  {selectedProduct.currentStock} {selectedProduct.uom}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">New Count:</span>
                <span className="text-base font-extrabold text-slate-900">
                  {newStock || 0} {selectedProduct.uom}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Discrepancy:</span>
                <span
                  className={`text-base font-black ${
                    diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-500'
                  }`}
                >
                  {diff > 0 ? `+${diff}` : diff}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">New Physical Stock Count *</label>
              <input
                type="number"
                min="0"
                required
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Adjustment Reason *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="PHYSICAL_COUNT_AUDIT">Physical Count Reconciliation</option>
                <option value="DAMAGED_DAMP_SCRAP">Damaged / Moisture / Scrap Write-Off</option>
                <option value="SUPPLIER_SHORT_DELIVERY">Supplier Shortage on Unloading</option>
                <option value="SAMPLE_TESTING">PESO Green Cracker Sample Testing</option>
                <option value="OTHER_CORRECTION">Other Reason</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Remarks & Details</label>
            <input
              type="text"
              placeholder="e.g. Godown Shelf B count verified by staff"
              value={customRemarks}
              onChange={(e) => setCustomRemarks(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg shadow transition text-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Post Stock Adjustment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
