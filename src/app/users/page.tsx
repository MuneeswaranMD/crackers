'use client';

import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Key, Lock, Check, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const ROLES_INFO = [
  {
    role: 'OWNER_ADMIN',
    title: 'Owner / Store Administrator',
    description: 'Full unrestricted access to POS billing, sales history, inventory modifications, purchase orders, financial reports, shop legal settings, and user permissions.',
    permissions: [
      'POS Fast Retail Billing',
      'Refunds and Credit Notes',
      'Inventory Restock and Adjustments',
      'Purchase Orders and Supplier Payables',
      'GSTR-1 Tax Reports and COGS Margins',
      'Shop Configuration and License Settings',
      'Backup Export and Sync Reset',
    ],
  },
  {
    role: 'CASHIER',
    title: 'Retail Billing Cashier',
    description: 'Permitted to operate the POS screen, scan barcodes, collect Cash/UPI/Card payments, print 80mm/A4 invoices, and look up recent sales.',
    permissions: [
      'POS Fast Retail Billing',
      'Hold and Recall Bills',
      'Collect Payments & Print Receipts',
      'Look up Past Invoices',
      'No Inventory Cost Access',
      'No Tax/Financial Reports Access',
    ],
  },
  {
    role: 'INVENTORY_STAFF',
    title: 'Warehouse / Inventory Staff',
    description: 'Permitted to receive supplier shipments, update cracker stock balances, record damaged stock scrap, and verify physical counts.',
    permissions: [
      'Goods Inward Receiving',
      'Physical Stock Adjustments',
      'Cracker Product Catalogue CRUD',
      'Supplier Contact Management',
      'No POS Finalization Access',
      'No Financial P&L Access',
    ],
  },
];

export default function UsersPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-600" />
          <span>Users, Roles & Access Control (RBAC)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Server-enforced role permissions and Supabase Row-Level Security (RLS) policies for counter staff and management.
        </p>
      </div>

      {/* Active User Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-xl border border-slate-700 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
        <div>
          <div className="text-slate-400 font-semibold uppercase">Currently Active Staff Session:</div>
          <div className="text-lg font-bold text-white mt-0.5">{user?.name || 'Authorized Staff'}</div>
          <div className="text-slate-400 font-mono mt-0.5">{user?.email || 'N/A'} • Shop ID: {user?.shopId || 'shop-sivakasi-01'}</div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-slate-950 text-amber-400 font-black text-xs border border-amber-500/30">
            {user?.role?.replace('_', ' ') || 'STAFF'}
          </span>
        </div>
      </div>

      {/* Role Permission Matrices */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLES_INFO.map((info) => {
          const isCurrent = user?.role === info.role;
          return (
            <div
              key={info.role}
              className={`bg-white rounded-xl border p-5 shadow-sm transition flex flex-col justify-between text-xs space-y-4 ${
                isCurrent ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{info.title}</span>
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-[10px]">
                      ASSIGNED ROLE
                    </span>
                  )}
                </div>
                <p className="text-slate-500 mt-2 leading-relaxed">{info.description}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <span className="font-bold text-slate-700 block">Enforced Privileges:</span>
                  {info.permissions.map((perm, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-slate-600">
                      <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>{perm}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className={`text-[11px] font-bold block text-center py-1.5 rounded-lg ${
                  isCurrent ? 'bg-amber-50 text-amber-800' : 'text-slate-400 bg-slate-50'
                }`}>
                  {isCurrent ? 'Active Enforced Role' : 'Role Managed by Super-Admin'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
