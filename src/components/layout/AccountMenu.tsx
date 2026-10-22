import Link from "next/link";
import styles from "./AccountMenu.module.css";
import { FormEvent, useState } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { recoveryRequest } from "@/lib/adminRecovery";

export default function AccountMenu({ onClose }: { onClose: () => void }) {
  const { status, user, login, logout } = useAdminAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [emailLink, setEmailLink] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setSent(false); setBusy(true);
    try {
      if (emailLink) { await recoveryRequest("login-link", { email: email.trim() }); setSent(true); }
      else { await login(email.trim(), password); setPassword(""); onClose(); }
    } catch (cause) {
      setPassword("");
      setError(emailLink ? (cause instanceof Error ? cause.message : "Impossible d’envoyer le mail de connexion.")
        : cause instanceof Error && cause.message === "rate_limited" ? "Trop de tentatives. Veuillez réessayer plus tard." : "Adresse e-mail ou mot de passe incorrect.");
    } finally { setBusy(false); }
  }

  return <div id="header-account-menu" className={`account-menu ${styles.menu}`} data-clarity-mask="true">
    {status === "loading" ? <p role="status">Vérification de la session…</p>
      : status === "authenticated" && user ? <>
        <p className="eyebrow">Mon compte</p><p>{user.email}</p>
        <Link className="btn btn--secondary" href="/admin/account" onClick={onClose}>Aller à mon compte</Link>
        <button type="button" className="btn btn--ghost" onClick={() => { onClose(); void logout(); }}>Se déconnecter</button>
      </> : <form className={styles.form} onSubmit={submit}>
        <p className="eyebrow">Connexion</p>
        <label htmlFor="header-account-email">Adresse e-mail<input id="header-account-email" type="email" autoComplete="username" required value={email} onChange={e => { setEmail(e.target.value); setSent(false); setError(""); }} disabled={busy} /></label>
        {!emailLink && <label htmlFor="header-account-password">Mot de passe<input id="header-account-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></label>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {sent && <p role="status">Un lien de connexion a été envoyé à votre adresse e-mail. Vérifiez aussi vos courriers indésirables.</p>}
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Veuillez patienter…" : emailLink ? "Recevoir mon lien" : "Se connecter"}</button>
        <button type="button" className={`btn btn--ghost ${styles.wrap}`} disabled={busy} onClick={() => { setEmailLink(!emailLink); setPassword(""); setError(""); setSent(false); }}>{emailLink ? "Utiliser mon mot de passe" : "Mot de passe oublié ? Recevoir un lien de connexion"}</button>
      </form>}
  </div>;
}
