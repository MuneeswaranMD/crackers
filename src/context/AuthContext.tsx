'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  auth,
  firebaseAuthService,
} from '@/lib/firebase';
import { onAuthStateChanged, sendPasswordResetEmail, signOut, User } from 'firebase/auth';

export type UserRole = 'OWNER_ADMIN' | 'CASHIER' | 'INVENTORY_STAFF';
export const SUPER_ADMIN_EMAIL = 'muneeswaranmd2004@gmail.com';

export interface ManagedAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  shopId: string;
  createdAt: string;
  createdBy: string;
  isTrial: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  shopId: string;
  permissions: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, pass: string, name: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  sendResetPassword: (email: string) => Promise<void>;
  createManagedAccount: (input: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    isTrial?: boolean;
  }) => Promise<{ account: ManagedAccount; password: string }>;
  updateManagedAccount: (input: { id: string; name: string; role: UserRole }) => Promise<void>;
  removeManagedAccount: (id: string) => Promise<void>;
  managedAccounts: ManagedAccount[];
  isSuperAdmin: boolean;
  switchDevRole?: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  OWNER_ADMIN: [
    'pos:billing',
    'pos:discount',
    'pos:refund',
    'inventory:view',
    'inventory:adjust',
    'products:manage',
    'purchases:manage',
    'reports:view',
    'settings:manage',
    'users:manage',
  ],
  CASHIER: [
    'pos:billing',
    'pos:discount',
    'invoices:view',
  ],
  INVENTORY_STAFF: [
    'inventory:view',
    'inventory:adjust',
    'products:manage',
    'purchases:manage',
    'suppliers:view',
  ],
};

const DIRECTORY_KEY = 'crackers_pos_managed_accounts';
const REVOKED_KEY = 'crackers_pos_revoked_accounts';
const readDirectory = (): ManagedAccount[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(DIRECTORY_KEY) || '[]');
  } catch {
    return [];
  }
};

const readRevokedAccounts = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(REVOKED_KEY) || '[]');
  } catch {
    return [];
  }
};

