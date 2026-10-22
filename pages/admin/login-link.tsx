import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { recoveryRequest } from "@/lib/adminRecovery";

export default function AdminEmailLogin() {
  const router = useRouter(); const { refreshSession } = useAdminAuth();
  const [token, setToken] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { const value = window.location.hash.slice(1); if (value) setToken(value); window.history.replaceState(null, "", window.location.pathname); }, []);
  async function connect() {
    setBusy(true); setError("");
    try { await recoveryRequest("login-link/consume", { token }); const csrf = await refreshSession(); if (!csrf) throw new Error("Session non disponible. Vérifiez que votre navigateur autorise les cookies de connexion."); await router.replace("/admin/account"); }
    catch (e) { setError(e instanceof Error ? e.message : "Connexion impossible."); }
    finally { setBusy(false); }
  }
  return <main className="admin-login"><Head><meta name="robots" content="noindex,nofollow" /><meta name="referrer" content="no-referrer" /></Head><section className="admin-login-card" data-clarity-mask="true"><h1>Connexion par e-mail</h1><button disabled={!token || busy} onClick={() => void connect()}>{busy ? "Connexion…" : "Me connecter"}</button>{error && <p role="alert" className="admin-login-error">{error}</p>}<p><Link href="/admin/login">Recevoir un nouveau lien</Link></p></section></main>;
}
