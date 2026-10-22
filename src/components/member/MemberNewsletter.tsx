import { useCallback, useEffect, useMemo, useState } from "react";
import { memberRequest } from "@/lib/memberApi";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import StationNewsletterEditor, { StationSettings, StationSettingsApi } from "../newsletter/StationNewsletterEditor";

type Access = { status: string };
export default function MemberNewsletter() {
  const { user } = useMemberAuth(); const [access, setAccess] = useState<Access | null>(null);
  const api = useMemo<StationSettingsApi>(() => ({
    list: async () => (await memberRequest<{ data: { stations: StationSettings[] } }>("/newsletter/stations")).data.stations,
    add: async id => (await memberRequest<{ data: StationSettings }>("/newsletter/stations", { station_id: id }, true)).data,
    save: async (id, value) => (await memberRequest<{ data: StationSettings }>(`/newsletter/stations/${encodeURIComponent(id)}`, value, true)).data,
    remove: id => memberRequest(`/newsletter/stations/${encodeURIComponent(id)}/remove`, {}, true),
  }), []);
  const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    const next = await memberRequest<Access>("/newsletter/access");
    setAccess(next);
  }, []);
  useEffect(() => { void load().catch(() => setError("Impossible de charger les préférences newsletter. Réessayez.")); }, [load]);
  async function action(fn: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await fn(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  }
  return <section className="newsletter-section"><h2>Préférences newsletter</h2>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!access ? <p>Chargement des préférences…</p> : (access.status === "active" || access.status === "pending") ? <>
      <StationNewsletterEditor api={api} />
      <button className="btn btn--secondary" disabled={busy} onClick={() => void action(async () => { await memberRequest("/newsletter/unsubscribe", {}, true); setAccess({ status: "unsubscribed" }); setConsent(false); setNotice("Vous êtes désabonné de la newsletter."); })}>Me désabonner</button>
    </> : access.status === "bounced" || access.status === "complained" ? <p>Cet abonnement est indisponible. Contactez-nous pour le vérifier.</p> : <>
      <p>{access.status === "unsubscribed" ? "Vous êtes désabonné de la newsletter." : "Vous n’êtes pas inscrit à la newsletter."}</p>
      <label className="preference-toggle"><span>Je souhaite recevoir les informations et actualités de Snow Explorer par e-mail. Je pourrai me désabonner à tout moment.</span><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={busy} /></label>
      <button className="btn btn--primary" disabled={!consent || busy} onClick={() => void action(async () => {
        await memberRequest("/newsletter/subscribe", { email: user?.email, consent: true, consentTextVersion: "v1", language: "fr", source: "member-account" }, true); await load();
      })}>{busy ? "Inscription…" : "M’inscrire à la newsletter"}</button>
    </>}
  </section>;
}
