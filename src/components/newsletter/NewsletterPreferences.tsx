import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import NewsletterGeneralSettings from "./NewsletterGeneralSettings";
import StationNewsletterEditor, { StationSettingsApi } from "./StationNewsletterEditor";
import { newsletterApi, NewsletterApiError } from "@/lib/api/newsletter";
import { newsletterLanguage, translator } from "@/lib/newsletter/i18n";

export default function NewsletterPreferences({ token }: { token: string }) {
  const router = useRouter(); const language = newsletterLanguage(router); const t = useMemo(() => translator(language), [language]);
  const [loading, setLoading] = useState(true); const [valid, setValid] = useState(false); const [unsubscribed, setUnsubscribed] = useState(false);
  const [confirmUnsubscribe, setConfirmUnsubscribe] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { if (router.query.action === "unsubscribe") setConfirmUnsubscribe(true); }, [router.query.action]);
  useEffect(() => { let live = true; setLoading(true); setError(""); newsletterApi.preferences(token).then(value => { if (live) { setValid(true); setUnsubscribed(value.unsubscribed || value.status === "unsubscribed"); } }).catch(cause => { if (live) setError(cause instanceof NewsletterApiError && [404, 410].includes(cause.status) ? "invalidToken" : "genericError"); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [token]);
  const api = useMemo<StationSettingsApi>(() => ({ list: () => newsletterApi.stationSettings(token), add: id => newsletterApi.addStationSettings(token, id), save: (id, value) => newsletterApi.saveStationSettings(token, id, value), remove: id => newsletterApi.removeStationSettings(token, id) }), [token]);
  if (loading) return <main className="newsletter-page"><p role="status">{t("loading")}</p></main>;
  return <main className="newsletter-page"><header className="newsletter-hero"><h1>{t("preferencesTitle")}</h1></header>{error && <p role="alert">{t(error === "invalidToken" ? "invalidToken" : "genericError")}</p>}
    {unsubscribed ? <p>{t("unsubscribeDone")}</p> : valid && <><NewsletterGeneralSettings token={token} locale={language} /><StationNewsletterEditor api={api} locale={language} /><section className="newsletter-section newsletter-danger"><h2>{t("unsubscribe")}</h2>{confirmUnsubscribe ? <><p>{t("unsubscribeConfirm")}</p><button className="btn btn--secondary" onClick={() => setConfirmUnsubscribe(false)}>{t("cancel")}</button><button className="btn btn--secondary" disabled={busy} onClick={async () => { setBusy(true); try { await newsletterApi.unsubscribe(token); setUnsubscribed(true); } catch { setError("genericError"); } finally { setBusy(false); } }}>{t("confirm")}</button></> : <button className="btn btn--secondary" onClick={() => setConfirmUnsubscribe(true)}>{t("unsubscribe")}</button>}</section></>}
  </main>;
}
