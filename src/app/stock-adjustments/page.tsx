'use client';

import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  PackageCheck
} from 'lucide-react';
import { db } from '@/lib/db';
import { Product, StockMovement } from '@/types';

export default function StockAdjustmentsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProdId, setSelectedProdId] = useState('');
  const [newStock, setNewStock] = useState('');
  const [reason, setReason] = useState('PHYSICAL_COUNT_AUDIT');
  const [customRemarks, setCustomRemarks] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [searchLedger, setSearchLedger] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    db.initDefaults();

    // 1. Initial load from local database
    let prods = db.getProducts();
    setProducts(prods);

    let localMovs = db.getStockMovements();
    setMovements(localMovs);

    // 2. Fetch fresh products from Supabase API
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          prods = json.data;
          setProducts(prods);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch products from server, using local cache:', err);
    }

    // 3. Fetch fresh stock movements from Supabase API
    try {
      const movRes = await fetch('/api/stock-adjustments');
      if (movRes.ok) {
        const movJson = await movRes.json();
        if (movJson.success && Array.isArray(movJson.data)) {
          setMovements(movJson.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch stock movements from server, using local cache:', err);
    }

    // Set initial product if not already selected
    if (prods.length > 0) {
      setSelectedProdId((prev) => {
        const existing = prods.find((p) => p.id === prev);
        if (existing) {
          setNewStock(existing.currentStock.toString());
          return existing.id;
        }
        setNewStock(prods[0].currentStock.toString());
        return prods[0].id;
      });
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProductChange = (prodId: string) => {
    setSelectedProdId(prodId);
    const p = products.find((x) => x.id === prodId);
    if (p) setNewStock(p.currentStock.toString());
  };

  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const qty = parseInt(newStock, 10);
    if (isNaN(qty) || qty < 0) {
      setErrorMsg('Please enter a valid stock count (0 or higher).');
      return;
    }

    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) {
      setErrorMsg('Selected product could not be found.');
      return;
    }

    setIsSubmitting(true);
    const fullReason = `${reason}: ${customRemarks || 'Physical godown stock reconciliation'}`;

    try {
      const result = await db.recordStockAdjustment(selectedProdId, qty, fullReason);
      if (result.success) {
        setSuccessMsg(
          `Successfully adjusted "${prod.name}" to ${qty} ${prod.uom}. Discrepancy logged and ledger updated!`
        );
        setCustomRemarks('');
        await loadData();
      } else {
        setErrorMsg(result.error || 'Failed to adjust stock.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred while saving stock adjustment.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 5000);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProdId);
  const diff = selectedProduct ? parseInt(newStock || '0', 10) - selectedProduct.currentStock : 0;

  // Filter movements for the audit ledger
  const filteredMovements = movements.filter((m) => {
    const term = searchLedger.toLowerCase();
    return (
      m.productName.toLowerCase().includes(term) ||
      (m.remarks && m.remarks.toLowerCase().includes(term)) ||
      m.movementType.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <span>Physical Stock Adjustments</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Reconcile physical warehouse godown counts, write off damp/damaged fireworks, and maintain a PESO & GST audit trail.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition shadow-sm self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-3 font-bold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-3 font-bold animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Adjustment Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-xs">
        <h3 className="font-extrabold text-slate-900 text-sm mb-4 flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-amber-600" />
          <span>Reconciliation Entry</span>
        </h3>

        <form onSubmit={handleApplyAdjustment} className="space-y-5">
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">Select Fireworks Item *</label>
            <select
              value={selectedProdId}
              onChange={(e) => handleProductChange(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs bg-white shadow-sm"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.tamilName ? `(${p.tamilName})` : ''} [{p.brand}] — Current: {p.currentStock} {p.uom}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-3 text-center">
              <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs">
                <span className="text-slate-400 font-bold block text-[11px] mb-0.5">Current Recorded</span>
                <span className="text-lg font-black text-slate-800">
                  {selectedProduct.currentStock} <span className="text-xs font-semibold text-slate-500">{selectedProduct.uom}</span>
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs">
                <span className="text-slate-400 font-bold block text-[11px] mb-0.5">New Physical Count</span>
                <span className="text-lg font-black text-slate-900">
                  {newStock || 0} <span className="text-xs font-semibold text-slate-500">{selectedProduct.uom}</span>
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs">
                <span className="text-slate-400 font-bold block text-[11px] mb-0.5">Discrepancy</span>
                <span
                  className={`text-lg font-black flex items-center justify-center gap-1 ${
                    diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-500'
                  }`}
                >
                  {diff > 0 ? (
                    <>
                      <ArrowUpRight className="w-4 h-4" />
                      +{diff}
                    </>
                  ) : diff < 0 ? (
                    <>
                      <ArrowDownRight className="w-4 h-4" />
                      {diff}
                    </>
                  ) : (
                    '0'
                  )}
                  <span className="text-xs font-semibold text-slate-400">{selectedProduct.uom}</span>
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">New Physical Stock Count *</label>
              <input
                type="number"
                min="0"
                required
                disabled={isSubmitting}
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                placeholder="Enter verified count"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Adjustment Reason *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs shadow-sm"
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
            <label className="font-bold text-slate-700 block mb-1.5">Remarks & Details</label>
            <input
              type="text"
              placeholder="e.g. Godown Shelf B count verified by staff; 2 boxes damaged by rain moisture"
              value={customRemarks}
              onChange={(e) => setCustomRemarks(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-xs shadow-sm"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md hover:shadow-lg transition text-xs flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving & Syncing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Post Stock Adjustment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Movements & Audit Trail */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600" />
              <span>Stock Movements & Adjustment Audit Ledger</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Live audit history of physical adjustments, supplier receipts, sales deductions, and write-offs.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter product or reason..."
              value={searchLedger}
              onChange={(e) => setSearchLedger(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50 font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">Movement Type</th>
                <th className="py-2.5 px-3 text-right">Adjustment</th>
                <th className="py-2.5 px-3 text-right">Balance After</th>
                <th className="py-2.5 px-3">Remarks & Audit Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No matching stock movement records found.
                  </td>
                </tr>
              ) : (
                filteredMovements.slice(0, 30).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {new Date(m.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                      {m.productName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.movementType === 'STOCK_ADJUSTMENT'
                            ? 'bg-amber-100 text-amber-800'
                            : m.movementType === 'SALE_DEDUCTION'
                            ? 'bg-blue-100 text-blue-800'
                            : m.movementType === 'PURCHASE_RECEIPT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.movementType === 'DAMAGE_WRITE_OFF'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {m.movementType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <span
                        className={`font-black ${
                          m.quantity > 0
                            ? 'text-emerald-600'
                            : m.quantity < 0
                            ? 'text-rose-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                      {m.balanceAfter}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-xs truncate" title={m.remarks}>
                      {m.remarks || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
