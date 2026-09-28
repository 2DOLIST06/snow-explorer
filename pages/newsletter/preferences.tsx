import Head from "next/head";
import { useRouter } from "next/router";
import NewsletterPreferences from "@/components/newsletter/NewsletterPreferences";
import { newsletterLanguage, translator } from "@/lib/newsletter/i18n";

export default function NewsletterPreferencesPage() {
  const router = useRouter();
  const token = Array.isArray(router.query.token) ? router.query.token[0] : router.query.token;
  const t = translator(newsletterLanguage(router));
  return <><Head><title>{t("preferencesTitle")} | Snow Explorer</title><meta name="robots" content="noindex,nofollow" /></Head>{router.isReady && (token ? <NewsletterPreferences token={token} /> : <main className="newsletter-page"><div className="newsletter-feedback newsletter-feedback--error" role="alert">{t("invalidToken")}</div></main>)}</>;
}
