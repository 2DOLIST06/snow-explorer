import { FormEvent, useState } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminFetch } from "@/lib/adminApi";
import { recoveryError } from "@/lib/adminRecovery";

export default function AdminAccount() {
  const { user, refreshSession } = useAdminAuth();
  const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setSaved(false);
    if (password !== confirmation) { setError("Les mots de passe ne correspondent pas."); return; }
    setBusy(true);
    try {
      const response = await adminFetch("/api/admin/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(recoveryError(data.error));
      const csrf = await refreshSession();
      if (!csrf) throw new Error("Mot de passe modifié. Reconnectez-vous avec votre nouveau mot de passe.");
      setPassword(""); setConfirmation(""); setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Modification impossible."); }
    finally { setBusy(false); }
  }
  return <main className="admin-login"><section className="admin-login-card" data-clarity-mask="true"><h1>Mon compte</h1><p>{user?.email}</p><h2>Modifier mon mot de passe</h2><form onSubmit={submit}><label htmlFor="new-password">Nouveau mot de passe (12 caractères minimum)</label><input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={1024} required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /><label htmlFor="confirm-password">Confirmer le mot de passe</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={12} maxLength={1024} required value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} />{error && <p role="alert" className="admin-login-error">{error}</p>}{saved && <p role="status">Mot de passe modifié.</p>}<button disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button></form></section></main>;
}
