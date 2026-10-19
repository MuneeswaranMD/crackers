'use client';

import React, { useState, useEffect } from 'react';
import { Printer, CheckCircle2, FileText, Sliders, Scissors, Sparkles } from 'lucide-react';
import { db } from '@/lib/db';
import { ShopSetting, Shop, Sale } from '@/types';
import { generateThermalReceiptHtml, generateA4InvoiceHtml, printHtmlViaIframe } from '@/lib/print';

export default function PrinterSettingsPage() {
  const [settings, setSettings] = useState<ShopSetting>(db.getSettings());
  const [shop, setShop] = useState<Shop>(db.getShop());
  const [defaultPrintFormat, setDefaultPrintFormat] = useState<'A4' | 'THERMAL'>('A4');
  const [enableThermal80mmReceipt, setEnableThermal80mmReceipt] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [printDuplicate, setPrintDuplicate] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    db.initDefaults();
    const set = db.getSettings();
    setSettings(set);
    setDefaultPrintFormat(set.defaultPrintFormat || 'A4');
    setEnableThermal80mmReceipt(set.enableThermal80mmReceipt ?? false);
    setPaperWidth(set.thermalPrinterPaperWidth || '80mm');
    setPrintDuplicate(set.printDuplicateReceipt);
    setShop(db.getShop());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ShopSetting = {
      ...settings,
      defaultPrintFormat,
      enableThermal80mmReceipt,
      thermalPrinterPaperWidth: paperWidth,
      printDuplicateReceipt: printDuplicate,
    };
    db.updateSettings(updated);
    setSettings(updated);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleTestPrint = (format: 'THERMAL' | 'A4') => {
    // Generate a sample test sale
    const sampleSale: Sale = {
      id: 'test-sale',
      shopId: shop.id,
      customerName: 'Test Customer (Senthil)',
      customerPhone: '9842155667',
      cashierName: 'Counter POS 1',
      deviceId: 'POS-TEST',
      invoiceNumber: 'SMF/TEST/001',
      financialYear: '2026-27',
      invoiceType: 'GST_TAX_INVOICE',
      billingMode: 'GST',
      subtotal: 1200,
      discountAmount: 840,
      taxableValue: 360,
      cgstAmount: 32.4,
      sgstAmount: 32.4,
      igstAmount: 0,
      totalTax: 64.8,
      roundOff: 0.2,
      grandTotal: 425,
      paidAmount: 500,
      balanceAmount: 0,
      paymentStatus: 'PAID',
      paymentMethod: 'CASH',
      status: 'FINALIZED',
      idempotencyKey: 'test',
      isSynced: true,
      items: [
        {
          product: {
            id: 'sample-1',
            sno: 1,
            shopId: shop.id,
            sku: 'AF-001',
            barcode: '1',
            name: '3 1/2" Lakshmi',
            brand: 'Agana Fireworks',
            packSize: '1 Pkt',
            uom: 'PKT',
            purchasePrice: 10,
            mrp: 80,
            sellingPrice: 16,
            discountAllowed: true,
            maxDiscountPct: 80,
            currentStock: 100,
            minStockAlert: 10,
            isGreenCracker: true,
            pesoCertified: true,
            isActive: true,
          },
          quantity: 5,
          mrp: 80,
          unitPrice: 16,
          discountPercentage: 0,
          discountAmount: 0,
          taxableValue: 80,
          cgstRate: 9,
          cgstAmount: 7.2,
          sgstRate: 9,
          sgstAmount: 7.2,
          igstRate: 0,
          igstAmount: 0,
          totalTax: 14.4,
          totalAmount: 94.4,
        },
      ],
      payments: [],
      createdAt: new Date().toISOString(),
    };

    if (format === 'THERMAL') {
      const html = generateThermalReceiptHtml(sampleSale, shop);
      printHtmlViaIframe(html);
    } else {
      const html = generateA4InvoiceHtml(sampleSale, shop);
      printHtmlViaIframe(html);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Printer className="w-5 h-5 text-amber-600" />
          <span>A4 Invoice & Thermal Printer Settings</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure default invoice format, receipt roll width, ESC/POS hardware print options, and diagnostics.
        </p>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Printer preferences saved successfully!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-xs space-y-6">
        {/* Default Invoice & Print Format Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="font-bold text-slate-800 block text-sm">Default Invoice / Print Format</label>
              <p className="text-[11px] text-slate-500">
                Choose the standard document format automatically triggered at POS checkout and reprint screens.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 uppercase">
              {defaultPrintFormat === 'A4' ? 'A4 Invoice Active' : 'Thermal 80mm Active'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mt-3">
            <button
              type="button"
              onClick={() => setDefaultPrintFormat('A4')}
              className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                defaultPrintFormat === 'A4'
                  ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20 text-slate-900 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 mt-0.5 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm text-slate-900">Print A4 Invoice</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500 text-slate-950 uppercase">
                    Default
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Full A4 GST Tax Invoice page with company letterhead, tax breakups, QR codes, and terms.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDefaultPrintFormat('THERMAL')}
              className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                defaultPrintFormat === 'THERMAL'
                  ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20 text-slate-900 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600 mt-0.5 shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-slate-800">Print 80mm Thermal Receipt</span>
                <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Fast roll receipt for counter POS thermal printers (requires thermal receipt enabled).
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 80mm Thermal Receipt Toggle Option */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableThermal80mmReceipt}
              onChange={(e) => setEnableThermal80mmReceipt(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
            />
            <div>
              <span className="font-bold text-slate-800 block text-xs">
                Enable 80mm Thermal Receipt Printing
              </span>
              <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                Disable this option to turn off 80mm thermal receipts and diagnostic test receipts across the POS application.
              </span>
            </div>
          </label>
        </div>

        {/* Thermal Paper Roll Width (shown when thermal is enabled) */}
        {enableThermal80mmReceipt && (
          <div className="pt-3 border-t border-slate-100 animate-in fade-in">
            <label className="font-bold text-slate-700 block mb-2">Thermal Paper Roll Width</label>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`p-3 rounded-xl border text-center font-bold transition ${
                  paperWidth === '80mm'
                    ? 'border-amber-500 bg-amber-50/50 text-slate-900 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="text-sm">80mm Standard Thermal</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Most common POS receipt printer</div>
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`p-3 rounded-xl border text-center font-bold transition ${
                  paperWidth === '58mm'
                    ? 'border-amber-500 bg-amber-50/50 text-slate-900 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="text-sm">58mm Compact Thermal</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Handheld bluetooth/mobile printer</div>
              </button>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
            <input
              type="checkbox"
              checked={printDuplicate}
              onChange={(e) => setPrintDuplicate(e.target.checked)}
              className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
            />
            <span>Print Duplicate Customer Invoice / Receipt Automatically</span>
          </label>
        </div>

        {/* Test Print Section */}
        <div className="pt-3 border-t border-slate-100">
          <label className="font-bold text-slate-700 block mb-2">Hardware Test Diagnostic Prints</label>
          <div className="flex flex-wrap items-center gap-3">
            {/* Print A4 Invoice Test Page - Primary Default */}
            <button
              type="button"
              onClick={() => handleTestPrint('A4')}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg flex items-center gap-2 shadow transition"
            >
              <FileText className="w-4 h-4 text-slate-950" />
              <span>Print A4 Invoice Test Page (Default)</span>
            </button>

            {/* Print 80mm Test Receipt - Disabled by Default */}
            <button
              type="button"
              disabled={!enableThermal80mmReceipt}
              onClick={() => {
                if (!enableThermal80mmReceipt) return;
                handleTestPrint('THERMAL');
              }}
              className={`px-4 py-2.5 font-bold rounded-lg flex items-center gap-2 transition ${
                enableThermal80mmReceipt
                  ? 'bg-slate-900 hover:bg-slate-800 text-white shadow'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
              }`}
              title={
                enableThermal80mmReceipt
                  ? 'Print 80mm Test Receipt'
                  : '80mm receipt printing is disabled. Check "Enable 80mm Thermal Receipt Printing" to enable.'
              }
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print 80mm Test Receipt {!enableThermal80mmReceipt ? '(Disabled)' : ''}</span>
            </button>
          </div>
          {!enableThermal80mmReceipt && (
            <p className="text-[11px] text-slate-400 mt-2">
              Note: Print 80mm Test Receipt is currently disabled. Print A4 Invoice is the active default.
            </p>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg shadow transition"
          >
            Save Printer Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
