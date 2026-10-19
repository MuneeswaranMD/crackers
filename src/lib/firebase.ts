import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  User,
} from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyC0WmCU2ou9bU3HIrN1n7TEMwtWGNNjeWg",
  authDomain: "password-d3910.firebaseapp.com",
  projectId: "password-d3910",
  storageBucket: "password-d3910.firebasestorage.app",
  messagingSenderId: "1084180122022",
  appId: "1:1084180122022:web:ce5fd1c7a59395d074e767",
  measurementId: "G-4WNMGT2PL4"
};

// Initialize Firebase safely for Next.js SSR
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Creating a staff account with the primary auth instance would sign out the
// administrator. A named secondary app keeps the administrator session alive.
let staffAdminApp: FirebaseApp | null = null;
const getStaffAdminAuth = () => {
  if (!staffAdminApp) {
    staffAdminApp = getApps().find((candidate) => candidate.name === 'staff-account-creator')
      || initializeApp(firebaseConfig, 'staff-account-creator');
  }
  return getAuth(staffAdminApp);
};

export interface FirebaseStaffUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'OWNER_ADMIN' | 'CASHIER' | 'INVENTORY_STAFF';
  shopId: string;
}

export const firebaseAuthService = {
  login: async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return cred.user;
  },

  register: async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      await updateProfile(cred.user, { displayName: name });
    }
    return cred.user;
  },

  createManagedAccount: async (email: string, pass: string, name: string) => {
    const staffAuth = getStaffAdminAuth();
    const cred = await createUserWithEmailAndPassword(staffAuth, email, pass);
    if (cred.user) {
      await updateProfile(cred.user, { displayName: name });
    }
    await signOut(staffAuth);
    return cred.user;
  },

  loginWithGoogle: async () => {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  },

  logout: async () => {
    await signOut(auth);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('crackers_pos_auth_user');
    }
  },
};
