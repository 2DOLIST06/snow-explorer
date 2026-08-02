import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { safeAdminNext } from "@/lib/adminRedirect";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";

export default function AdminLogin() {
  const { login } = useAdminAuth(); const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); if (!email.trim() || !password) { setError("Renseignez votre adresse e-mail et votre mot de passe."); return; } setLoading(true); try { await login(email.trim(), password); setPassword(""); await router.replace(safeAdminNext(router.query.next)); } catch (e) { setPassword(""); setError(e instanceof Error && e.message === "rate_limited" ? "Trop de tentatives de connexion. Réessayez plus tard." : "Adresse e-mail ou mot de passe incorrect."); } finally { setLoading(false); } };
  const initialMessage = router.query.reason === "expired" ? "Votre session a expiré. Reconnectez-vous." : router.query.next ? "Connexion requise." : "";
  return <main className="admin-login"><section className="admin-login-card" data-clarity-mask="true"><p className="eyebrow">Administration</p><h1>Connexion</h1><p>Accédez à l’espace d’administration sécurisé.</p>{initialMessage && !error && <p role="status" className="admin-login-notice">{initialMessage}</p>}<form onSubmit={submit} noValidate><label htmlFor="admin-email">Adresse e-mail</label><input id="admin-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} disabled={loading} /><label htmlFor="admin-password">Mot de passe</label><input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} disabled={loading} /><div role="alert" aria-live="assertive" className="admin-login-error">{error}</div><button type="submit" disabled={loading}>{loading ? "Connexion…" : "Se connecter"}</button></form></section></main>;
}
