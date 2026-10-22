import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CookiePreferences } from "@/lib/cookiePreferences";

type Props = { settings: boolean; preferences: CookiePreferences; onSave: (value: CookiePreferences) => void; onCustomize: () => void; onClose: () => void };
export default function CookieBanner({ settings, preferences, onSave, onCustomize, onClose }: Props) {
  const [draft, setDraft] = useState(preferences);
  const root = useRef<HTMLElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    if (!settings) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = root.current;
    const focusable = () => Array.from(panel?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled)') || []);
    focusable()[0]?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key !== "Tab") return;
      const targets = focusable(), first = targets[0], last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("keydown", keyboard); if (previous?.isConnected) previous.focus(); };
  }, [settings]);
  return <div className={settings ? "cookie-settings-backdrop" : "cookie-banner-position"}>
    <section ref={root} className="cookie-panel" role={settings ? "dialog" : "region"} aria-modal={settings ? true : undefined} aria-labelledby="cookie-panel-title" aria-describedby="cookie-panel-description">
      <div className="cookie-panel-heading"><div className="cookie-panel-brand"><Image src="/logo.png" alt="" width={48} height={48} /><h2 id="cookie-panel-title">{settings ? "Mes préférences cookies" : "Cookies Snow Explorer"}</h2></div>{settings && <button type="button" onClick={onClose} aria-label="Fermer les préférences cookies">×</button>}</div>
      <p id="cookie-panel-description">Vos préférences concernent les cookies propres à Snow Explorer. Les cookies nécessaires restent actifs. Aucun cookie facultatif Snow Explorer n’est installé actuellement.</p>
      <p><a href="/cookies">Consulter la politique relative aux cookies</a>. Vous pouvez modifier votre choix à tout moment avec « Gérer mes cookies » en bas de page.</p>
      {settings && <div className="cookie-categories">
        <label><input type="checkbox" checked disabled /><span><strong>Fonctionnement nécessaire</strong><small>Préférences cookies et sécurité de l’administration. Toujours actif.</small></span></label>
        <label><input type="checkbox" checked={draft.optionalCookies} onChange={e => setDraft({ optionalCookies: e.target.checked })} /><span><strong>Cookies facultatifs Snow Explorer</strong><small>Aucun n’est installé actuellement. Votre préférence est mémorisée.</small></span></label>
      </div>}
      <div className="cookie-panel-actions">
        <button type="button" onClick={() => onSave({ optionalCookies: false })}>Tout refuser</button>
        <button type="button" onClick={() => onSave({ optionalCookies: true })}>Tout accepter</button>
        {settings ? <button type="button" className="cookie-primary" onClick={() => onSave(draft)}>Enregistrer mes choix</button> : <button type="button" className="cookie-primary" onClick={onCustomize}>Personnaliser</button>}
      </div>
    </section>
  </div>;
}
