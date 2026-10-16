'use client';

import React, { useState, useEffect } from 'react';
import { Printer, CheckCircle2, FileText, Sliders, Scissors, Sparkles } from 'lucide-react';
import { db } from '@/lib/db';
import { ShopSetting, Shop, Sale } from '@/types';
import { generateThermalReceiptHtml, generateA4InvoiceHtml, printHtmlViaIframe } from '@/lib/print';

export default function PrinterSettingsPage() {
  const [settings, setSettings] = useState<ShopSetting>(db.getSettings());
  const [shop, setShop] = useState<Shop>(db.getShop());
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [printDuplicate, setPrintDuplicate] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    db.initDefaults();
    const set = db.getSettings();
    setSettings(set);
    setPaperWidth(set.thermalPrinterPaperWidth);
    setPrintDuplicate(set.printDuplicateReceipt);
    setShop(db.getShop());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ShopSetting = {
      ...settings,
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
            shopId: shop.id,
            sku: 'SPK-10',
            barcode: '8901001',
            name: '10cm Electric Sparklers',
            tamilName: '10 செ.மீ எலக்ட்ரிக் மத்தாப்பு',
            brand: 'Standard Fireworks',
            packSize: '1 Box (10 Pcs)',
            uom: 'BOX',
            purchasePrice: 22,
            mrp: 120,
            sellingPrice: 36,
            discountAllowed: true,
            maxDiscountPct: 75,
            currentStock: 100,
            minStockAlert: 10,
            isGreenCracker: true,
            pesoCertified: true,
            isActive: true,
          },
          quantity: 5,
          mrp: 120,
          unitPrice: 36,
          discountPercentage: 0,
          discountAmount: 0,
          taxableValue: 180,
          cgstRate: 9,
          cgstAmount: 16.2,
          sgstRate: 9,
          sgstAmount: 16.2,
          igstRate: 0,
          igstAmount: 0,
          totalTax: 32.4,
          totalAmount: 212.4,
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
          <span>Thermal & Windows Printer Settings</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure receipt layout, roll width, ESC/POS printer paper-cut behaviors, and print diagnostics.
        </p>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Printer settings saved successfully!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-xs space-y-5">
        <div>
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

        <div className="pt-2 border-t border-slate-100 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
            <input
              type="checkbox"
              checked={printDuplicate}
              onChange={(e) => setPrintDuplicate(e.target.checked)}
              className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
            />
            <span>Print Duplicate Customer Receipt Automatically</span>
          </label>
        </div>

        {/* Test Print Section */}
        <div className="pt-3 border-t border-slate-100">
          <label className="font-bold text-slate-700 block mb-2">Hardware Test Diagnostic Prints</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleTestPrint('THERMAL')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center gap-2 shadow"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print 80mm Test Receipt</span>
            </button>
            <button
              type="button"
              onClick={() => handleTestPrint('A4')}
              className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-lg flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Print A4 Invoice Test Page</span>
            </button>
          </div>
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
