import Head from "next/head";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { memberRequest } from "@/lib/memberApi";
import MemberNewsletter from "@/components/member/MemberNewsletter";

export default function MemberAccount() {
  return <><Head><title>Mon compte | Snow Explorer</title><meta name="robots" content="noindex,nofollow" /></Head><MemberAccountContent /></>;
}
function MemberAccountContent() {
  const { status, user, refresh, logout } = useMemberAuth();
  const [tab, setTab] = useState<"newsletter" | "password">("newsletter");
  const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault(); setError(""); setSaved(false);
    if (password !== confirmation) { setError("Les mots de passe ne correspondent pas."); return; }
    setBusy(true);
    try { await memberRequest("/password", { password }, true); await refresh(); setPassword(""); setConfirmation(""); setSaved(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Modification impossible."); }
    finally { setBusy(false); }
  }
  if (status === "loading") return <main className="newsletter-page"><p role="status">Vérification de la session…</p></main>;
  if (!user) return <main className="newsletter-page"><h1>Mon compte</h1><p>Connectez-vous pour accéder à votre compte.</p><Link className="btn btn--primary" href="/connexion">Se connecter</Link> <Link className="btn btn--secondary" href="/inscription">Créer un compte</Link></main>;
  return <main className="newsletter-page"><header className="newsletter-hero"><h1>Mon compte</h1><p>{user.email}</p><button className="btn btn--secondary" onClick={() => void logout().catch(cause => setError(cause instanceof Error ? cause.message : "Déconnexion impossible."))}>Se déconnecter</button></header><div role="tablist" aria-label="Rubriques du compte"><button id="newsletter-tab" className="btn btn--secondary" role="tab" aria-selected={tab === "newsletter"} aria-controls="newsletter-panel" onClick={() => setTab("newsletter")}>Préférences newsletter</button> <button id="password-tab" className="btn btn--secondary" role="tab" aria-selected={tab === "password"} aria-controls="password-panel" onClick={() => setTab("password")}>Modifier mon mot de passe</button></div>{tab === "newsletter" ? <section id="newsletter-panel" role="tabpanel" aria-labelledby="newsletter-tab"><MemberNewsletter key={user.id} /></section> : <section id="password-panel" role="tabpanel" aria-labelledby="password-tab" className="newsletter-section" data-clarity-mask="true"><h2>Modifier mon mot de passe</h2>{!user.password_set && <p>Vous pouvez définir un mot de passe pour vous connecter aussi sans lien par mail.</p>}<form onSubmit={save}><label className="newsletter-field">Nouveau mot de passe (12 caractères minimum)<input type="password" autoComplete="new-password" minLength={12} maxLength={1024} required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></label><label className="newsletter-field">Confirmer le mot de passe<input type="password" autoComplete="new-password" minLength={12} maxLength={1024} required value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} /></label>{saved && <p role="status">Mot de passe modifié.</p>}<button className="btn btn--primary" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button></form></section>}{error && <p role="alert">{error}</p>}</main>;
}
