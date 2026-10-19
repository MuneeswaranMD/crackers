'use client';

import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  X,
  Flame,
  Barcode,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { db, getProductImageUrl } from '@/lib/db';
import { Product, Category } from '@/types';
import { formatINR } from '@/lib/calculations';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [tamilName, setTamilName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('Standard Fireworks');
  const [packSize, setPackSize] = useState('1 Box (10 Pcs)');
  const [uom, setUom] = useState('BOX');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [mrp, setMrp] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('0');
  const [currentStock, setCurrentStock] = useState('100');
  const [minStockAlert, setMinStockAlert] = useState('20');
  const [isGreenCracker, setIsGreenCracker] = useState(true);

  const loadData = async () => {
    db.initDefaults();
    setProducts(db.getProducts());
    setCategories(db.getCategories());

    try {
      const [prodsRes, catsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
      ]);
      if (prodsRes.ok) {
        const pData = await prodsRes.json();
        if (pData.success && Array.isArray(pData.data) && pData.data.length > 0) {
          setProducts(pData.data);
        }
      }
      if (catsRes.ok) {
        const cData = await catsRes.json();
        if (cData.success && Array.isArray(cData.data) && cData.data.length > 0) {
          setCategories(cData.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch products from Supabase:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setTamilName('');
    setSku(`CRK-${Date.now().toString().slice(-4)}`);
    setBarcode(`890100${Math.floor(1000 + Math.random() * 9000)}`);
    setCategoryId(categories[0]?.id || '');
    setBrand('Standard Fireworks');
    setPackSize('1 Box (10 Pcs)');
    setUom('BOX');
    setPurchasePrice('50');
    setMrp('250');
    setSellingPrice('75');
    setCurrentStock('100');
    setMinStockAlert('20');
    setIsGreenCracker(true);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setTamilName(prod.tamilName || '');
    setSku(prod.sku);
    setBarcode(prod.barcode || '');
    setCategoryId(prod.categoryId || '');
    setBrand(prod.brand);
    setPackSize(prod.packSize);
    setUom(prod.uom);
    setPurchasePrice(prod.purchasePrice.toString());
    setMrp(prod.mrp.toString());
    setSellingPrice(prod.sellingPrice.toString());
    setCurrentStock(prod.currentStock.toString());
    setMinStockAlert(prod.minStockAlert.toString());
    setIsGreenCracker(prod.isGreenCracker);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim() || !sku.trim()) {
      setErrorMsg('Product name and SKU are required.');
      return;
    }

    // Check duplicate SKU if new
    const existing = products.find(
      (p) => p.sku.toLowerCase() === sku.toLowerCase() && p.id !== editingProduct?.id
    );
    if (existing) {
      setErrorMsg(`SKU "${sku}" is already assigned to "${existing.name}". Please use a unique SKU.`);
      return;
    }

    const cat = categories.find((c) => c.id === categoryId);

    const productObj: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      shopId: 'shop-sivakasi-01',
      categoryId,
      categoryName: cat?.name || 'Assorted Fireworks',
      sku: sku.trim(),
      barcode: barcode.trim(),
      name: name.trim(),
      tamilName: tamilName.trim() || undefined,
      brand: brand.trim(),
      packSize: packSize.trim(),
      uom,
      purchasePrice: parseFloat(purchasePrice) || 0,
      mrp: parseFloat(mrp) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
      discountAllowed: true,
      maxDiscountPct: 75,
      currentStock: parseInt(currentStock) || 0,
      minStockAlert: parseInt(minStockAlert) || 10,
      isGreenCracker,
      pesoCertified: true,
      isActive: true,
      hsnCode: '3604',
    };

    db.saveProduct(productObj);
    loadData();
    setModalOpen(false);
  };

  const handleDeleteProduct = (id: string, prodName: string) => {
    if (confirm(`Are you sure you want to delete "${prodName}"?`)) {
      db.deleteProduct(id);
      loadData();
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const parseCSVLine = (line: string) => {
        const result: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (c === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += c;
          }
        }
        result.push(cur.trim());
        return result;
      };

      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length < 2) return;

      const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
      let count = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols.length < 2) continue;

        let sku = '';
        let name = '';
        let mrp = 0;
        let sellingPrice = 0;
        let packSize = '1 Box';
        let categoryName = 'Crackers';

        const skuIdx = header.findIndex((h) => h.includes('sku') || h.includes('serial'));
        const nameIdx = header.findIndex((h) => h.includes('name'));
        const mrpIdx = header.findIndex((h) => h.includes('mrp') || h.includes('market'));
        const priceIdx = header.findIndex((h) => h.includes('selling') || h.includes('net') || h.includes('price'));
        const catIdx = header.findIndex((h) => h.includes('cat'));
        const packIdx = header.findIndex((h) => h.includes('pack') || h.includes('unit'));

        if (nameIdx >= 0 && cols[nameIdx]) {
          name = cols[nameIdx].replace(/^"|"$/g, '');
        }
        if (skuIdx >= 0 && cols[skuIdx]) {
          sku = cols[skuIdx].replace(/^"|"$/g, '');
          if (!sku.startsWith('AF-') && /^\d+$/.test(sku)) {
            sku = `AF-${sku.padStart(3, '0')}`;
          }
        } else {
          sku = `AF-${String(Date.now() + i).slice(-4)}`;
        }

        if (mrpIdx >= 0) mrp = parseFloat(cols[mrpIdx]) || 0;
        if (priceIdx >= 0) sellingPrice = parseFloat(cols[priceIdx]) || mrp;
        if (catIdx >= 0 && cols[catIdx]) categoryName = cols[catIdx].replace(/^"|"$/g, '');
        if (packIdx >= 0 && cols[packIdx]) packSize = cols[packIdx].replace(/^"|"$/g, '');

        if (!name) continue;

        const existing = products.find((p) => p.sku === sku || p.name.toLowerCase() === name.toLowerCase());
        const prodObj: Product = {
          id: existing ? existing.id : `prod-imp-${Date.now()}-${i}`,
          shopId: '11111111-1111-1111-1111-111111111111',
          categoryId: existing?.categoryId || '',
          categoryName,
          sku,
          barcode: sku.replace(/\D/g, '') || '',
          name,
          brand: existing?.brand || 'Agana Fireworks',
          packSize,
          uom: packSize.toLowerCase().includes('pkt') ? 'PKT' : 'BOX',
          purchasePrice: Math.round(sellingPrice * 0.7),
          mrp,
          sellingPrice,
          discountAllowed: mrp > sellingPrice,
          maxDiscountPct: mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0,
          currentStock: existing?.currentStock || 100,
          minStockAlert: 10,
          isGreenCracker: true,
          pesoCertified: true,
          isActive: true,
        };

        db.saveProduct(prodObj);
        count++;
      }

      loadData();
      alert(`Successfully imported / updated ${count} products from CSV!`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const exportCSV = () => {
    const headers = [
      'SKU',
      'Barcode',
      'Name',
      'Tamil Name',
      'Brand',
      'Category',
      'Pack Size',
      'Purchase Cost',
      'MRP',
      'Selling Price',
      'Current Stock',
      'Min Alert',
    ];
    const rows = products.map((p) => [
      p.sku,
      p.barcode,
      `"${p.name}"`,
      `"${p.tamilName || ''}"`,
      p.brand,
      `"${p.categoryName || ''}"`,
      `"${p.packSize}"`,
      p.purchasePrice,
      p.mrp,
      p.sellingPrice,
      p.currentStock,
      p.minStockAlert,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `crackers_catalog_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filteredProducts = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    return products.filter((p) => {
      const matchesCat = selectedCat === 'ALL' || p.categoryId === selectedCat;
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.tamilName && p.tamilName.toLowerCase().includes(q)) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        p.brand.toLowerCase().includes(q);

      let matchesStock = true;
      if (stockFilter === 'low') matchesStock = p.currentStock <= p.minStockAlert && p.currentStock > 0;
      if (stockFilter === 'out') matchesStock = p.currentStock <= 0;

      return matchesCat && matchesSearch && matchesStock;
    });
  }, [products, selectedCat, deferredSearch, stockFilter]);

  // Reset to page 1 whenever filters or search query change
  useEffect(() => {
    setPage(1);
  }, [deferredSearch, selectedCat, stockFilter]);

  const totalPages = Math.ceil(filteredProducts.length / (pageSize === -1 ? filteredProducts.length || 1 : pageSize)) || 1;
  const paginatedProducts = useMemo(() => {
    if (pageSize === -1) return filteredProducts;
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            <span>Fireworks Products & Catalogue</span>
          </h2>
          <p className="text-xs text-slate-500">
            Manage Sivakasi firecracker products, pack sizes, MRP, discounted prices, and PESO certifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportCSV}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition"
            title="Import or update prices from CSV"
          >
            <Upload className="w-4 h-4 text-slate-600" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Cracker</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, தமிழ், SKU, brand..."
            className="w-full pl-9 pr-9 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          {search !== deferredSearch ? (
            <Loader2 className="w-4 h-4 absolute right-3 top-2 text-amber-500 animate-spin" />
          ) : search ? (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
          {/* Category Dropdown */}
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Categories ({products.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 font-semibold">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-2.5 py-1 rounded transition ${
                stockFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Stock
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-2.5 py-1 rounded transition ${
                stockFilter === 'low' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-2.5 py-1 rounded transition ${
                stockFilter === 'out' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Out of Stock
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Cracker Item</th>
                <th className="px-4 py-3">SKU / Barcode</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Pack & Brand</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">MRP</th>
                <th className="px-4 py-3 text-right">Selling Price</th>
                <th className="px-4 py-3 text-center">Stock</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.map((p) => {
                const isLow = p.currentStock <= p.minStockAlert;
                const isOut = p.currentStock <= 0;
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.imageUrl || getProductImageUrl(p)}
                          alt={p.name}
                          className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-50"
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                          {p.tamilName && (
                            <div className="text-[11px] text-slate-500">{p.tamilName}</div>
                          )}
                          {p.isGreenCracker && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Green Cracker (PESO)</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      <div>{p.sku}</div>
                      {p.barcode && <div className="text-[10px] text-slate-400">{p.barcode}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.categoryName || 'General'}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{p.packSize}</div>
                      <div className="text-[10px] text-slate-400">{p.brand}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-500">
                      ₹{p.purchasePrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 line-through">
                      ₹{p.mrp.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                      ₹{p.sellingPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          isOut
                            ? 'bg-rose-100 text-rose-700'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {p.currentStock} {p.uom}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No products found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredProducts.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span>
                Showing{' '}
                <strong className="text-slate-900">
                  {pageSize === -1 ? 1 : Math.min((page - 1) * pageSize + 1, filteredProducts.length)}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-900">
                  {pageSize === -1 ? filteredProducts.length : Math.min(page * pageSize, filteredProducts.length)}
                </strong>{' '}
                of <strong className="text-slate-900">{filteredProducts.length}</strong> products
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded px-2 py-0.5 font-bold text-slate-700 focus:outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={-1}>All</option>
                </select>
              </div>
            </div>

            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-bold text-slate-800">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-amber-400 text-sm flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>{editingProduct ? 'Edit Fireworks Item' : 'Add New Fireworks Item'}</span>
              </span>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-700 block mb-1">Product Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. 10cm Electric Sparklers"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-700 block mb-1">Tamil Name (தமிழ் பெயர்)</label>
                  <input
                    type="text"
                    value={tamilName}
                    onChange={(e) => setTamilName(e.target.value)}
                    placeholder="e.g. 10 செ.மீ எலக்ட்ரிக் மத்தாப்பு"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Barcode</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Scan or enter barcode"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Brand Manufacturer</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pack Size</label>
                  <input
                    type="text"
                    value={packSize}
                    onChange={(e) => setPackSize(e.target.value)}
                    placeholder="e.g. 1 Box (10 Pcs)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={mrp}
                    onChange={(e) => {
                      const newMrp = parseFloat(e.target.value) || 0;
                      setMrp(e.target.value);
                      // Default Sivakasi 70% seasonal discount: selling price = mrp * 0.3
                      setSellingPrice((newMrp * 0.3).toFixed(2));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-400 bg-amber-50/50 rounded-lg font-black text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Stock Levels */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Current Stock Quantity</label>
                  <input
                    type="number"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Min Low-Stock Alert</label>
                  <input
                    type="number"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Compliance Checkboxes */}
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isGreenCracker}
                    onChange={(e) => setIsGreenCracker(e.target.checked)}
                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  />
                  <span>Green Cracker (CSIR-NEERI & PESO Certified)</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg shadow transition"
                >
                  {editingProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
