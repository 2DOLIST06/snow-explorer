import styles from "./StationNewsletterEditor.module.css";
import { useState } from "react";
import { useRouter } from "next/router";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { memberRequest } from "@/lib/memberApi";
import { newsletterLanguage } from "@/lib/newsletter/i18n";
import { accountNewsletterHref, newsletterTopics } from "@/lib/newsletter/onboarding";
import type { NewsletterPreferenceKey } from "@/types/newsletter";

export default function FollowStationButton({ stationId, stationName, topic = "resort_updates", label }: { stationId: string | number; stationName: string; topic?: NewsletterPreferenceKey; label?: string }) {
  const router = useRouter(); const { status, user, stageNewsletterIntent, openNewsletterAccount } = useMemberAuth();
  const language = newsletterLanguage(router); const fr = language === "fr";
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  async function follow() {
    if (busy || notice) return;
    setBusy(true); setError("");
    try {
      if (status === "authenticated" && user) {
        const result = await memberRequest<{ already_followed: boolean }>("/newsletter/follow", { station_id: stationId, topic, language }, true);
        stageNewsletterIntent(null, user.email);
        const topicLabel = topic === "weather" ? (fr ? "Météo et enneigement" : "Weather and snow conditions") : newsletterTopics.find(item => item.key === topic)?.[fr ? "fr" : "en"] || topic;
        const notice = result.already_followed
          ? (fr ? `${stationName} : vous recevez déjà ces informations.` : `You already follow these updates for ${stationName}.`)
          : (fr ? `Abonnement « ${topicLabel} » ajouté pour ${stationName}.` : `${topicLabel} subscription added for ${stationName}.`);
        setNotice(notice);
      } else {
        openNewsletterAccount(null);
        await router.push(accountNewsletterHref(stationId, stationName, topic));
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : (fr ? "Ajout impossible. Réessayez." : "Unable to add. Please try again.")); }
    finally { setBusy(false); }
  }
  return <div><button type="button" className="btn btn--secondary" disabled={status === "loading" || busy || Boolean(notice)} onClick={() => void follow()}>{busy ? (fr ? "Ajout en cours…" : "Adding…") : label || (fr ? "Recevoir les actualités de cette station par email" : "Get resort updates by email")}</button>{error && <p role="alert">{error}</p>}{notice && <p role="status" className={styles.followSuccess}>{notice}</p>}</div>;
}
