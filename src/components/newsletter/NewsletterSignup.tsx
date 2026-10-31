import { useRouter } from "next/router";
import { newsletterLanguage } from "@/lib/newsletter/i18n";
import type { NewsletterSource } from "@/types/newsletter";
import NewsletterEnrollment from "./NewsletterEnrollment";

export default function NewsletterSignup({ source = "page", compact = false }: { source?: NewsletterSource; compact?: boolean }) {
  const router = useRouter(); const language = newsletterLanguage(router); const fr = language === "fr";
  return <section className={`newsletter-signup${compact ? " newsletter-signup--compact" : ""}`} aria-labelledby={`newsletter-title-${source}`}>
    <div><h2 id={`newsletter-title-${source}`}>{fr ? "Gardez un œil sur vos stations préférées" : "Keep up with your favourite resorts"}</h2><p>{fr ? "Inscrivez-vous aux articles et guides Snow Explorer. Vous pourrez ensuite choisir vos stations et les informations qui vous intéressent." : "Sign up for Snow Explorer articles and guides, then choose your resorts and updates."}</p></div>
    <NewsletterEnrollment initial={{ stations: [], articles: true, consent: false, language, source }} />
  </section>;
}
