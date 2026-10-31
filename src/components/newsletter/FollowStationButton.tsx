import { useState } from "react";
import { useRouter } from "next/router";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { memberRequest } from "@/lib/memberApi";
import { newsletterLanguage } from "@/lib/newsletter/i18n";
import { accountNewsletterHref, newsletterTopics, stationIntent } from "@/lib/newsletter/onboarding";
import type { NewsletterPreferenceKey } from "@/types/newsletter";

export default function FollowStationButton({ stationId, stationName, topic = "resort_updates", label }: { stationId: string | number; stationName: string; topic?: NewsletterPreferenceKey; label?: string }) {
  const router = useRouter(); const { status, user, stageNewsletterIntent, openNewsletterAccount } = useMemberAuth();
  const language = newsletterLanguage(router); const fr = language === "fr";
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function follow() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (status === "authenticated" && user) {
        const result = await memberRequest<{ already_followed: boolean }>("/newsletter/follow", { station_id: stationId, topic, language }, true);
        stageNewsletterIntent(null, user.email);
        const topicLabel = newsletterTopics.find(item => item.key === topic)?.[fr ? "fr" : "en"] || topic;
        const notice = result.already_followed
          ? (fr ? `${stationName} : vous recevez déjà ces informations.` : `You already follow these updates for ${stationName}.`)
          : (fr ? `Abonnement « ${topicLabel} » ajouté pour ${stationName}.` : `${topicLabel} subscription added for ${stationName}.`);
        openNewsletterAccount({ email: user.email, intent: { stations: [stationIntent(stationId, stationName, topic)], consent: true, language, source: "station_page" }, draftToken: null, status: "active", notice, expiresAt: Date.now() + 15 * 60 * 1000 });
      } else openNewsletterAccount(null);
      await router.push(accountNewsletterHref(stationId, stationName, topic));
    } catch (cause) { setError(cause instanceof Error ? cause.message : (fr ? "Ajout impossible. Réessayez." : "Unable to add. Please try again.")); }
    finally { setBusy(false); }
  }
  return <div><button type="button" className="btn btn--secondary" disabled={status === "loading" || busy} onClick={() => void follow()}>{busy ? (fr ? "Ajout en cours…" : "Adding…") : label || (fr ? "Recevoir les informations de cette station par email" : "Get resort updates by email")}</button>{error && <p role="alert">{error}</p>}</div>;
}
