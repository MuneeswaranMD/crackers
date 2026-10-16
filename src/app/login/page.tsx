'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Flame,
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  X,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/db';
import { Shop } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, loginWithGoogle, sendResetPassword } = useAuth();

  const [shop, setShop] = useState<Shop>(() => db.getShop());

  React.useEffect(() => {
    db.initDefaults();
    setShop(db.getShop());
    return db.onShopChange((updated) => setShop(updated));
  }, []);

  const [tab, setTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'OWNER_ADMIN' | 'CASHIER' | 'INVENTORY_STAFF'>('CASHIER');

  // Status & Modals
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setLoading(true);

    try {
      if (tab === 'LOGIN') {
        await login(email.trim(), password);
      } else {
        if (!fullName.trim()) {
          setErrorMsg('Please enter your full staff name.');
          setLoading(false);
          return;
        }
        await register(email.trim(), password, fullName.trim(), role);
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      const code = err.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setErrorMsg('Invalid email or password. Please verify your credentials.');
      } else if (code === 'auth/user-not-found') {
        setErrorMsg('No registered staff account found with this email.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email is already registered. Please sign in.');
      } else if (code === 'auth/weak-password') {
        setErrorMsg('Password should be at least 6 characters.');
      } else {
        setErrorMsg(err.message || 'Authentication failed. Please check network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setErrorMsg(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    try {
      await sendResetPassword(resetEmail.trim());
      setResetStatus('Password reset link sent to your email! Please check your inbox.');
    } catch (err: any) {
      setResetStatus(`Failed to send reset email: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#171206] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Subtle Warm Amber Ambient Glows Behind Card */}
      <div className="absolute w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none -top-24 -left-24" />
      <div className="absolute w-[450px] h-[450px] bg-orange-600/10 rounded-full blur-3xl pointer-events-none -bottom-24 -right-24" />
      <div className="absolute w-[320px] h-[320px] bg-amber-400/15 rounded-full blur-2xl pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      {/* Main Centered Login Card */}
      <div className="w-full max-w-[420px] bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 my-auto">
        {/* Brand Header */}
        <div className="pt-7 pb-5 px-6 text-center border-b border-slate-100 bg-gradient-to-b from-amber-50/40 to-white">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shadow-lg shadow-teal-500/10 mx-auto mb-3">
            <img src="/logo.png" alt="Averqon Logo" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight">
            {shop.name || 'Sree Kalieswari Traders'}
          </div>
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mt-0.5">
            Sivakasi Fireworks POS & Billing
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-1">
            Powered by Averqon Retail Engine
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 text-xs font-bold bg-slate-50">
          <button
            type="button"
            onClick={() => {
              setTab('LOGIN');
              setErrorMsg(null);
            }}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              tab === 'LOGIN'
                ? 'border-amber-500 text-slate-950 bg-white font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Staff Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('REGISTER');
              setErrorMsg(null);
            }}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              tab === 'REGISTER'
                ? 'border-amber-500 text-slate-950 bg-white font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Register Staff Account
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {tab === 'REGISTER' && (
              <>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Staff Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Muneeswaran"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="OWNER_ADMIN">Store Owner / Administrator</option>
                    <option value="CASHIER">Billing Cashier Counter</option>
                    <option value="INVENTORY_STAFF">Godown Inventory Staff</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="font-bold text-slate-700 block mb-1">Staff Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="e.g. staff@sreekalieswaritraders.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">Password *</label>
                {tab === 'LOGIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setResetStatus(null);
                      setResetModalOpen(true);
                    }}
                    className="text-[11px] text-amber-600 hover:text-amber-800 font-bold hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 text-sm mt-3"
            >
              <span>{loading ? 'Authenticating...' : tab === 'LOGIN' ? 'Sign In to Counter' : 'Create Staff Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Social Google Sign-in */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
              <span className="bg-white px-2">Or Google Authentication</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2.5 transition text-xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Card Footer with Security Badge */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted Session • PESO Compliance Terminal</span>
        </div>
      </div>

      {/* Forgot Password Reset Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 text-xs">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" />
                <span>Reset Staff Password</span>
              </span>
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-5 space-y-3.5">
              <p className="text-slate-600 text-xs leading-relaxed">
                Enter your registered staff email address below. A password recovery link will be dispatched immediately.
              </p>

              {resetStatus && (
                <div className="p-3 rounded-xl bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                  {resetStatus}
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Staff Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="staff@sreekalieswaritraders.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
