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
      <div className="cookie-panel-heading"><h2 id="cookie-panel-title">{settings ? "Mes préférences cookies" : "Cookies et contenus partenaires"}</h2>{settings && <button type="button" onClick={onClose} aria-label="Fermer les préférences cookies">×</button>}</div>
      <p id="cookie-panel-description">Les contenus partenaires, dont GetYourGuide, sont affichés directement et peuvent utiliser des traceurs. Vous pouvez les désactiver. La mesure des conversions sur le site reste désactivée jusqu’à votre accord.</p>
      <p><a href="/cookies">Consulter la politique relative aux cookies</a>. Vous pouvez modifier votre choix à tout moment avec « Gérer mes cookies » en bas de page.</p>
      {settings && <div className="cookie-categories">
        <label><input type="checkbox" checked disabled /><span><strong>Fonctionnement nécessaire</strong><small>Préférences cookies et sécurité de l’administration. Toujours actif.</small></span></label>
        <label><input type="checkbox" checked={draft.externalContent} onChange={e => setDraft({ ...draft, externalContent: e.target.checked })} /><span><strong>Contenus partenaires</strong><small>Widgets d’activités, dont GetYourGuide. Désactiver retire les intégrations de la page.</small></span></label>
        <label><input type="checkbox" checked={draft.analytics} onChange={e => setDraft({ ...draft, analytics: e.target.checked })} /><span><strong>Mesure des conversions GetYourGuide</strong><small>Permet au partenaire de mesurer les conversions. Un retrait de cet accord recharge la page.</small></span></label>
      </div>}
      <div className="cookie-panel-actions">
        <button type="button" onClick={() => onSave({ externalContent: false, analytics: false })}>Tout refuser</button>
        <button type="button" onClick={() => onSave({ externalContent: true, analytics: true })}>Tout accepter</button>
        {settings ? <button type="button" className="cookie-primary" onClick={() => onSave(draft)}>Enregistrer mes choix</button> : <button type="button" className="cookie-primary" onClick={onCustomize}>Personnaliser</button>}
      </div>
    </section>
  </div>;
}
