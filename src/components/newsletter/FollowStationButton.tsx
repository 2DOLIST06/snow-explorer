import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import Modal from "@/components/ui/Modal";
import { newsletterApi, NewsletterApiError } from "@/lib/api/newsletter";
import { newsletterLanguage, translator } from "@/lib/newsletter/i18n";
import { NEWSLETTER_CONSENT_TEXT_VERSION } from "@/types/newsletter";

export default function FollowStationButton({ stationId, stationName }: { stationId: string | number; stationName: string }) {
  const router = useRouter(); const language = newsletterLanguage(router); const t = translator(language);
  const [open, setOpen] = useState(false); const [email, setEmail] = useState(""); const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); if (!consent) return setError(t("consentRequired")); setBusy(true); try { await newsletterApi.subscribe({ email, language, source: "station_page", consent, consentTextVersion: NEWSLETTER_CONSENT_TEXT_VERSION, station_id: stationId }); setSuccess(true); } catch (e) { setError(e instanceof NewsletterApiError && e.code === "network" ? t("networkError") : t("genericError")); } finally { setBusy(false); } };
  return <><button type="button" className="btn btn--secondary" onClick={() => setOpen(true)}>♡ {t("follow")}</button><Modal open={open} onClose={() => setOpen(false)} ariaLabel={t("followTitle", { station: stationName })}>
    <div className="newsletter-modal"><button className="newsletter-modal__close" onClick={() => setOpen(false)} aria-label={t("close")}>×</button><h2>{t("followTitle", { station: stationName })}</h2><p>{t("followText")}</p>
    {success ? <div className="newsletter-feedback newsletter-feedback--success"><p>{t("followSuccess")}</p></div> : <form onSubmit={submit} className="newsletter-stack"><label><span>{t("email")}</span><input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label><label className="newsletter-check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>{t("consent")}</span></label>{error && <p role="alert" className="newsletter-feedback newsletter-feedback--error">{error}</p>}<button className="btn btn--primary" disabled={busy}>{busy ? t("saving") : t("follow")}</button></form>}
    </div></Modal></>;
}
