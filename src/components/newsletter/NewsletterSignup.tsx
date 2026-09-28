import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import { newsletterApi, NewsletterApiError } from "@/lib/api/newsletter";
import { newsletterLanguage, translator } from "@/lib/newsletter/i18n";
import type { NewsletterSource } from "@/types/newsletter";

export default function NewsletterSignup({ source = "page", compact = false }: { source?: NewsletterSource; compact?: boolean }) {
  const router = useRouter(); const language = newsletterLanguage(router); const t = translator(language);
  const [email, setEmail] = useState(""); const [consent, setConsent] = useState(false); const [state, setState] = useState<"idle" | "loading" | "success">("idle"); const [error, setError] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); if (!consent) return setError(t("consentRequired")); setState("loading"); try { await newsletterApi.subscribe({ email, language, source, consent }); setState("success"); } catch (e) { setState("idle"); setError(e instanceof NewsletterApiError && e.code === "network" ? t("networkError") : t("genericError")); } };
  return <section className={`newsletter-signup${compact ? " newsletter-signup--compact" : ""}`} aria-labelledby={`newsletter-title-${source}`}>
    <div><h2 id={`newsletter-title-${source}`}>{t("signupTitle")}</h2><p>{t("signupText")}</p></div>
    {state === "success" ? <p className="newsletter-feedback newsletter-feedback--success" role="status">{t("signupSuccess")}</p> : <form onSubmit={submit} className="newsletter-signup__form">
      <label><span>{t("email")}</span><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="newsletter-check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>{t("consent")}</span></label>
      {error && <p className="newsletter-feedback newsletter-feedback--error" role="alert">{error}</p>}
      <button className="btn btn--primary" disabled={state === "loading"}>{state === "loading" ? t("saving") : t("signup")}</button>
    </form>}
  </section>;
}
