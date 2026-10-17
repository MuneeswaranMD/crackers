'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Search,
  AlertTriangle,
  History,
  TrendingDown,
  TrendingUp,
  Download,
  SlidersHorizontal,
  RefreshCw,
  Package,
} from 'lucide-react';
import { db, getProductImageUrl } from '@/lib/db';
import { Product, StockMovement } from '@/types';
import { formatINR } from '@/lib/calculations';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [activeTab, setActiveTab] = useState<'balances' | 'ledger'>('balances');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    db.initDefaults();
    setProducts(db.getProducts());
    setMovements(db.getStockMovements());

    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setProducts(data.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch inventory from Supabase:', err);
    }

    try {
      const movRes = await fetch('/api/stock-adjustments');
      if (movRes.ok) {
        const movData = await movRes.json();
        if (movData.success && Array.isArray(movData.data) && movData.data.length > 0) {
          setMovements(movData.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch stock movements from Supabase:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalCostValuation = products.reduce((sum, p) => sum + p.purchasePrice * p.currentStock, 0);
  const totalRetailValuation = products.reduce((sum, p) => sum + p.sellingPrice * p.currentStock, 0);
  const totalUnits = products.reduce((sum, p) => sum + p.currentStock, 0);
  const lowStockCount = products.filter((p) => p.currentStock <= p.minStockAlert).length;

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.tamilName && p.tamilName.toLowerCase().includes(search.toLowerCase())) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMovements = movements.filter(
    (m) =>
      m.productName.toLowerCase().includes(search.toLowerCase()) ||
      (m.remarks && m.remarks.toLowerCase().includes(search.toLowerCase())) ||
      m.movementType.toLowerCase().includes(search.toLowerCase())
  );

  const exportInventoryCSV = () => {
    const headers = ['SKU', 'Product Name', 'Category', 'Stock Available', 'UOM', 'Cost Price', 'Cost Valuation', 'Selling Price', 'Retail Valuation'];
    const rows = products.map((p) => [
      p.sku,
      `"${p.name}"`,
      `"${p.categoryName || ''}"`,
      p.currentStock,
      p.uom,
      p.purchasePrice,
      p.purchasePrice * p.currentStock,
      p.sellingPrice,
      p.sellingPrice * p.currentStock,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_valuation_${Date.now()}.csv`);
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
            <Boxes className="w-5 h-5 text-amber-600" />
            <span>Fireworks Inventory & Stock Ledger</span>
          </h2>
          <p className="text-xs text-slate-500">
            Monitor real-time physical stock counts, stock movements ledger, and inventory valuation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportInventoryCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export Valuation</span>
          </button>
          <Link
            href="/stock-adjustments"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow transition"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Stock Adjustment</span>
          </Link>
        </div>
      </div>

      {/* Valuation Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 font-semibold uppercase">Total Units in Godown</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{totalUnits.toLocaleString('en-IN')} Boxes</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 font-semibold uppercase">Cost Valuation (COGS)</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{formatINR(totalCostValuation)}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 font-semibold uppercase">Retail Valuation</div>
          <div className="text-xl font-extrabold text-amber-700 mt-1">{formatINR(totalRetailValuation)}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 font-semibold uppercase">Low-Stock Items</div>
          <div className="text-xl font-extrabold text-rose-600 mt-1">{lowStockCount} Items</div>
        </div>
      </div>

      {/* Navigation Tabs and Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 font-bold">
          <button
            onClick={() => setActiveTab('balances')}
            className={`px-4 py-1.5 rounded-lg transition ${
              activeTab === 'balances' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Current Stock Balances
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-1.5 rounded-lg transition ${
              activeTab === 'ledger' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stock Movement Ledger ({movements.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items, SKU, or movements..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Balances Tab */}
      {activeTab === 'balances' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Cracker Item</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Pack & Brand</th>
                  <th className="px-4 py-3 text-right">Available Stock</th>
                  <th className="px-4 py-3 text-right">Cost Price</th>
                  <th className="px-4 py-3 text-right">Selling Price</th>
                  <th className="px-4 py-3 text-right">Total Cost Value</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isLow = p.currentStock <= p.minStockAlert;
                  const isOut = p.currentStock <= 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.imageUrl || getProductImageUrl(p)}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-50"
                          />
                          <div>
                            <div className="font-bold text-slate-900">{p.name}</div>
                            {p.tamilName && <div className="text-[11px] text-slate-500">{p.tamilName}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{p.sku}</td>
                      <td className="px-4 py-3 text-slate-600">{p.packSize} • {p.brand}</td>
                      <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                        {p.currentStock} {p.uom}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">₹{p.purchasePrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">₹{p.sellingPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">
                        {formatINR(p.purchasePrice * p.currentStock)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isOut
                              ? 'bg-rose-100 text-rose-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Stock Ledger Tab */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Movement Type</th>
                  <th className="px-4 py-3 text-right">Qty Change</th>
                  <th className="px-4 py-3 text-right">Balance After</th>
                  <th className="px-4 py-3">Reference / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">{m.productName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {m.movementType}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-black ${
                        m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {m.balanceAfter}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{m.remarks || 'N/A'}</td>
                  </tr>
                ))}
                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No stock movement ledger transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
