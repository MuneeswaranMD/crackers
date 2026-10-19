'use client';

import React, { useState, useEffect } from 'react';
import { History, Search, ShieldAlert, Download, Clock } from 'lucide-react';
import { db } from '@/lib/db';
import { AuditLog } from '@/types';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');

  const loadData = () => {
    db.initDefaults();
    setLogs(db.getAuditLogs());
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.entityName.toLowerCase().includes(search.toLowerCase()) ||
      (l.user && l.user.toLowerCase().includes(search.toLowerCase()))
  );

  const exportCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Entity', 'Entity ID'];
    const rows = filtered.map((l) => [
      new Date(l.createdAt).toLocaleString('en-IN'),
      `"${l.user}"`,
      `"${l.action}"`,
      l.entityName,
      l.entityId || '',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `security_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600" />
            <span>Security & Compliance Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-500">
            Immutable log of sensitive operations: invoice completions, credit notes, stock write-offs, and configuration edits.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition"
        >
          <Download className="w-4 h-4 text-slate-600" />
          <span>Export Audit Log</span>
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
            placeholder="Search audit actions, user, or entity..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Mobile Logs View */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
            No audit records found.
          </div>
        ) : (
          filtered.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-extrabold text-slate-900">{log.user}</span>
                <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                  {log.entityName}
                </span>
              </div>
              <div className="text-slate-800 font-medium">{log.action}</div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                <span>{new Date(log.createdAt).toLocaleString('en-IN')}</span>
                {log.entityId && <span className="font-mono">ID: {log.entityId}</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Logs Table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Responsible User</th>
                <th className="p-3">Action Description</th>
                <th className="p-3">Module Entity</th>
                <th className="p-3 font-mono">Reference ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 font-semibold text-slate-800">{log.user}</td>
                  <td className="p-3 font-medium text-slate-900">{log.action}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                      {log.entityName}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-400 text-[11px]">{log.entityId || '-'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No audit records found.
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
