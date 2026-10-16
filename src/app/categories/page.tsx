'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2, X, Sparkles } from 'lucide-react';
import { db } from '@/lib/db';
import { Category, Product } from '@/types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [tamilName, setTamilName] = useState('');
  const [description, setDescription] = useState('');

  const loadData = () => {
    db.initDefaults();
    setCategories(db.getCategories());
    setProducts(db.getProducts());
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAdd = () => {
    setEditingCategory(null);
    setName('');
    setTamilName('');
    setDescription('');
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setTamilName(cat.tamilName || '');
    setDescription(cat.description || '');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const catObj: Category = {
      id: editingCategory ? editingCategory.id : `cat-${Date.now()}`,
      shopId: 'shop-sivakasi-01',
      name: name.trim(),
      tamilName: tamilName.trim() || undefined,
      description: description.trim() || undefined,
      displayOrder: editingCategory ? editingCategory.displayOrder : categories.length + 1,
      isActive: true,
    };

    db.saveCategory(catObj);
    loadData();
    setModalOpen(false);
  };

  const handleDelete = (id: string, catName: string) => {
    if (confirm(`Delete category "${catName}"?`)) {
      db.deleteCategory(id);
      loadData();
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-600" />
            <span>Fireworks Categories</span>
          </h2>
          <p className="text-xs text-slate-500">
            Organize crackers into bilingual English & Tamil product classifications.
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const count = products.filter((p) => p.categoryId === cat.id).length;
          return (
            <div
              key={cat.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Order: #{cat.displayOrder}</span>
                  <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    {count} Products
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{cat.name}</h3>
                {cat.tamilName && (
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    {cat.tamilName}
                  </div>
                )}
                {cat.description && (
                  <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">
                    {cat.description}
                  </p>
                )}
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => openEdit(cat)}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-amber-400 text-sm">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </span>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sparklers"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tamil Translation (தமிழ் பெயர்)</label>
                <input
                  type="text"
                  value={tamilName}
                  onChange={(e) => setTamilName(e.target.value)}
                  placeholder="e.g. கம்ப மத்தாப்பு"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
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
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
