import { useEffect, useState } from "react";
import { getOfficialMapPresentation } from "@/lib/officialMap";

export default function SkiAreaPisteMap({ name, url }: { name: string; url: string }) {
  const [open, setOpen] = useState(false);
  const map = getOfficialMapPresentation(url);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!map) return null;
  const isCalameo = map.provider === "calameo";
  const title = `Plan des pistes du domaine ${name}`;
  const iframeProps = {
    src: map.embedUrl,
    title,
    referrerPolicy: "strict-origin-when-cross-origin" as const,
    allow: isCalameo ? "fullscreen" : undefined,
    allowFullScreen: isCalameo,
  };

  return (
    <section className="ski-area-map-section">
      <h2>Plan des pistes</h2>
      {isCalameo ? (
        <div className="ski-area-map-viewer">
          <iframe {...iframeProps} loading="lazy" />
          <button type="button" className="ski-area-map-expand" onClick={() => setOpen(true)} aria-label={`Agrandir le plan des pistes de ${name}`}>Agrandir le plan</button>
        </div>
      ) : (
        <div className="ski-area-map-link">
          <button type="button" className="btn btn--primary" onClick={() => setOpen(true)} aria-label={`Voir le plan des pistes de ${name}`}>Voir le plan des pistes</button>
        </div>
      )}

      {open && (
        <div className="ski-area-map-modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div className="ski-area-map-modal" role="dialog" aria-modal="true" aria-label={title} onClick={event => event.stopPropagation()}>
            <button type="button" className="ski-area-map-modal__close" onClick={() => setOpen(false)} aria-label="Fermer le plan des pistes">×</button>
            <iframe {...iframeProps} />
            <p>Si le lecteur ne s’affiche pas, <a href={map.sourceUrl} target="_blank" rel="noopener noreferrer">ouvrir le plan officiel <span aria-hidden="true">↗</span></a>.</p>
          </div>
        </div>
      )}
    </section>
  );
}
