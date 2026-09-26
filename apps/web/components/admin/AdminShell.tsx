"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { COLLECTIONS, RESTAURANT_ID } from "@casbah/shared";
import { getFirebaseDb } from "@/lib/firebase-client";
import { Porte } from "@/components/Icons";
import { useAuth } from "./useAuth";

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export default function AdminShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  const [toast, setToast] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  const show = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  // Compteur temps réel des demandes en attente (badge dans la barre).
  useEffect(() => {
    if (!auth.isAdmin) return;
    const q = query(collection(getFirebaseDb(), COLLECTIONS.reservations(RESTAURANT_ID)), where("status", "==", "pending"));
    return onSnapshot(q, (snap) => setPendingCount(snap.size), () => setPendingCount(null));
  }, [auth.isAdmin]);

  if (!auth.configured) {
    return (
      <div className="adm-login">
        <form onSubmit={(e) => e.preventDefault()}>
          <span className="brand-line">LA CASBAH · ADMIN</span>
          <p className="muted">Interface marchand non configurée sur cet hébergement (variables NEXT_PUBLIC_FIREBASE_* absentes).</p>
        </form>
      </div>
    );
  }
  if (!auth.ready) return <div className="adm-login muted">Chargement…</div>;
  if (!auth.user || !auth.isAdmin) return <Login onLogin={auth.login} notAdmin={!!auth.user && !auth.isAdmin} onLogout={auth.logout} />;

  const is = (p: string) => (p === "/admin" ? pathname === "/admin" || pathname === "/admin/" : pathname?.startsWith(p));

  return (
    <ToastCtx.Provider value={show}>
      <div className="adm">
        <nav className="adm-nav">
          <div className="brand">
            <Porte size={20} />
            <div>
              <b>LA CASBAH</b>
              <br />
              <small>RÉSERVATIONS</small>
            </div>
          </div>
          <div className="links">
            <Link href="/admin" className={is("/admin") ? "on" : ""}>
              Pile{pendingCount ? <span className="n">{pendingCount}</span> : null}
            </Link>
            <Link href="/admin/liste" className={is("/admin/liste") ? "on" : ""}>
              Historique
            </Link>
            <Link href="/admin/reglages" className={is("/admin/reglages") ? "on" : ""}>
              Réglages
            </Link>
          </div>
          <div className="who">
            {auth.user.email}
            <button type="button" onClick={auth.logout}>
              DÉCONNEXION
            </button>
          </div>
        </nav>
        <main className="adm-main">{children}</main>
        {toast && <div className="adm-toast">{toast}</div>}
      </div>
    </ToastCtx.Provider>
  );
}

function Login({ onLogin, notAdmin, onLogout }: { onLogin: (e: string, p: string) => Promise<void>; notAdmin: boolean; onLogout: () => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onLogin(email.trim(), password);
    } catch {
      setError("Identifiants incorrects.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-login">
      <form onSubmit={submit}>
        <span className="brand-line">LA CASBAH · ADMIN</span>
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: 32, color: "var(--sable)" }}>Connexion</h1>
        {notAdmin ? (
          <>
            <p className="r-error">Ce compte n'a pas accès à l'interface marchand.</p>
            <button className="btn ghost" type="button" onClick={onLogout}>
              <span>SE DÉCONNECTER</span>
            </button>
          </>
        ) : (
          <>
            <div className="r-field">
              <label htmlFor="a-email">E-MAIL</label>
              <input id="a-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="r-field">
              <label htmlFor="a-pass">MOT DE PASSE</label>
              <input id="a-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <div className="r-error">{error}</div>}
            <button className="btn" type="submit" disabled={busy}>
              <span>{busy ? "CONNEXION…" : "SE CONNECTER"}</span>
            </button>
          </>
        )}
      </form>
    </div>
  );
}
