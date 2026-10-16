'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, Building, ShieldCheck, Flame } from 'lucide-react';
import { db } from '@/lib/db';
import { Shop, ShopSetting } from '@/types';

export default function ShopSettingsPage() {
  const [shop, setShop] = useState<Shop>(db.getShop());
  const [settings, setSettings] = useState<ShopSetting>(db.getSettings());
  const [success, setSuccess] = useState(false);

  // Shop Form
  const [name, setName] = useState(shop.name);
  const [tradeName, setTradeName] = useState(shop.tradeName || '');
  const [gstin, setGstin] = useState(shop.gstin || '');
  const [licenseNumber, setLicenseNumber] = useState(shop.licenseNumber || '');
  const [licenseValidUpto, setLicenseValidUpto] = useState(shop.licenseValidUpto || '2028-03-31');
  const [phone, setPhone] = useState(shop.phone);
  const [email, setEmail] = useState(shop.email || '');
  const [addressLine1, setAddressLine1] = useState(shop.addressLine1);
  const [city, setCity] = useState(shop.city);
  const [state, setState] = useState(shop.state);
  const [pincode, setPincode] = useState(shop.pincode);
  const [bankName, setBankName] = useState(shop.bankName || '');
  const [bankAccountNo, setBankAccountNo] = useState(shop.bankAccountNo || '');
  const [bankIfsc, setBankIfsc] = useState(shop.bankIfsc || '');
  const [bankBranch, setBankBranch] = useState(shop.bankBranch || '');
  const [upiId, setUpiId] = useState(shop.upiId || '');
  const [invoicePrefix, setInvoicePrefix] = useState(shop.invoicePrefix || 'SKT/2026-27/');
  const [footerNote, setFooterNote] = useState(shop.invoiceFooterNote || '');

  // Settings Form
  const [seasonalDiscount, setSeasonalDiscount] = useState(settings.seasonalDiscountPercentage.toString());
  const [allowNegativeStock, setAllowNegativeStock] = useState(settings.allowNegativeStock);

  useEffect(() => {
    db.initDefaults();
    const s = db.getShop();
    const set = db.getSettings();
    setShop(s);
    setSettings(set);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedShop: Shop = {
      ...shop,
      name,
      tradeName,
      gstin: gstin.toUpperCase(),
      licenseNumber,
      licenseValidUpto,
      phone,
      email,
      addressLine1,
      city,
      state,
      pincode,
      bankName,
      bankAccountNo,
      bankIfsc: bankIfsc.toUpperCase(),
      bankBranch,
      upiId,
      invoicePrefix,
      invoiceFooterNote: footerNote,
    };

    const updatedSettings: ShopSetting = {
      ...settings,
      seasonalDiscountPercentage: parseFloat(seasonalDiscount) || 70,
      allowNegativeStock,
    };

    db.updateShop(updatedShop);
    db.updateSettings(updatedSettings);

    setShop(updatedShop);
    setSettings(updatedSettings);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-600" />
          <span>Shop & Legal License Settings</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure shop legal entity, Sivakasi address, Tamil Nadu GSTIN, PESO license, bank UPI parameters, and POS rules.
        </p>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Shop details and billing configuration saved!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-xs space-y-5">
        {/* Basic Shop Identity */}
        <div>
          <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
            <Building className="w-4 h-4 text-amber-600" />
            <span>Store Identity & Trade Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Shop Legal Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Trade / Board Name</label>
              <input
                type="text"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-medium"
              />
            </div>
          </div>
        </div>

        {/* Legal & PESO License */}
        <div className="pt-3 border-t border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>GST & Explosives PESO Licensing</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tamil Nadu GSTIN</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="33AABCS1429B1Z8"
                className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">PESO License Number</label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">License Valid Upto</label>
              <input
                type="date"
                value={licenseValidUpto}
                onChange={(e) => setLicenseValidUpto(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-medium"
              />
            </div>
          </div>
        </div>

        {/* Contact & Sivakasi Address */}
        <div className="pt-3 border-t border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm mb-3">Address & Communications</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Street Address *</label>
              <input
                type="text"
                required
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-medium"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">City *</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">State</label>
              <input
                type="text"
                value={state}
                disabled
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Pincode</label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Phone *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Bank & UPI QR Setup */}
        <div className="pt-3 border-t border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm mb-3">Banking & UPI QR Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Account Number</label>
              <input
                type="text"
                value={bankAccountNo}
                onChange={(e) => setBankAccountNo(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">IFSC Code</label>
              <input
                type="text"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Shop UPI VPA ID</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="shop@upi"
                className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-amber-700"
              />
            </div>
          </div>
        </div>

        {/* Billing Policy */}
        <div className="pt-3 border-t border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm mb-3">Retail Billing Behavior</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Default Festival Seasonal Discount (% off MRP)</label>
              <input
                type="number"
                min="0"
                max="90"
                value={seasonalDiscount}
                onChange={(e) => setSeasonalDiscount(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Standard Sivakasi festival discount is 70% to 80% off printed MRP.
              </span>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Invoice Prefix Series</label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
          </div>

          <div className="pt-3">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
              <input
                type="checkbox"
                checked={allowNegativeStock}
                onChange={(e) => setAllowNegativeStock(e.target.checked)}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
              />
              <span>Allow POS Sale When Product Stock is Zero (Negative Stock Allowance)</span>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg shadow transition flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Save Shop Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}
