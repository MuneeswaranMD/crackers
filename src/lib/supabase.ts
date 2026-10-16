import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'OWNER_ADMIN' | 'CASHIER' | 'INVENTORY_STAFF';
  shopId: string;
}

export const authState = {
  getCurrentUser: (): AuthUser | null => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('crackers_pos_auth_user');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return null;
  },

  setCurrentUser: (user: AuthUser | null): void => {
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem('crackers_pos_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('crackers_pos_auth_user');
    }
  },
};
