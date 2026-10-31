import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { memberRequest } from "@/lib/memberApi";
import { type NewsletterAccountEntry, useMemberAuth } from "@/contexts/MemberAuthContext";
import { intentFromQuery, mergeNewsletterChoice, type NewsletterIntent } from "@/lib/newsletter/onboarding";
import NewsletterIntentForm from "../newsletter/NewsletterIntentForm";
import styles from "../newsletter/StationNewsletterEditor.module.css";

type Settings = { status: string; intent: NewsletterIntent };
export default function MemberNewsletter({ signup }: { signup?: NewsletterAccountEntry } = {}) {
  const router = useRouter(); const { user, newsletterIntent, stageNewsletterIntent, openNewsletterAccount } = useMemberAuth();
  const [confirmUnsubscribe, setConfirmUnsubscribe] = useState(false);
  const [reactivating, setReactivating] = useState(false); const [formBusy, setFormBusy] = useState(false);
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
    setReactivating(false); setNotice("Vos abonnements sont enregistrés.");
  }
  async function unsubscribe() {
    if (busy || formBusy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await memberRequest("/newsletter/unsubscribe", {}, true);
      setSettings(old => old ? { ...old, status: "unsubscribed" } : old);
      setPending(null); stageNewsletterIntent(null, user?.email || ""); openNewsletterAccount(null);
      setConfirmUnsubscribe(false); setReactivating(false); setRevision(old => old + 1);
      if (queryIntent) void router.replace("/mon-compte", undefined, { shallow: true }).catch(() => {});
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Désabonnement impossible. Réessayez."); }
    finally { setBusy(false); }
  }
  const unsubscribed = settings?.status === "unsubscribed";
  return <section className="newsletter-section"><header className={styles.accountHeading}><h2>Mes abonnements</h2>
    <p>Choisissez ce que vous souhaitez recevoir par email. Tous vos choix se règlent ici.</p></header>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!settings || !initial ? <p role="status">Chargement…</p> : blocked ? <p>Cet abonnement est indisponible. Contactez-nous pour le vérifier.</p> : <>
      {unsubscribed && <div className="newsletter-unsubscribed"><p role="status"><strong>Vous êtes désabonné de tous les emails.</strong></p><p>Vos préférences sont conservées.</p>{!reactivating && <button type="button" className="btn btn--secondary" onClick={() => setReactivating(true)}>Réactiver mes abonnements</button>}</div>}
      {(!unsubscribed || reactivating) && <>
        {reactivating && <p>Vérifiez vos choix, puis enregistrez pour réactiver vos abonnements.</p>}
        <NewsletterIntentForm key={revision} initial={initial} onSave={save} disabled={busy || confirmUnsubscribe} onSavingChange={setFormBusy} />
      </>}
      {!signup && !unsubscribed && <div className="newsletter-unsubscribe">
        {!confirmUnsubscribe ? <button type="button" className="newsletter-change-email" disabled={busy || formBusy} onClick={() => { setError(""); setNotice(""); setConfirmUnsubscribe(true); }}>Me désabonner de tous les emails</button> : <div role="alertdialog" aria-labelledby="unsubscribe-title" aria-describedby="unsubscribe-description">
          <h3 id="unsubscribe-title">Arrêter tous les emails Snow Explorer ?</h3><p id="unsubscribe-description">Vous ne recevrez plus aucun email de newsletter. Vos préférences seront conservées.</p>
          <div className="newsletter-confirm"><button type="button" className="btn btn--primary" autoFocus disabled={busy} onClick={() => void unsubscribe()}>{busy ? "Désabonnement…" : "Confirmer le désabonnement"}</button><button type="button" className="btn btn--secondary" disabled={busy} onClick={() => setConfirmUnsubscribe(false)}>Annuler</button></div>
        </div>}
      </div>}
    </>}
  </section>;
}
