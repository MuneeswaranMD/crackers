'use client';

import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Database,
  Wifi,
  HardDrive,
  Trash2,
} from 'lucide-react';
import { db } from '@/lib/db';
import { SyncOperation } from '@/types';

export default function SyncPage() {
  const [queue, setQueue] = useState<SyncOperation[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadQueue = () => {
    db.initDefaults();
    setQueue(db.getSyncQueue());
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleExportBackup = () => {
    const jsonStr = db.exportCompleteDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crackers_pos_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusMsg({ type: 'success', text: 'Database backup JSON exported successfully!' });
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = db.importDatabaseJSON(content);
      if (success) {
        setStatusMsg({ type: 'success', text: 'Database backup imported and restored successfully!' });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setStatusMsg({ type: 'error', text: 'Invalid backup file format. Restoration failed.' });
      }
    };
    reader.readAsText(file);
  };

  const handleTriggerSync = async () => {
    setSyncing(true);
    setStatusMsg(null);

    try {
      const sales = db.getSales();
      const orders = db.getExternalOrders();

      const res = await fetch('/api/sync/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sales, orders }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        db.clearSyncQueue();
        setQueue([]);
        setStatusMsg({
          type: 'success',
          text: data.message || 'All sales and orders successfully synchronized to Supabase Cloud PostgreSQL!',
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: data.error || 'Failed to synchronize with Supabase Cloud.',
        });
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Network error while syncing to Supabase.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleClearQueue = () => {
    if (confirm('Clear pending sync queue?')) {
      db.clearSyncQueue();
      setQueue([]);
      setStatusMsg({ type: 'success', text: 'Sync queue cleared.' });
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Cloud className="w-5 h-5 text-amber-600" />
          <span>Offline Database Synchronization & Backups</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Durable offline transaction queue, cloud PostgreSQL replication, conflict resolution, and full database JSON snapshot recovery.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Two action cards: Backup & Cloud Sync */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Local Disaster Recovery Backup Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <HardDrive className="w-4 h-4 text-amber-600" />
              <span>Full Local Database Disaster Recovery</span>
            </div>
            <p className="text-slate-500 mt-1 leading-relaxed">
              Export an encrypted, comprehensive snapshot of products, categories, historical invoices, and stock movements.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
            <button
              onClick={handleExportBackup}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center gap-1.5 shadow"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Export Database Backup (.JSON)</span>
            </button>

            <label className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-4 h-4 text-slate-600" />
              <span>Restore from Backup</span>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>
        </div>

        {/* Cloud Synchronization Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Wifi className="w-4 h-4 text-emerald-600" />
                <span>Supabase Cloud Master Sync</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 font-mono font-bold text-[10px] text-slate-700">
                {queue.length} Pending
              </span>
            </div>
            <p className="text-slate-500 mt-1 leading-relaxed">
              When network connectivity is restored after offline billing, queue operations are processed with duplicate-prevention idempotency tokens.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
            <button
              onClick={handleTriggerSync}
              disabled={syncing || queue.length === 0}
              className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black rounded-lg flex items-center justify-center gap-1.5 shadow transition"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Synchronizing Transactions...' : 'Sync Pending Queue Now'}</span>
            </button>
            {queue.length > 0 && (
              <button
                onClick={handleClearQueue}
                className="p-2 border border-slate-300 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg"
                title="Clear Queue"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sync Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="px-5 py-3 border-b border-slate-100 font-bold text-slate-800 flex items-center justify-between">
          <span>Pending Synchronization Queue ({queue.length})</span>
          <span className="text-[11px] text-slate-400 font-normal">
            Transactions committed locally in durable storage
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Queued Time</th>
                <th className="p-3">Operation Type</th>
                <th className="p-3 font-mono">Idempotency Token</th>
                <th className="p-3 text-center">Cloud Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queue.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 text-slate-500">{new Date(item.createdAt).toLocaleTimeString('en-IN')}</td>
                  <td className="p-3 font-bold text-slate-800">{item.operationType}</td>
                  <td className="p-3 font-mono text-slate-500 text-[11px]">{item.idempotencyKey}</td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                    <p className="font-semibold text-slate-700">All local transactions are synchronized!</p>
                    <p className="text-[11px] text-slate-400">Offline queue is currently empty.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
