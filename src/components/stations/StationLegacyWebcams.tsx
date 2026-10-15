import { parseCoordinate } from "@/lib/stationAutomaticData";
import { selectWebcams, formatCapture } from "../../lib/stationWebcams";
import React, { useEffect, useRef, useState } from "react";

type HeadingLevel = "h2" | "h3";
type Webcam = { id: string; title: string; preview: string; location?: string; capturedAt: number | null };
export const WebcamsAuto: React.FC<{ name: string; lat?: number | null; lon?: number | null; headingLevel?: HeadingLevel }> = ({
  name, lat, lon, headingLevel = "h2",
}) => {
  const [cams, setCams] = useState<Webcam[]>([]);
  const [failed, setFailed] = useState<string[]>([]);
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const Heading = headingLevel;

  useEffect(() => {
    const controller = new AbortController();
    setOpen(false);
    setCams([]);
    setFailed([]);
    setActiveId(null);
    setLoading(true);
    setErr(false);
    (async () => {
      try {
        const usedLat = parseCoordinate(lat, 90), usedLon = parseCoordinate(lon, 180);
        if (usedLat === null || usedLon === null) throw new Error("Coordonnées indisponibles");
        const response = await fetch(`/api/webcams?lat=${usedLat}&lon=${usedLon}&radiusKm=30`, {
          headers: { accept: "application/json" }, cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Webcams indisponibles");
        const data = await response.json();
        if (!controller.signal.aborted) setCams(selectWebcams(data.webcams, name, usedLat, usedLon));
      } catch {
        if (!controller.signal.aborted) setErr(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    // Renew expiring Windy image URLs; never persist them in browser storage.
    const renewal = window.setInterval(() => setRetry(value => value + 1), 4 * 60 * 1000);
    return () => { controller.abort(); window.clearInterval(renewal); };
  }, [name, lat, lon, retry]);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement;
    dialog.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; opener.current?.focus(); };
  }, [open]);

  const valid = cams.filter(cam => !failed.includes(cam.id));
  const active = valid.find(cam => cam.id === activeId);
  const unavailable = (id: string) => setFailed(previous => previous.includes(id) ? previous : [...previous, id]);
  const metadata = (cam: Webcam) => <span className="webcam-meta">
    <strong>{cam.title || "Webcam"}</strong>
    {cam.location && <span>{cam.location}</span>}
    {cam.capturedAt && <time dateTime={new Date(cam.capturedAt).toISOString()}>Dernière image : {formatCapture(cam.capturedAt)} (Paris)</time>}
  </span>;
  const card = (cam: Webcam) => <button type="button" className="webcam-card" key={cam.id}
    onClick={() => { setActiveId(cam.id); setOpen(true); }} aria-label={`Agrandir ${cam.title}`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={cam.preview} alt={cam.title} loading="lazy" onError={() => unavailable(cam.id)} />
    {metadata(cam)}
  </button>;

  return <section className="station-webcams" aria-busy={loading}>
    <Heading style={{ margin: "0 0 8px", fontSize: 16 }}>Webcams</Heading>
    {loading && <p role="status">Chargement des webcams…</p>}
    {!loading && err && <p role="status">Webcams indisponibles. <button type="button" onClick={() => setRetry(value => value + 1)}>Réessayer</button></p>}
    {!loading && !err && !valid.length && <p role="status">{cams.length ? "Images des webcams indisponibles." : "Aucune webcam identifiée pour cette station."}</p>}
    {!loading && !err && valid.length > 0 && <>
      <div className="webcam-grid">{valid.slice(0, 4).map(card)}</div>
      {valid.length > 4 && <button type="button" className="webcam-more" onClick={() => { setActiveId(null); setOpen(true); }}>Voir plus de webcams</button>}
    </>}
    <p className="webcam-source">Images : <a href="https://www.windy.com/webcams" target="_blank" rel="noopener noreferrer">Windy.com</a></p>
    {open && <div className="webcam-overlay" onClick={() => setOpen(false)}>
      <div className="webcam-dialog" ref={dialog} role="dialog" aria-modal="true" aria-label={`Webcams de ${name}`} tabIndex={-1}
        onClick={event => event.stopPropagation()} onKeyDown={event => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "Tab") {
            const buttons = dialog.current?.querySelectorAll<HTMLElement>('button, a[href]');
            if (!buttons?.length) return;
            const first = buttons[0], last = buttons[buttons.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }
        }}>
        <button type="button" className="webcam-more" onClick={() => setOpen(false)}>Fermer</button>
        {active && <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="webcam-large" src={active.preview} alt={active.title} onError={() => unavailable(active.id)} />
          <figcaption>{metadata(active)}</figcaption>
        </figure>}
        <div className="webcam-grid">{valid.map(card)}</div>
        <p className="webcam-source">Images : <a href="https://www.windy.com/webcams">Windy.com</a></p>
      </div>
    </div>}
    <style jsx>{`
      .station-webcams { width:100%; padding:12px; border:1px solid #cbd5e1; border-radius:12px; background:#fff; color:#374151; }
      .webcam-grid { display:grid; grid-template-columns:1fr; gap:12px; }
      .webcam-card { min-width:0; padding:0; text-align:left; border:1px solid #cbd5e1; border-radius:10px; overflow:hidden; background:#fff; color:inherit; cursor:pointer; }
      .webcam-card img { display:block; width:100%; aspect-ratio:16/10; object-fit:cover; }
      .webcam-meta { display:flex; flex-direction:column; gap:4px; padding:10px; font-size:13px; }
      .webcam-meta time { font-size:12px; }
      .webcam-more { margin:12px 0; padding:10px 16px; border:1px solid #2563eb; border-radius:8px; background:#fff; color:#1d4ed8; font-weight:600; cursor:pointer; }
      .webcam-source { font-size:12px; margin:10px 0 0; }
      .webcam-overlay { position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; padding:12px; }
      .webcam-dialog { width:min(1100px,96vw); max-height:92vh; overflow:auto; background:#fff; border-radius:12px; padding:12px; }
      .webcam-large { display:block; width:100%; max-height:62vh; object-fit:contain; }
      figure { margin:0 0 12px; }
      @media(min-width:640px) { .webcam-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      @media(min-width:1024px) { .webcam-grid { grid-template-columns:repeat(4,minmax(0,1fr)); } }
    `}</style>
  </section>;
};
