import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { intentFromQuery } from "@/lib/newsletter/onboarding";
import { memberRequest } from "@/lib/memberApi";
import MemberNewsletter from "@/components/member/MemberNewsletter";
import NewsletterEnrollment from "@/components/newsletter/NewsletterEnrollment";
import MemberAuthForm from "@/components/member/MemberAuthForm";

export default function MemberAccount() {
  return <><Head><title>Mon compte | Snow Explorer</title><meta name="robots" content="noindex,nofollow" /></Head><MemberAccountContent /></>;
}
function MemberAccountContent() {
  const router = useRouter();
  const requested = intentFromQuery(router.query);
  const { status, user, refresh, logout, newsletterEntry, openNewsletterAccount } = useMemberAuth();
  const [otherEmail, setOtherEmail] = useState(false);
  const [tab, setTab] = useState<"newsletter" | "password">("newsletter");
  const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  useEffect(() => { if (newsletterEntry) setOtherEmail(false); }, [newsletterEntry]);
  const entry = newsletterEntry && newsletterEntry.expiresAt > Date.now() ? newsletterEntry : null;
  const addingAddress = otherEmail && !entry;
  const authenticated = Boolean(!addingAddress && user && (!entry || entry.email === user.email));
  const signup = !authenticated && entry?.draftToken ? entry : undefined;
  const enrolling = !authenticated && !signup && !entry && requested;
  const email = addingAddress ? undefined : entry?.email || user?.email;
  async function save(event: FormEvent) {
    event.preventDefault(); setError(""); setSaved(false);
    if (password !== confirmation) { setError("Les mots de passe ne correspondent pas."); return; }
    setBusy(true);
    try { await memberRequest("/password", { password }, true); await refresh(); setPassword(""); setConfirmation(""); setSaved(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Modification impossible."); }
    finally { setBusy(false); }
  }
  if (status === "loading") return <main className="newsletter-page"><p role="status">Vérification de la session…</p></main>;
  return <main className="newsletter-page">
    <header className="newsletter-hero"><h1>Mon compte</h1>{email && <p>{email}</p>}
      {authenticated && <button className="btn btn--secondary" onClick={() => void logout().catch(cause => setError(cause instanceof Error ? cause.message : "Déconnexion impossible."))}>Se déconnecter</button>}
    </header>
    {entry && <p role="status" className="newsletter-feedback newsletter-feedback--success">{entry.notice || (entry.status === "already_subscribed" ? "Cette adresse est déjà inscrite. Connectez-vous pour retrouver vos préférences." : "Votre inscription a bien été prise en compte. Vous pouvez modifier vos préférences.")}</p>}
    {(authenticated || signup) && <>
      <div role="tablist" aria-label="Rubriques du compte">
        <button id="newsletter-tab" className="btn btn--secondary" role="tab" aria-selected={tab === "newsletter"} aria-controls="newsletter-panel" onClick={() => setTab("newsletter")}>Mes abonnements</button>{" "}
        <button id="password-tab" className="btn btn--secondary" role="tab" aria-selected={tab === "password"} aria-controls="password-panel" onClick={() => setTab("password")}>{authenticated && user?.password_set ? "Modifier mon mot de passe" : "Définir un mot de passe"}</button>
      </div>
      {tab === "newsletter" ? <section id="newsletter-panel" role="tabpanel" aria-labelledby="newsletter-tab"><MemberNewsletter key={authenticated ? user!.id : email} signup={signup} /></section> : <section id="password-panel" role="tabpanel" aria-labelledby="password-tab" className="newsletter-section" data-clarity-mask="true">
        <h2>{authenticated && user?.password_set ? "Modifier mon mot de passe" : "Définir un mot de passe"}</h2>
        {authenticated ? <form onSubmit={save}>
          <label className="newsletter-field">Nouveau mot de passe (12 caractères minimum)<input type="password" autoComplete="new-password" minLength={12} maxLength={1024} required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></label>
          <label className="newsletter-field">Confirmer le mot de passe<input type="password" autoComplete="new-password" minLength={12} maxLength={1024} required value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} /></label>
          {saved && <p role="status">Mot de passe modifié.</p>}<button className="btn btn--primary" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </form> : <><p>Ouvrez le lien reçu par email pour définir votre mot de passe dans ce compte.</p><MemberAuthForm initialEmail={email} /></>}
      </section>}
    </>}
    {addingAddress ? <section className="newsletter-section"><h2>Inscrire une autre adresse email</h2><NewsletterEnrollment forceOtherEmail initial={{ stations: [], articles: true, consent: false, language: "fr", source: "member-account" }} /></section> : enrolling ? <section className="newsletter-section"><h2>Recevoir les informations de {requested.stations[0].station_name} par email</h2><NewsletterEnrollment initial={requested} /></section> : !authenticated && !signup && <section className="newsletter-section"><h2>Se connecter à mon compte</h2><MemberAuthForm initialEmail={email} /></section>}
    {error && <p role="alert">{error}</p>}
    <p><button type="button" className="newsletter-change-email" onClick={() => { openNewsletterAccount(null); setOtherEmail(true); setTab("newsletter"); }}>Inscrire une autre adresse email</button>{" · "}<Link className="newsletter-change-email" href="/connexion?autre=1" onClick={() => openNewsletterAccount(null)}>Se connecter avec une autre adresse</Link></p>
  </main>;
}
