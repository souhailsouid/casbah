"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, onIdTokenChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase-client";

export interface AuthState {
  ready: boolean;
  user: User | null;
  isAdmin: boolean;
  configured: boolean;
}

export function useAuth(): AuthState & { login: (email: string, password: string) => Promise<void>; logout: () => Promise<void> } {
  const configured = isFirebaseConfigured();
  const [state, setState] = useState<AuthState>({ ready: !configured, user: null, isAdmin: false, configured });

  useEffect(() => {
    if (!configured) return;
    const auth = getFirebaseAuth();
    const apply = async (user: User | null) => {
      if (!user) return setState({ ready: true, user: null, isAdmin: false, configured });
      const token = await user.getIdTokenResult();
      setState({ ready: true, user, isAdmin: token.claims.role === "admin", configured });
    };
    const u1 = onAuthStateChanged(auth, apply);
    const u2 = onIdTokenChanged(auth, apply);
    return () => {
      u1();
      u2();
    };
  }, [configured]);

  return {
    ...state,
    login: async (email, password) => {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    },
    logout: () => signOut(getFirebaseAuth()),
  };
}
