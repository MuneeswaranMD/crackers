'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  auth,
  firebaseAuthService,
} from '@/lib/firebase';
import { onAuthStateChanged, sendPasswordResetEmail, User } from 'firebase/auth';

export type UserRole = 'OWNER_ADMIN' | 'CASHIER' | 'INVENTORY_STAFF';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Restore session from Firebase and localStorage on mount
  useEffect(() => {
    let mounted = true;

    // Check localStorage cache first for instant hydration
    try {
      const cached = localStorage.getItem('crackers_pos_auth_user');
      if (cached && mounted) {
        setUser(JSON.parse(cached));
      }
    } catch {}

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (!mounted) return;

      if (fbUser) {
        // Resolve role from email or cache
        let role: UserRole = 'OWNER_ADMIN';
        try {
          const stored = localStorage.getItem('crackers_pos_auth_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.email === fbUser.email && parsed.role) {
              role = parsed.role;
            }
          }
        } catch {}

        // Determine name
        const displayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'Store Staff';

        const updatedUser: AuthUser = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: displayName,
          role,
          shopId: 'shop-sivakasi-01',
          permissions: ROLE_PERMISSIONS[role],
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
