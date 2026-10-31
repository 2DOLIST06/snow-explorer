import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { memberRequest } from "@/lib/memberApi";
import styles from "../layout/AccountMenu.module.css";
import { intentFromQuery, loginDestination } from "@/lib/newsletter/onboarding";

export default function MemberAuthForm({ mode = "login", onComplete }: { mode?: "login" | "register"; onComplete?: () => void }) {
  const { login } = useMemberAuth(); const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [emailLink, setEmailLink] = useState(router.query.method !== "password"); const [busy, setBusy] = useState(false);
  useEffect(() => { setEmailLink(router.query.method !== "password"); }, [router.query.method]);
  const [error, setError] = useState(""); const [sent, setSent] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setSent(false);
    try {
      if (mode === "register" || emailLink) {
        const intent = intentFromQuery(router.query);
        if (intent) { await memberRequest("/newsletter/login-link", { email: email.trim().toLowerCase(), intent: { ...intent, consent: true } }); }
        else await memberRequest(mode === "register" ? "/register" : "/login-link", { email: email.trim().toLowerCase() });
        setSent(true);
      }
      else { await login(email.trim().toLowerCase(), password); setPassword(""); onComplete?.(); await router.push(loginDestination(router.query)); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connexion impossible."); }
    finally { setBusy(false); }
  }
  return <form className={styles.form} onSubmit={submit} data-clarity-mask="true">
    {mode === "register" && <p>Indiquez votre adresse email pour accéder à votre compte Snow Explorer. Si vous êtes déjà inscrit à la newsletter, vous retrouverez vos abonnements dans ce même compte. Vous pourrez ensuite définir un mot de passe.</p>}
    <label>Adresse e-mail<input type="email" autoComplete="email" required value={email} onChange={e => { setEmail(e.target.value); setSent(false); setError(""); }} disabled={busy} /></label>
    {mode === "login" && !emailLink && <label>Mot de passe<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></label>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {sent && <p role="status">{mode === "register" ? "Un lien d’accès à votre compte a été envoyé à votre adresse email." : "Un lien de connexion a été envoyé à votre adresse e-mail."} Vérifiez aussi vos courriers indésirables.</p>}
    <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Veuillez patienter…" : mode === "register" ? "Recevoir mon lien d’accès" : emailLink ? "Recevoir mon lien" : "Se connecter"}</button>
    {mode === "login" && <button type="button" className={`btn btn--ghost ${styles.wrap}`} disabled={busy} onClick={() => { setEmailLink(!emailLink); setPassword(""); setError(""); setSent(false); }}>{emailLink ? "Utiliser mon mot de passe" : "Recevoir un lien de connexion par email"}</button>}
    <Link className="btn btn--secondary" href={mode === "register" ? "/connexion?method=password" : "/inscription"} onClick={onComplete}>{mode === "register" ? "Me connecter avec un mot de passe" : "Première connexion ? Accéder à mon compte"}</Link>
  </form>;
}
