'use client';

import React, { useState } from 'react';
import { ShieldCheck, UserPlus, Copy, AlertCircle, KeyRound, Pencil, Trash2, X, Save } from 'lucide-react';
import { useAuth, UserRole } from '@/context/AuthContext';

const roleLabels: Record<UserRole, string> = {
  OWNER_ADMIN: 'Owner / Store Administrator',
  CASHIER: 'Cashier',
  INVENTORY_STAFF: 'Inventory Staff',
};

export default function UsersPage() {
  const { user, isSuperAdmin, managedAccounts, createManagedAccount, updateManagedAccount, removeManagedAccount } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('CASHIER');
  const [trial, setTrial] = useState(false);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('CASHIER');

  const canManageAccess = isSuperAdmin || user?.role === 'OWNER_ADMIN';

  React.useEffect(() => {
    if (isSuperAdmin) setTrial(true);
  }, [isSuperAdmin]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setCreatedCredentials(null);
    setSaving(true);
    try {
      const result = await createManagedAccount({ email, password, name, role, isTrial: trial });
      setCreatedCredentials({ email: result.account.email, password: result.password });
      setStatus({ kind: 'success', text: `${roleLabels[role]} account created successfully.` });
      setName('');
      setEmail('');
      setPassword('');
    } catch (error: any) {
      setStatus({ kind: 'error', text: error?.message || 'Unable to create this account.' });
    } finally {
      setSaving(false);
    }
  };

  const copyCredentials = async () => {
    if (!createdCredentials) return;
    await navigator.clipboard.writeText(`Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`);
    setStatus({ kind: 'success', text: 'Demo credentials copied. Share them securely with the staff member.' });
  };

  const startEditing = (account: (typeof managedAccounts)[number]) => {
    setEditingId(account.id);
    setEditName(account.name);
    setEditRole(account.role);
    setStatus(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    try {
      await updateManagedAccount({ id: editingId, name: editName, role: editRole });
      setStatus({ kind: 'success', text: 'User access updated successfully.' });
      setEditingId(null);
    } catch (error: any) {
      setStatus({ kind: 'error', text: error?.message || 'Unable to update this account.' });
    } finally {
      setSaving(false);
    }
  };

  const removeAccount = async (account: (typeof managedAccounts)[number]) => {
    if (!window.confirm(`Remove access for ${account.name}? They will no longer be allowed to use this app.`)) return;
    setSaving(true);
    try {
      await removeManagedAccount(account.id);
      setStatus({ kind: 'success', text: `${account.name}'s access was removed.` });
    } catch (error: any) {
      setStatus({ kind: 'error', text: error?.message || 'Unable to remove this account.' });
    } finally {
      setSaving(false);
    }
  };

  if (!canManageAccess) {
    return <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl border border-slate-200 text-sm text-slate-600">You do not have permission to manage staff accounts.</div>;
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-amber-600" /> Users, Roles & Trial Accounts</h2>
        <p className="text-xs text-slate-500 mt-1">The Super Admin creates free-trial shop credentials. Owners and Store Administrators can create Cashier and Inventory Staff accounts for their store.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><UserPlus className="w-4 h-4 text-amber-600" /> Create account</div>
          <label className="block font-bold text-slate-700">Full name<input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full p-2 border rounded-lg font-medium" placeholder="Staff name" /></label>
          <label className="block font-bold text-slate-700">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full p-2 border rounded-lg font-medium" placeholder="staff@example.com" /></label>
          <label className="block font-bold text-slate-700">Password <span className="font-normal text-slate-400">(blank = generate demo password)</span><input minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full p-2 border rounded-lg font-medium" placeholder="Minimum 6 characters" /></label>
          <label className="block font-bold text-slate-700">Role<select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="mt-1 w-full p-2 border rounded-lg font-semibold"><option value="CASHIER">Cashier</option><option value="INVENTORY_STAFF">Inventory Staff</option>{isSuperAdmin && <option value="OWNER_ADMIN">Owner / Store Administrator</option>}</select></label>
          {isSuperAdmin && <label className="flex items-center gap-2 font-semibold text-slate-700"><input type="checkbox" checked={trial} onChange={(e) => setTrial(e.target.checked)} className="accent-amber-500" /> Free trial account</label>}
          {status && <div className={`p-3 rounded-lg flex gap-2 ${status.kind === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}><AlertCircle className="w-4 h-4 shrink-0" />{status.text}</div>}
          <button disabled={saving} className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 font-black text-slate-950">{saving ? 'Creating account…' : 'Create account'}</button>
        </form>

        <div className="space-y-4">
          {createdCredentials && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs"><div className="font-black text-amber-900 flex items-center gap-2"><KeyRound className="w-4 h-4" /> Demo credentials — save now</div><div className="mt-2 font-mono text-slate-800">Email: {createdCredentials.email}<br />Password: {createdCredentials.password}</div><button onClick={copyCredentials} className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500 font-bold flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> Copy credentials</button></div>}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"><div className="p-4 border-b font-bold text-sm text-slate-900">Managed accounts ({managedAccounts.length})</div>{managedAccounts.length === 0 ? <div className="p-6 text-xs text-slate-500">No accounts created from this browser yet.</div> : <div className="divide-y">{managedAccounts.map((account) => editingId === account.id ? <div key={account.id} className="p-4 space-y-3 text-xs"><div className="font-bold text-slate-900">Edit user access</div><label className="block font-bold text-slate-700">Full name<input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 w-full p-2 border rounded-lg font-medium" /></label><label className="block font-bold text-slate-700">Role<select value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)} className="mt-1 w-full p-2 border rounded-lg font-semibold"><option value="CASHIER">Cashier</option><option value="INVENTORY_STAFF">Inventory Staff</option>{isSuperAdmin && <option value="OWNER_ADMIN">Owner / Store Administrator</option>}</select></label><div className="flex gap-2"><button type="button" onClick={saveEdit} disabled={saving || !canManageAccess} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Save</button><button type="button" onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button></div></div> : <div key={account.id} className="p-4 flex items-center justify-between gap-3 text-xs"><div><div className="font-bold text-slate-900">{account.name}</div><div className="text-slate-500">{account.email}</div></div><div className="flex items-center gap-3"><div className="text-right"><div className="font-bold text-amber-700">{roleLabels[account.role]}</div><div className="text-slate-400">{account.isTrial ? 'Free trial' : 'Staff account'}</div></div>{canManageAccess && <><button type="button" title="Edit access" onClick={() => startEditing(account)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Pencil className="w-4 h-4" /></button><button type="button" title="Remove access" onClick={() => removeAccount(account)} disabled={saving} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button></>}</div></div>)}</div>}</div>
        </div>
      </div>
    </div>
  );
}
