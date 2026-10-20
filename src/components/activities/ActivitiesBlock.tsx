import { useEffect, useRef, useState } from "react";
import { useCookiePreferences } from "@/contexts/CookiePreferencesContext";
import { activeActivityItems, cleanActivityHtml, widgetDocument } from "@/lib/activities";
import type { ActivitiesBlock as Block, ActivityItem } from "@/types/activities";

function AffiliateWidget({ item }: { item: Extract<ActivityItem, { type: "embed" }> }) {
  const { ready, preferences } = useCookiePreferences();
  const allowed = ready && preferences.externalContent;
  const [doc, setDoc] = useState("");
  const [height, setHeight] = useState(350);
  const [error, setError] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (!allowed) { setDoc(""); return; }
    setError(false);
    const token = crypto.randomUUID();
    setDoc(widgetDocument(item, crypto.randomUUID(), token));
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.token !== token) return;
      if (event.data.kind === "error") setError(true);
      if (event.data.kind === "size" && Number.isFinite(event.data.height)) setHeight(Math.max(120, Math.min(1600, event.data.height + 8)));
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [allowed, item]);
  if (!allowed) return null;
  return <div className="activity-widget">
    {doc && <iframe ref={frame} title="Activité proposée par un partenaire" srcDoc={doc} sandbox="allow-scripts allow-popups" referrerPolicy="no-referrer" style={{ width: "100%", height, border: 0 }} />}
    {error && <p role="status">Le partenaire n’a pas pu charger tout le contenu. Réessayez en rechargeant la page.</p>}
  </div>;
}

export default function ActivitiesBlock({ block }: { block?: Block | null }) {
  const { ready, preferences } = useCookiePreferences();
  const items = activeActivityItems(block).filter(item => item.type !== "embed" || (ready && preferences.externalContent));
  if (!items.length || !block) return null;
  return <section className="v3-floor activities-block" aria-labelledby="activities-heading">
    <header className="v3-section-heading"><p>À découvrir</p><h2 id="activities-heading">{block.title || "Activités à faire"}</h2></header>
    <div className="activity-items">{items.map(item => <div key={item.id} className="activity-item">{item.type === "image" ? <a href={item.href} target={item.newTab ? "_blank" : undefined} rel="sponsored noopener noreferrer"><img src={item.src} alt={item.alt} loading="lazy" /></a> : item.type === "rich" ? <div dangerouslySetInnerHTML={{ __html: cleanActivityHtml(item.html) }} /> : <AffiliateWidget item={item} />}</div>)}</div>
  </section>;
}
