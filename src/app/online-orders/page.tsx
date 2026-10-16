'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Globe,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Settings,
  Layers,
  FileText,
  Copy,
  Check,
  Eye,
  X,
  Truck,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Package,
  AlertCircle,
  HelpCircle,
  Save,
  Flame,
} from 'lucide-react';
import { db } from '@/lib/db';
import {
  ExternalOrder,
  ExternalProductMapping,
  Integration,
  IntegrationSyncLog,
  WebhookEvent,
  Product,
  Shop,
} from '@/types';
import { formatINR } from '@/lib/calculations';

export default function OnlineOrdersPage() {
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'MAPPINGS' | 'SETTINGS' | 'LOGS'>('ORDERS');
  const [orders, setOrders] = useState<ExternalOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [mappings, setMappings] = useState<ExternalProductMapping[]>([]);
  const [integration, setIntegration] = useState<Integration>(db.getIntegration());
  const [syncLogs, setSyncLogs] = useState<IntegrationSyncLog[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [shop, setShop] = useState<Shop>(db.getShop());

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Order Modal
  const [selectedOrder, setSelectedOrder] = useState<ExternalOrder | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Settings Form
  const [storeUrl, setStoreUrl] = useState(integration.storeUrl || '');
  const [consumerKey, setConsumerKey] = useState(integration.consumerKey || '');
  const [consumerSecret, setConsumerSecret] = useState(integration.consumerSecret || '');
  const [webhookSecret, setWebhookSecret] = useState(integration.webhookSecret || '');
  const [autoDeductStock, setAutoDeductStock] = useState(integration.settings.autoDeductStock);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);

  // Mapping Edit State
  const [mappingModal, setMappingModal] = useState<{
    externalProductId: string;
    externalName: string;
    externalSku?: string;
  } | null>(null);
  const [selectedLocalProdId, setSelectedLocalProdId] = useState('');

  const loadData = async () => {
    db.initDefaults();
    setProducts(db.getProducts());
    setMappings(db.getProductMappings());
    setIntegration(db.getIntegration());
    setSyncLogs(db.getSyncLogs());
    setWebhookEvents(db.getWebhookEvents());
    setShop(db.getShop());

    try {
      const [ordersRes, prodsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/products'),
      ]);
      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        if (oData.success && Array.isArray(oData.data)) {
          setOrders(oData.data);
        } else {
          setOrders(db.getExternalOrders());
        }
      } else {
        setOrders(db.getExternalOrders());
      }
      if (prodsRes.ok) {
        const pData = await prodsRes.json();
        if (pData.success && Array.isArray(pData.data) && pData.data.length > 0) {
          setProducts(pData.data);
        }
      }
    } catch {
      setOrders(db.getExternalOrders());
    }
  };

  useEffect(() => {
    loadData();
    const unsub = db.onShopChange((s) => setShop(s));
    return () => unsub();
  }, []);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/integrations/woocommerce/webhook`
    : 'https://your-domain.com/api/integrations/woocommerce/webhook';

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhookUrl(true);
    setTimeout(() => setCopiedWebhookUrl(false), 2000);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/integrations/woocommerce/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncFeedback({ success: true, message: data.message });
      } else {
        setSyncFeedback({
          success: false,
          message: data.message || 'Synchronization failed. Please check credentials in Settings.',
        });
      }
    } catch (err: any) {
      setSyncFeedback({ success: false, message: err.message || 'Network error triggering sync' });
    } finally {
      setSyncing(false);
      loadData();
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/integrations/woocommerce/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeUrl, consumerKey, consumerSecret }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed.' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Integration = {
      ...integration,
      storeUrl: storeUrl.trim(),
      consumerKey: consumerKey.trim(),
      consumerSecret: consumerSecret.trim(),
      webhookSecret: webhookSecret.trim(),
      settings: {
        ...integration.settings,
        autoDeductStock,
      },
      updatedAt: new Date().toISOString(),
    };
    db.updateIntegration(updated);
    setIntegration(updated);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const handleGenerateInvoice = (order: ExternalOrder) => {
    const res = db.convertAndInvoiceExternalOrder(order.id, 'Counter Staff');
    if (res.success) {
      loadData();
      if (res.saleId) {
        const createdSale = db.getSaleById(res.saleId);
        if (createdSale) {
          fetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createdSale),
          }).catch((err) => console.warn('[Supabase Sync Warning]:', err));
        }
      }
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(db.getExternalOrderById(order.id) || null);
      }
      alert(`POS Invoice ${res.invoiceNumber} successfully created and recorded in Supabase!`);
    } else {
      alert(`Error creating invoice: ${res.error}`);
    }
  };

  const handleSaveMapping = () => {
    if (!mappingModal || !selectedLocalProdId) return;
    const localProd = products.find((p) => p.id === selectedLocalProdId);
    if (!localProd) return;

    const mapping: ExternalProductMapping = {
      id: `map-${mappingModal.externalProductId}`,
      integrationId: integration.id,
      shopId: shop.id,
      externalProductId: mappingModal.externalProductId,
      externalVariationId: '0',
      externalSku: mappingModal.externalSku,
      externalName: mappingModal.externalName,
      localProductId: localProd.id,
      localProduct: localProd,
      mappingStatus: 'MAPPED',
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    db.saveProductMapping(mapping);

    // Update existing orders with this mapped item
    const currentOrders = db.getExternalOrders();
    for (const ord of currentOrders) {
      if (ord.items) {
        let orderChanged = false;
        for (const item of ord.items) {
          if (item.externalProductId === mappingModal.externalProductId) {
            item.localProductId = localProd.id;
            item.localProduct = localProd;
            item.mappingStatus = 'MATCHED';
            orderChanged = true;
          }
        }
        if (orderChanged) {
          const allMatched = ord.items.every((i) => i.mappingStatus === 'MATCHED');
          ord.syncStatus = allMatched ? 'IMPORTED' : 'MAPPING_PENDING';
          db.saveExternalOrder(ord);
        }
      }
    }

    setMappingModal(null);
    setSelectedLocalProdId('');
    loadData();
  };

  // Filtered orders list
  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNum = o.orderNumber.toLowerCase().includes(q);
      const matchCust = o.customerName?.toLowerCase().includes(q);
      const matchPhone = o.customerPhone?.includes(q);
      if (!matchNum && !matchCust && !matchPhone) return false;
    }
    return true;
  });

  const processingCount = orders.filter((o) => o.status === 'processing').length;
  const invoicedCount = orders.filter((o) => o.syncStatus === 'INVOICED').length;
  const unmappedCount = orders.filter((o) => o.syncStatus === 'MAPPING_PENDING').length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white rounded-2xl p-5 shadow-lg border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Globe className="w-5 h-5 animate-pulse" />
            </span>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>WooCommerce Online Orders Hub</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Averqon Retail Engine
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Real-time ecommerce order synchronization, Sivakasi fireworks product mapping, and idempotent POS invoice generation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs font-bold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Store: {integration.healthStatus}</span>
          </div>

          {/* Sync Now Button */}
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing Orders...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between font-bold ${
            syncFeedback.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {syncFeedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{syncFeedback.message}</span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 text-xs font-bold shadow-sm">
        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`py-3.5 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'ORDERS'
              ? 'border-amber-500 text-slate-950 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Orders Register ({orders.length})</span>
          {processingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
              {processingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('MAPPINGS')}
          className={`py-3.5 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'MAPPINGS'
              ? 'border-amber-500 text-slate-950 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Product SKU Mappings ({mappings.length})</span>
          {unmappedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
              {unmappedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('SETTINGS')}
          className={`py-3.5 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'SETTINGS'
              ? 'border-amber-500 text-slate-950 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>WooCommerce Settings & Webhooks</span>
        </button>

        <button
          onClick={() => setActiveTab('LOGS')}
          className={`py-3.5 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'LOGS'
              ? 'border-amber-500 text-slate-950 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Sync & Webhook Audit Logs</span>
        </button>
      </div>

      {/* TAB 1: ORDERS REGISTER */}
      {activeTab === 'ORDERS' && (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-slate-400 font-bold text-[10px] uppercase">Total Online Orders</div>
              <div className="text-xl font-black text-slate-900 mt-1">{orders.length}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">WooCommerce store total</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm">
              <div className="text-amber-700 font-bold text-[10px] uppercase">Processing (Dispatch)</div>
              <div className="text-xl font-black text-amber-700 mt-1">{processingCount}</div>
              <div className="text-[10px] text-amber-600 mt-0.5">Paid online orders awaiting fulfillment</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
              <div className="text-emerald-700 font-bold text-[10px] uppercase">Invoiced to POS</div>
              <div className="text-xl font-black text-emerald-700 mt-1">{invoicedCount}</div>
              <div className="text-[10px] text-emerald-600 mt-0.5">GST Tax invoices generated</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm">
              <div className="text-rose-700 font-bold text-[10px] uppercase">Needs Mapping</div>
              <div className="text-xl font-black text-rose-700 mt-1">{unmappedCount}</div>
              <div className="text-[10px] text-rose-600 mt-0.5">Pending local SKU association</div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs">
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {['all', 'processing', 'completed', 'pending', 'cancelled'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg capitalize font-bold transition ${
                    statusFilter === st
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Order #, Customer, Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4 text-right">Total (₹)</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">POS Invoice Link</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No online orders found matching current criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => {
                      const isProcessing = ord.status === 'processing';
                      const isInvoiced = ord.syncStatus === 'INVOICED';
                      const needsMapping = ord.syncStatus === 'MAPPING_PENDING';

                      return (
                        <tr key={ord.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                              <span>#{ord.orderNumber}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">
                                WC
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                ord.status === 'completed'
                                  ? 'text-emerald-600'
                                  : ord.status === 'processing'
                                  ? 'text-amber-600'
                                  : ord.status === 'cancelled'
                                  ? 'text-rose-600'
                                  : 'text-slate-500'
                              }`}
                            >
                              {ord.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            <div>{new Date(ord.externalCreatedAt).toLocaleDateString('en-IN')}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(ord.externalCreatedAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{ord.customerName}</div>
                            <div className="text-[10px] text-slate-500">
                              {ord.shippingAddress?.city || ord.billingAddress?.city || 'Tamil Nadu'}, {ord.shippingAddress?.state || ord.billingAddress?.state || 'TN'} • {ord.customerPhone || 'No Phone'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-semibold">
                            <div>{ord.items?.length || 0} product(s)</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {ord.items?.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            ₹{ord.totalAmount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ord.isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {ord.isPaid ? 'PAID' : 'PENDING'}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[110px]">
                              {ord.paymentMethodTitle || ord.paymentMethod}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isInvoiced ? (
                              <Link
                                href="/sales"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold hover:bg-emerald-100 transition"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Invoiced</span>
                                <ExternalLink className="w-3 h-3 text-emerald-600" />
                              </Link>
                            ) : needsMapping ? (
                              <button
                                onClick={() => setActiveTab('MAPPINGS')}
                                className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold hover:bg-rose-100 flex items-center gap-1"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Map SKUs</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleGenerateInvoice(ord)}
                                className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-sm transition flex items-center gap-1"
                              >
                                <Flame className="w-3.5 h-3.5" />
                                <span>Generate Invoice</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setSelectedOrder(ord)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                              title="View Full Order Details"
                            >
                              <Eye className="w-4 h-4 text-amber-600" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT MAPPINGS */}
      {activeTab === 'MAPPINGS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 text-xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>WooCommerce to Local Sivakasi Cracker Catalog Mappings</span>
            </h2>
            <p className="text-slate-500 mt-1">
              Associate online product line items and variation IDs with verified local inventory items to guarantee automated stock deduction and correct GST tax invoices.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Online Item Name</th>
                  <th className="py-2.5 px-4">External SKU</th>
                  <th className="py-2.5 px-4">Associated Local Product</th>
                  <th className="py-2.5 px-4">Local Stock</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Extract unique line items from orders */}
                {Array.from(
                  new Set(
                    orders.flatMap((o) => o.items || []).map((i) => i.externalProductId)
                  )
                ).map((extProdId) => {
                  const sampleItem = orders
                    .flatMap((o) => o.items || [])
                    .find((i) => i.externalProductId === extProdId)!;
                  const mapping = mappings.find((m) => m.externalProductId === extProdId);
                  const localProd = mapping?.localProductId
                    ? products.find((p) => p.id === mapping.localProductId)
                    : sampleItem.localProduct;

                  const isMapped = Boolean(localProd);

                  return (
                    <tr key={extProdId} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {sampleItem.name}
                        <div className="text-[10px] text-slate-400 font-mono">
                          WooCommerce ID: {extProdId}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-700">
                        {sampleItem.sku || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        {localProd ? (
                          <div>
                            <div className="font-bold text-slate-900">{localProd.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              SKU: {localProd.sku} • HSN: {localProd.hsnCode}
                            </div>
                          </div>
                        ) : (
                          <span className="text-rose-600 font-semibold italic">
                            Unmapped — Manual Assignment Required
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-slate-800">
                        {localProd ? `${localProd.currentStock} ${localProd.uom}` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isMapped
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isMapped ? 'MAPPED' : 'ACTION REQUIRED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setMappingModal({
                              externalProductId: extProdId,
                              externalName: sampleItem.name,
                              externalSku: sampleItem.sku,
                            });
                            setSelectedLocalProdId(localProd?.id || products[0]?.id || '');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                        >
                          {isMapped ? 'Change Mapping' : 'Assign Product'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WOOCOMMERCE SETTINGS & WEBHOOKS */}
      {activeTab === 'SETTINGS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6 text-xs max-w-4xl mx-auto">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-600" />
              <span>WooCommerce REST API & Webhook Credentials</span>
            </h2>
            <p className="text-slate-500 mt-1">
              Connect your online Sivakasi fireworks storefront. Secrets are stored securely and never transmitted in public responses.
            </p>
          </div>

          {settingsSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Integration settings saved successfully!</span>
            </div>
          )}

          {testResult && (
            <div
              className={`p-3.5 rounded-xl border font-bold flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div>{testResult.message}</div>
                {testResult.success && (
                  <div className="text-[11px] font-normal mt-0.5">
                    Store connection is healthy and ready for live order processing.
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            {/* Store URL */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">WooCommerce Store URL *</label>
              <input
                type="url"
                required
                placeholder="https://crackers.sreekalieswaritraders.com"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                HTTPS is mandatory in production for secure transmission of cracker invoices and payments.
              </span>
            </div>

            {/* Consumer Key & Secret */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Consumer Key (ck_...) *</label>
                <input
                  type="text"
                  placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Consumer Secret (cs_...) *</label>
                <input
                  type="password"
                  placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Webhook Configuration Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>Inbound Webhook Delivery URL</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  HMAC-SHA256 Protected
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Configure this URL in your WordPress / WooCommerce Settings &gt; Advanced &gt; Webhooks for topics: <code>order.created</code>, <code>order.updated</code>, and <code>order.deleted</code>.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-[11px] text-slate-700 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhookUrl}
                  className="px-3 py-2 bg-slate-900 text-white rounded-lg font-bold flex items-center gap-1.5 hover:bg-slate-800 transition"
                >
                  {copiedWebhookUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedWebhookUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Webhook Secret Key</label>
                <input
                  type="text"
                  placeholder="Secret key configured in WooCommerce webhook settings"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Policy Toggles */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDeductStock}
                  onChange={(e) => setAutoDeductStock(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                />
                <div>
                  <div className="font-bold text-slate-900">Auto-deduct Sivakasi fireworks stock on invoice creation</div>
                  <div className="text-[10px] text-slate-500">
                    Prevents duplicate stock deductions across physical POS and online ecommerce orders.
                  </div>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection || !storeUrl}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Integration Settings</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: SYNC & WEBHOOK LOGS */}
      {activeTab === 'LOGS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          {/* Webhook Events */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Inbound Webhook Events Audit</span>
            </h3>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {webhookEvents.length === 0 ? (
                <div className="py-8 text-center text-slate-400">No webhook events received yet.</div>
              ) : (
                webhookEvents.map((ev) => (
                  <div key={ev.id} className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 font-mono">{ev.topic}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(ev.createdAt).toLocaleTimeString('en-IN')}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between">
                      <span>Delivery ID: {ev.deliveryId}</span>
                      <span
                        className={`font-bold ${
                          ev.status === 'PROCESSED'
                            ? 'text-emerald-600'
                            : ev.status === 'FAILED'
                            ? 'text-rose-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sync Logs */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <RefreshCw className="w-4 h-4 text-amber-600" />
              <span>REST API Polling & Sync History</span>
            </h3>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {syncLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-400">No sync operations executed yet.</div>
              ) : (
                syncLogs.map((log) => (
                  <div key={log.id} className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{log.syncType} Sync</span>
                      <span
                        className={`font-bold text-[10px] ${
                          log.status === 'SUCCESS' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between">
                      <span>
                        Fetched: {log.itemsFetched} • Synced: {log.itemsSynced} • Duration: {log.durationMs}ms
                      </span>
                      <span>{new Date(log.startedAt).toLocaleTimeString('en-IN')}</span>
                    </div>
                    {log.errorDetails?.message && (
                      <div className="text-[10px] text-rose-600 italic">
                        {log.errorDetails.message}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ORDER DETAILS VIEW */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 text-xs max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm">
                  WooCommerce Order #{selectedOrder.orderNumber}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black">
                  {selectedOrder.status.toUpperCase()}
                </span>
                
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Customer & Shipping Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <User className="w-3.5 h-3.5 text-amber-600" />
                    <span>Customer & Billing Information</span>
                  </div>
                  <div className="font-bold text-slate-900">{selectedOrder.customerName}</div>
                  <div className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{selectedOrder.customerPhone || 'N/A'}</span>
                  </div>
                  <div className="text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{selectedOrder.customerEmail || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <Truck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Tamil Nadu Delivery Address</span>
                  </div>
                  <div className="text-slate-700 font-medium">
                    {selectedOrder.shippingAddress?.address1 || selectedOrder.billingAddress?.address1 || 'Customer Address'}
                    {selectedOrder.shippingAddress?.address2 ? `, ${selectedOrder.shippingAddress.address2}` : ''}
                  </div>
                  <div className="text-slate-700 font-bold">
                    {selectedOrder.shippingAddress?.city || selectedOrder.billingAddress?.city || 'Sivakasi'}, {selectedOrder.shippingAddress?.state || selectedOrder.billingAddress?.state || 'Tamil Nadu'} {selectedOrder.shippingAddress?.postcode ? `- ${selectedOrder.shippingAddress.postcode}` : ''}
                  </div>
                  <div className="text-slate-500 text-[10px]">
                    Payment: <strong>{selectedOrder.paymentMethodTitle || selectedOrder.paymentMethod}</strong> (
                    {selectedOrder.isPaid ? 'Settled Online' : 'Pending'})
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-2">Order Line Items</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Item & SKU</th>
                        <th className="py-2.5 px-3">Local Product Match</th>
                        <th className="py-2.5 px-3 text-right">Price</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{item.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              SKU: {item.sku || 'N/A'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {item.localProduct ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{item.localProduct.name}</span>
                              </span>
                            ) : (
                              <span className="text-rose-600 font-bold">Unmapped</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">₹{item.unitPrice.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right font-black">₹{item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-black border-t border-slate-200">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-right text-slate-600">
                          Grand Total:
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-950 text-sm">
                          ₹{selectedOrder.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold hover:bg-slate-100"
              >
                Close
              </button>

              {selectedOrder.localInvoiceId ? (
                <Link
                  href="/sales"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>View POS Sales Invoice</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => handleGenerateInvoice(selectedOrder)}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Flame className="w-4 h-4" />
                  <span>Generate POS Tax Invoice</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MANUAL SKU MAPPING */}
      {mappingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 text-xs">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold">Assign Local Cracker Product</span>
              <button
                type="button"
                onClick={() => setMappingModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                  Online WooCommerce Item
                </label>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900">
                  {mappingModal.externalName}
                  <div className="text-[10px] text-amber-700 font-mono mt-0.5">
                    SKU: {mappingModal.externalSku || 'N/A'} • ID: {mappingModal.externalProductId}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Select Matching Local Cracker Item *
                </label>
                <select
                  value={selectedLocalProdId}
                  onChange={(e) => setSelectedLocalProdId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (SKU: {p.sku}) — Stock: {p.currentStock} {p.uom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMappingModal(null)}
                  className="px-3.5 py-2 border border-slate-300 rounded-xl font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMapping}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow transition"
                >
                  Confirm Mapping
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