const generatedPassword = () => `Demo@${Math.random().toString(36).slice(2, 8)}9!`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [managedAccounts, setManagedAccounts] = useState<ManagedAccount[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  // Restore session from Firebase and localStorage on mount
  useEffect(() => {
    let mounted = true;
    setManagedAccounts(readDirectory());

    // Check localStorage cache first for instant hydration
    try {
      const cached = localStorage.getItem('crackers_pos_auth_user');
      if (cached && mounted) {
        setUser(JSON.parse(cached));
      }
    } catch {}

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!mounted) return;

      if (fbUser) {
        // Resolve role from the managed directory or the current session cache.
        let role: UserRole = 'OWNER_ADMIN';
        let directoryAccount: ManagedAccount | undefined;
        try {
          const directory = readDirectory();
          const normalizedEmail = (fbUser.email || '').toLowerCase();
          if (readRevokedAccounts().includes(normalizedEmail)) {
            await signOut(auth);
            setUser(null);
            setLoading(false);
            return;
          }
          directoryAccount = directory.find((account) => account.email.toLowerCase() === normalizedEmail);
          const stored = localStorage.getItem('crackers_pos_auth_user');
          if (directoryAccount) {
            role = directoryAccount.role;
          } else if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.email === fbUser.email && parsed.role) {
              role = parsed.role;
            }
          }
        } catch {}

        // Determine name
        const displayName = directoryAccount?.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'Store Staff';

        const updatedUser: AuthUser = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: displayName,
          role: fbUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL ? 'OWNER_ADMIN' : role,
          shopId: 'shop-sivakasi-01',
          permissions: ROLE_PERMISSIONS[fbUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL ? 'OWNER_ADMIN' : role],
        };

        setUser(updatedUser);
        localStorage.setItem('crackers_pos_auth_user', JSON.stringify(updatedUser));
      } else {
        // User logged out
        setUser(null);
        localStorage.removeItem('crackers_pos_auth_user');
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const fbUser = await firebaseAuthService.login(email, pass);
    const role: UserRole = email.toLowerCase().includes('cashier') ? 'CASHIER' : 'OWNER_ADMIN';
    const authUser: AuthUser = {
      id: fbUser.uid,
      email: fbUser.email || email,
      name: fbUser.displayName || email.split('@')[0],
      role,
      shopId: 'shop-sivakasi-01',
      permissions: ROLE_PERMISSIONS[role],
    };
    setUser(authUser);
    localStorage.setItem('crackers_pos_auth_user', JSON.stringify(authUser));

    const redirectTo = searchParams.get('redirect') || '/';
    router.push(redirectTo);
  };

  const loginWithGoogle = async () => {
    const fbUser = await firebaseAuthService.loginWithGoogle();
    const role: UserRole = 'OWNER_ADMIN';
    const authUser: AuthUser = {
      id: fbUser.uid,
      email: fbUser.email || '',
      name: fbUser.displayName || 'Authorized Staff',
      role,
      shopId: 'shop-sivakasi-01',
      permissions: ROLE_PERMISSIONS[role],
    };
    setUser(authUser);
    localStorage.setItem('crackers_pos_auth_user', JSON.stringify(authUser));

    const redirectTo = searchParams.get('redirect') || '/';
    router.push(redirectTo);
  };

  const register = async (email: string, pass: string, name: string, role: UserRole) => {
    const fbUser = await firebaseAuthService.register(email, pass, name);
    const authUser: AuthUser = {
      id: fbUser.uid,
      email: fbUser.email || email,
      name,
      role,
      shopId: 'shop-sivakasi-01',
      permissions: ROLE_PERMISSIONS[role],
    };
    setUser(authUser);
    localStorage.setItem('crackers_pos_auth_user', JSON.stringify(authUser));

    router.push('/');
  };

  const createManagedAccount = async (input: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    isTrial?: boolean;
  }) => {
    const currentEmail = user?.email?.toLowerCase();
    const currentIsSuperAdmin = currentEmail === SUPER_ADMIN_EMAIL;
    if (!currentEmail || (user?.role !== 'OWNER_ADMIN' && !currentIsSuperAdmin)) {
      throw new Error('Only the Super Admin or Owner / Store Administrator can create staff accounts.');
    }
    if (input.role === 'OWNER_ADMIN' && !currentIsSuperAdmin) {
      throw new Error('Only the Super Admin can create another Owner / Store Administrator account.');
    }

    const password = input.password || generatedPassword();
    const firebaseUser = await firebaseAuthService.createManagedAccount(input.email.trim().toLowerCase(), password, input.name.trim());
    const account: ManagedAccount = {
      id: firebaseUser.uid,
      email: firebaseUser.email || input.email.trim().toLowerCase(),
      name: input.name.trim(),
      role: input.role,
      shopId: user?.shopId || 'shop-sivakasi-01',
      createdAt: new Date().toISOString(),
      createdBy: user?.email || SUPER_ADMIN_EMAIL,
      isTrial: input.isTrial ?? currentIsSuperAdmin,
    };
    const next = [...readDirectory().filter((item) => item.email !== account.email), account];
    localStorage.setItem(DIRECTORY_KEY, JSON.stringify(next));
    setManagedAccounts(next);
    return { account, password };
  };

  const assertCanManageAccounts = () => {
    const currentEmail = user?.email?.toLowerCase();
    if (!currentEmail || (user?.role !== 'OWNER_ADMIN' && currentEmail !== SUPER_ADMIN_EMAIL)) {
      throw new Error('Only the Super Admin or Owner / Store Administrator can manage staff accounts.');
    }
    return currentEmail;
  };

  const updateManagedAccount = async (input: { id: string; name: string; role: UserRole }) => {
    const currentEmail = assertCanManageAccounts();
    const directory = readDirectory();
    const account = directory.find((item) => item.id === input.id);
    if (!account) throw new Error('Staff account not found.');
    if (account.role === 'OWNER_ADMIN' && currentEmail !== SUPER_ADMIN_EMAIL) {
      throw new Error('Only the Super Admin can edit an Owner / Store Administrator account.');
    }
    if (input.role === 'OWNER_ADMIN' && currentEmail !== SUPER_ADMIN_EMAIL) {
      throw new Error('Only the Super Admin can assign the Owner / Store Administrator role.');
    }
    const next = directory.map((item) =>
      item.id === input.id ? { ...item, name: input.name.trim(), role: input.role } : item
    );
    localStorage.setItem(DIRECTORY_KEY, JSON.stringify(next));
    setManagedAccounts(next);
    if (user?.id === input.id) {
      const updatedUser = { ...user, name: input.name.trim(), role: input.role, permissions: ROLE_PERMISSIONS[input.role] };
      setUser(updatedUser);
      localStorage.setItem('crackers_pos_auth_user', JSON.stringify(updatedUser));
    }
  };

  const removeManagedAccount = async (id: string) => {
    const currentEmail = assertCanManageAccounts();
    const directory = readDirectory();
    const account = directory.find((item) => item.id === id);
    if (!account) throw new Error('Staff account not found.');
    if (account.role === 'OWNER_ADMIN' && currentEmail !== SUPER_ADMIN_EMAIL) {
      throw new Error('Only the Super Admin can remove an Owner / Store Administrator account.');
    }
    const next = directory.filter((item) => item.id !== id);
    const revoked = Array.from(new Set([...readRevokedAccounts(), account.email.toLowerCase()]));
    localStorage.setItem(DIRECTORY_KEY, JSON.stringify(next));
    localStorage.setItem(REVOKED_KEY, JSON.stringify(revoked));
    setManagedAccounts(next);
    if (user?.id === id) {
      await firebaseAuthService.logout();
      setUser(null);
      router.push('/login');
    }
  };

  const logout = async () => {
    await firebaseAuthService.logout();
    setUser(null);
    localStorage.removeItem('crackers_pos_auth_user');
    router.push('/login');
  };

  const sendResetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithGoogle,
        register,
        logout,
        sendResetPassword,
        createManagedAccount,
        updateManagedAccount,
        removeManagedAccount,
        managedAccounts,
        isSuperAdmin: !!isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
