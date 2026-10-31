import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { memberRequest } from "@/lib/memberApi";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { intentFromQuery, type NewsletterIntent } from "@/lib/newsletter/onboarding";
import type { NewsletterFrequency } from "@/types/newsletter";
import StationNewsletterEditor, { StationSettings, StationSettingsApi } from "../newsletter/StationNewsletterEditor";
import NewsletterIntentForm from "../newsletter/NewsletterIntentForm";

type Access = { status: string };
export default function MemberNewsletter() {
  const router = useRouter(); const { user, newsletterIntent, stageNewsletterIntent } = useMemberAuth();
  const [access, setAccess] = useState<Access | null>(null); const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState<NewsletterIntent | null>(null);
  const [articles, setArticles] = useState(false); const [frequency, setFrequency] = useState<NewsletterFrequency>("weekly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const api = useMemo<StationSettingsApi>(() => ({
    list: async () => (await memberRequest<{ data: { stations: StationSettings[] } }>("/newsletter/stations")).data.stations,
    add: async id => (await memberRequest<{ data: StationSettings }>("/newsletter/stations", { station_id: id }, true)).data,
    save: async (id, value) => (await memberRequest<{ data: StationSettings }>(`/newsletter/stations/${encodeURIComponent(id)}`, value, true)).data,
    remove: id => memberRequest(`/newsletter/stations/${encodeURIComponent(id)}/remove`, {}, true),
  }), []);
  const load = useCallback(async () => {
    const next = await memberRequest<Access>("/newsletter/access");
    setAccess(next);
    if (next.status === "active" || next.status === "pending") {
      const data = await memberRequest<{ data: { preferences: { articles: boolean; newsletter_frequency: NewsletterFrequency } } }>("/newsletter/preferences");
      setArticles(data.data.preferences.articles); setFrequency(data.data.preferences.newsletter_frequency);
    }
  }, []);
  useEffect(() => { let live = true; void load().catch(() => { if (live) setError("Impossible de charger les abonnements. Réessayez."); }); return () => { live = false; }; }, [load]);
  const queryIntent = useMemo(() => intentFromQuery(router.query), [router.query.station_id, router.query.station_name, router.query.topic]);
  useEffect(() => {
    let live = true;
    if (queryIntent || newsletterIntent) setPending(queryIntent || newsletterIntent);
    else void memberRequest<{ intent: NewsletterIntent | null }>("/newsletter/request").then(result => { if (live) setPending(result.intent); }).catch(() => { /* Existing subscriptions remain accessible. */ });
    return () => { live = false; };
  }, [queryIntent, newsletterIntent]);
  async function clearPending() {
    await memberRequest("/newsletter/request", {}, true);
    stageNewsletterIntent(null, user?.email || ""); setPending(null);
    if (queryIntent) await router.replace("/mon-compte", undefined, { shallow: true });
  }
  async function action(fn: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await fn(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  }
  const available = access?.status === "active" || access?.status === "pending";
  const blocked = access?.status === "bounced" || access?.status === "complained";
  return <section className="newsletter-section"><h2>Mes abonnements</h2>
    <p>Retrouvez vos stations et choisissez les informations que vous souhaitez recevoir pour chacune.</p>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!access ? <p role="status">Chargement…</p> : blocked ? <p>Cet abonnement est indisponible. Contactez-nous pour le vérifier.</p> : <>
      {pending && <section className="newsletter-section" aria-label="Confirmer les nouveaux abonnements"><h3>Choisir mes abonnements</h3><p>Les choix ci-dessous seront ajoutés à vos abonnements. Vos autres stations et réglages sont conservés.</p>
        <NewsletterIntentForm key={JSON.stringify(pending)} initial={pending} submitLabel="Enregistrer mes abonnements" onCancel={() => void action(clearPending)} onSave={async intent => {
          await memberRequest("/newsletter/apply", { intent }, true);
          await clearPending(); await load(); setRevision(old => old + 1); setNotice("Vos abonnements sont enregistrés. Vous pouvez les modifier ci-dessous.");
        }} />
      </section>}
      {available && !pending ? <>
        <section className="newsletter-section"><h3>Articles et guides, toutes destinations</h3>
          <label className="preference-toggle"><span>Recevoir les nouveaux articles et guides Snow Explorer</span><input type="checkbox" checked={articles} disabled={busy} onChange={event => setArticles(event.target.checked)} /></label>
          <label className="newsletter-field">Fréquence<select value={frequency} disabled={busy} onChange={event => setFrequency(event.target.value as NewsletterFrequency)}><option value="immediate">À chaque publication</option><option value="weekly">Chaque semaine</option><option value="monthly">Chaque mois</option></select></label>
          <button className="btn btn--primary" disabled={busy} onClick={() => void action(async () => { await memberRequest("/newsletter/preferences", { articles, newsletter_frequency: frequency }, true); setNotice("Préférences des articles enregistrées."); })}>Enregistrer</button>
        </section>
        <StationNewsletterEditor key={revision} api={api} />
        <details className="newsletter-section"><summary>Me désabonner de tous les emails</summary><p>Cette action désactive tous vos abonnements Snow Explorer.</p><button className="btn btn--secondary" disabled={busy} onClick={() => void action(async () => { await memberRequest("/newsletter/unsubscribe", {}, true); setAccess({ status: "unsubscribed" }); setNotice("Vous êtes désabonné de tous les emails."); })}>Confirmer le désabonnement</button></details>
      </> : !pending && <>
        <p>{access.status === "unsubscribed" ? "Vous êtes désabonné. Vous pouvez choisir de nouveaux abonnements." : "Commencez par choisir vos informations et vos stations."}</p>
        <p>En enregistrant vos choix, vous demandez à recevoir ces informations par email. Désinscription à tout moment.</p>
        <NewsletterIntentForm initial={{ stations: [], articles: true, consent: true, language: "fr", source: "member-account" }} onSave={async intent => { await memberRequest("/newsletter/apply", { intent }, true); await load(); setRevision(old => old + 1); setNotice("Vos abonnements sont enregistrés."); }} />
      </>}
    </>}
  </section>;
}
