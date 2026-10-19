'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Download, X, Calendar, DollarSign } from 'lucide-react';
import { db } from '@/lib/db';
import { Expense } from '@/types';
import { formatINR } from '@/lib/calculations';

const CATEGORIES = [
  'SHOP_RENT_STALL',
  'ELECTRICITY_LIGHTING',
  'TRANSPORT_LORRY_FREIGHT',
  'LABOR_DAILY_COOLIE',
  'PACKAGING_JUTE_COVERS',
  'TEA_SNACKS_MEALS',
  'FIRE_POLICE_LICENSE_PERMIT',
  'MISCELLANEOUS',
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI'>('CASH');
  const [remarks, setRemarks] = useState('');

  const loadData = () => {
    db.initDefaults();
    setExpenses(db.getExpenses());
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      shopId: 'shop-sivakasi-01',
      category,
      amount: parsedAmount,
      paidTo: paidTo.trim() || undefined,
      paymentMode,
      remarks: remarks.trim() || undefined,
      expenseDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    db.saveExpense(newExpense);
    loadData();
    setModalOpen(false);
    setAmount('');
    setPaidTo('');
    setRemarks('');
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-600" />
            <span>Shop Operating Expenses</span>
          </h2>
          <p className="text-xs text-slate-500">
            Track daily wages, stall rent, transport lorry freight, generator diesel, and coolie expenses.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Metric Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-400 font-semibold uppercase">Total Operating Expenses Logged:</span>
          <div className="text-2xl font-black text-rose-600 mt-0.5">{formatINR(totalExpense)}</div>
        </div>
        <span className="text-slate-500 font-medium">{expenses.length} Expense Entries</span>
      </div>

      {/* Mobile Expenses Card View (md:hidden) */}
      <div className="md:hidden space-y-3">
        {expenses.map((exp) => (
          <div
            key={exp.id}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">{exp.category.replace(/_/g, ' ')}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                {exp.paymentMode}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500 border-y border-slate-100 py-1.5">
              <span>Paid to: <strong className="text-slate-800">{exp.paidTo || 'N/A'}</strong></span>
              <span>{exp.expenseDate}</span>
            </div>
            <div className="flex justify-between items-center pt-0.5">
              <span className="text-[11px] text-slate-500 truncate max-w-[200px]">{exp.remarks || '-'}</span>
              <span className="font-black text-rose-600 text-sm">{formatINR(exp.amount)}</span>
            </div>
          </div>
        ))}
        {expenses.length === 0 && (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
            No operating expenses recorded yet.
          </div>
        )}
      </div>

      {/* Expenses Table: Desktop View (hidden md:block) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Expense Category</th>
                <th className="p-3">Paid To</th>
                <th className="p-3">Remarks</th>
                <th className="p-3 text-center">Payment Mode</th>
                <th className="p-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 text-slate-600">{exp.expenseDate}</td>
                  <td className="p-3 font-bold text-slate-800">
                    {exp.category.replace(/_/g, ' ')}
                  </td>
                  <td className="p-3 text-slate-700">{exp.paidTo || 'N/A'}</td>
                  <td className="p-3 text-slate-500">{exp.remarks || '-'}</td>
                  <td className="p-3 text-center font-bold text-slate-700">{exp.paymentMode}</td>
                  <td className="p-3 text-right font-black text-slate-900 text-sm">
                    {formatINR(exp.amount)}
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No operating expenses recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 text-xs">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-amber-400 text-sm">Record Daily Shop Expense</span>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-3.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Expense Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Paid To Person / Vendor</label>
                  <input
                    type="text"
                    placeholder="e.g. Lorry Driver Kumar"
                    value={paidTo}
                    onChange={(e) => setPaidTo(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Remarks / Voucher Ref</label>
                <input
                  type="text"
                  placeholder="e.g. Unloading 40 bundles from Standard Fire Works"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
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
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
