import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { memberRequest } from "@/lib/memberApi";
import { type NewsletterAccountEntry, useMemberAuth } from "@/contexts/MemberAuthContext";
import { intentFromQuery, mergeNewsletterChoice, type NewsletterIntent } from "@/lib/newsletter/onboarding";
import NewsletterIntentForm from "../newsletter/NewsletterIntentForm";

type Settings = { status: string; intent: NewsletterIntent };
export default function MemberNewsletter({ signup }: { signup?: NewsletterAccountEntry } = {}) {
  const router = useRouter(); const { user, newsletterIntent, stageNewsletterIntent, openNewsletterAccount } = useMemberAuth();
  const [revision, setRevision] = useState(0);
  const [settings, setSettings] = useState<Settings | null>(null); const [pending, setPending] = useState<NewsletterIntent | null>(null);
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { if (signup) { setSettings({ status: "active", intent: signup.intent }); return; } const value = await memberRequest<{ data: Settings }>("/newsletter/settings"); setSettings(value.data); }, [signup]);
  useEffect(() => { void load().catch(() => setError("Impossible de charger les abonnements. Réessayez.")); }, [load]);
  const proposalKey = useRef<string | null>(null);
  const queryIntent = useMemo(() => intentFromQuery(router.query), [router.query.station_id, router.query.station_name, router.query.topic]);
  useEffect(() => {
    if (signup) return;
    let live = true;
    const proposal = queryIntent || newsletterIntent;
    if (proposal) {
      const key = JSON.stringify(proposal);
      if (proposalKey.current !== key) { proposalKey.current = key; setPending(proposal); setRevision(old => old + 1); }
    } else {
      proposalKey.current = null;
      void memberRequest<{ intent: NewsletterIntent | null }>("/newsletter/request").then(value => {
        if (live) { setPending(value.intent); if (value.intent) { proposalKey.current = JSON.stringify(value.intent); setRevision(old => old + 1); } }
      }).catch(() => {});
    }
    return () => { live = false; };
  }, [queryIntent, newsletterIntent, signup]);
  const initial = useMemo(() => settings ? mergeNewsletterChoice(settings.intent, pending) : null, [settings, pending]);
  const blocked = settings?.status === "bounced" || settings?.status === "complained";
  async function save(intent: NewsletterIntent) {
    if (signup) {
      await memberRequest("/newsletter/draft", { draft_token: signup.draftToken, intent });
      openNewsletterAccount({ ...signup, intent });
      setSettings({ status: "active", intent });
      return;
    }
    const value = await memberRequest<{ data: Settings }>("/newsletter/settings", { intent }, true);
    setSettings(value.data); setPending(null); stageNewsletterIntent(null, user?.email || "");
    if (queryIntent) await router.replace("/mon-compte", undefined, { shallow: true });
    setNotice("Vos abonnements sont enregistrés.");
  }
  return <section className="newsletter-section"><h2>Mes abonnements</h2>
    <p>Choisissez vos stations et les informations à recevoir, puis enregistrez tous vos choix.</p>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!settings || !initial ? <p role="status">Chargement…</p> : blocked ? <p>Cet abonnement est indisponible. Contactez-nous pour le vérifier.</p> : <>
      {settings.status === "unsubscribed" && <p>Vous êtes désabonné. Enregistrer vos choix réactivera vos abonnements.</p>}
      <NewsletterIntentForm key={revision} initial={initial} focusStationId={pending?.stations[0]?.station_id} onSave={save} />
      {!signup && (settings.status === "active" || settings.status === "pending") && <details className="newsletter-section"><summary>Me désabonner de tous les emails</summary><p>Cette action désactive tous vos abonnements Snow Explorer.</p><button type="button" className="btn btn--secondary" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await memberRequest("/newsletter/unsubscribe", {}, true); await load(); setNotice("Vous êtes désabonné de tous les emails."); } catch { setError("Désabonnement impossible. Réessayez."); } finally { setBusy(false); } }}>Confirmer le désabonnement</button></details>}
    </>}
  </section>;
}
