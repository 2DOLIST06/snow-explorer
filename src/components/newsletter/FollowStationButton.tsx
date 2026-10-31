import { useState } from "react";
import { useRouter } from "next/router";
import Modal from "@/components/ui/Modal";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { newsletterLanguage } from "@/lib/newsletter/i18n";
import { accountNewsletterHref, newsletterTopics, stationIntent } from "@/lib/newsletter/onboarding";
import type { NewsletterPreferenceKey } from "@/types/newsletter";
import NewsletterEnrollment from "./NewsletterEnrollment";

export default function FollowStationButton({ stationId, stationName, topic = "resort_updates", label }: { stationId: string | number; stationName: string; topic?: NewsletterPreferenceKey; label?: string }) {
  const router = useRouter(); const { status } = useMemberAuth(); const language = newsletterLanguage(router); const fr = language === "fr";
  const [open, setOpen] = useState(false);
  const title = fr ? `Suivre ${stationName} par email` : `Follow ${stationName} by email`;
  const topicLabel = newsletterTopics.find(item => item.key === topic);
  return <><button type="button" className="btn btn--secondary" disabled={status === "loading"} onClick={() => { if (status === "authenticated") void router.push(accountNewsletterHref(stationId, stationName, topic)); else setOpen(true); }}>{label || (fr ? "Recevoir les nouvelles de cette station" : "Get resort updates by email")}</button>
    <Modal open={open} onClose={() => setOpen(false)} ariaLabel={title}><div className="newsletter-modal">
      <button type="button" className="newsletter-modal__close" onClick={() => setOpen(false)} aria-label={fr ? "Fermer" : "Close"}>×</button>
      <h2>{title}</h2><p>{fr ? "Votre sélection : " : "Your selection: "}{fr ? topicLabel?.fr : topicLabel?.en}</p>
      {open && <NewsletterEnrollment key={`${stationId}-${topic}`} initial={{ stations: [stationIntent(stationId, stationName, topic)], consent: false, language, source: "station_page" }} />}
    </div></Modal>
  </>;
}
