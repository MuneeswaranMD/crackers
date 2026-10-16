'use client';

import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Phone, MapPin, Download, Edit2, X, Receipt } from 'lucide-react';
import { db } from '@/lib/db';
import { Customer } from '@/types';
import { formatINR } from '@/lib/calculations';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCust, setEditingCust] = useState<Customer | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [city, setCity] = useState('Madurai');
  const [creditBalance, setCreditBalance] = useState('0');

  const loadData = async () => {
    db.initDefaults();
    setCustomers(db.getCustomers());

    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setCustomers(data.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch customers from Supabase:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAdd = () => {
    setEditingCust(null);
    setName('');
    setPhone('');
    setEmail('');
    setGstin('');
    setCity('Madurai');
    setCreditBalance('0');
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditingCust(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email || '');
    setGstin(c.gstin || '');
    setCity(c.city || 'Madurai');
    setCreditBalance(c.creditBalance.toString());
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const custObj: Customer = {
      id: editingCust ? editingCust.id : `cust-${Date.now()}`,
      shopId: 'shop-sivakasi-01',
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      gstin: gstin.trim() || undefined,
      city: city.trim() || 'Madurai',
      state: 'Tamil Nadu',
      creditBalance: parseFloat(creditBalance) || 0,
      isActive: true,
    };

    db.saveCustomer(custObj);
    loadData();
    setModalOpen(false);
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.city && c.city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <span>Customer Directory & Ledger</span>
          </h2>
          <p className="text-xs text-slate-500">
            Manage retail buyers, wholesale cracker accounts, outstanding store credit, and phone lookups.
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer by name, phone, or city..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 transition flex flex-col justify-between text-xs space-y-3"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
                  <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono font-medium">{c.phone}</span>
                  </div>
                </div>
                <button
                  onClick={() => openEdit(c)}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-3 space-y-1 text-slate-600">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{c.city || 'Tamil Nadu'}</span>
                </div>
                {c.gstin && (
                  <div className="font-mono text-[10px] text-slate-500 font-bold">
                    GSTIN: {c.gstin}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-500">Outstanding Balance:</span>
              <span
                className={`font-black text-sm ${
                  c.creditBalance > 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {formatINR(c.creditBalance)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 text-xs">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-amber-400 text-sm">
                {editingCust ? 'Edit Customer' : 'Add New Customer'}
              </span>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Senthil Nathan"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">City / Town</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Credit Due (₹)</label>
                <input
                  type="number"
                  value={creditBalance}
                  onChange={(e) => setCreditBalance(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
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
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
