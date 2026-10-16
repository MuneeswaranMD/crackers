'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Plus, Phone, MapPin, X, Edit2 } from 'lucide-react';
import { db } from '@/lib/db';
import { Supplier } from '@/types';
import { formatINR } from '@/lib/calculations';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplier | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [city, setCity] = useState('Sivakasi');
  const [outstanding, setOutstanding] = useState('0');

  const loadData = () => {
    db.initDefaults();
    setSuppliers(db.getSuppliers());
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAdd = () => {
    setEditingSup(null);
    setCompanyName('');
    setContactPerson('');
    setPhone('');
    setGstin('');
    setCity('Sivakasi');
    setOutstanding('0');
    setModalOpen(true);
  };

  const openEdit = (sup: Supplier) => {
    setEditingSup(sup);
    setCompanyName(sup.companyName);
    setContactPerson(sup.contactPerson || '');
    setPhone(sup.phone);
    setGstin(sup.gstin || '');
    setCity(sup.city || 'Sivakasi');
    setOutstanding(sup.outstandingPayable.toString());
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !phone.trim()) return;

    const supObj: Supplier = {
      id: editingSup ? editingSup.id : `sup-${Date.now()}`,
      shopId: 'shop-sivakasi-01',
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim(),
      gstin: gstin.trim() || undefined,
      city: city.trim() || 'Sivakasi',
      state: 'Tamil Nadu',
      outstandingPayable: parseFloat(outstanding) || 0,
      isActive: true,
    };

    db.saveSupplier(supObj);
    loadData();
    setModalOpen(false);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            <span>Suppliers & Manufacturers</span>
          </h2>
          <p className="text-xs text-slate-500">
            Sivakasi fireworks manufacturers, contact persons, GSTIN, and outstanding balances.
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map((sup) => (
          <div
            key={sup.id}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 transition flex flex-col justify-between text-xs space-y-3"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{sup.companyName}</h3>
                  {sup.contactPerson && (
                    <div className="text-slate-500 font-medium mt-0.5">
                      Attn: {sup.contactPerson}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openEdit(sup)}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-3 space-y-1.5 text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{sup.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{sup.city}, {sup.state}</span>
                </div>
                {sup.gstin && (
                  <div className="font-mono font-bold text-slate-800 text-[11px] pt-1">
                    GSTIN: {sup.gstin}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-500">Payable Balance:</span>
              <span
                className={`font-black text-sm ${
                  sup.outstandingPayable > 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {formatINR(sup.outstandingPayable)}
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
                {editingSup ? 'Edit Supplier' : 'Add New Supplier'}
              </span>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Company / Factory Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Standard Fireworks Pvt Ltd"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Contact Person</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Manager Rajan"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="33AAAAA0000A1Z5"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Initial Payable Balance (₹)</label>
                <input
                  type="number"
                  value={outstanding}
                  onChange={(e) => setOutstanding(e.target.value)}
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
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
