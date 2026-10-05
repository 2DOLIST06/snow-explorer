import React, { useEffect, useState } from "react";
import { getOfficialMapPresentation, normalizeOfficialMapUrl } from "@/lib/officialMap";

const PANEL_HEIGHT = 420;
const textOrEmpty = (v?: string | null) => (v && v.trim() ? v.trim() : "");

const GenericOfficialMap: React.FC<{ name: string; officialMapUrl: string }> = ({ name, officialMapUrl }) => {
  const [open, setOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setMaximized(false);
  };

  return (
    <>
      <figure
        style={{
          position: "relative",
          margin: 0,
          border: "1px solid #cbd5e1",
          borderRadius: 12,
          overflow: "hidden",
          background: "#f8fafc",
          height: PANEL_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Voir le plan des pistes de ${name}`}
          style={{ border: 0, borderRadius: 999, padding: "13px 22px", background: "#0369a1", color: "#fff", boxShadow: "0 6px 18px rgba(3,105,161,0.25)", cursor: "pointer", fontSize: 15, fontWeight: 800 }}
        >
          Voir le plan des pistes
        </button>
      </figure>

      {open && (
        <div onClick={close} role="presentation" style={{ position: "fixed", inset: 0, padding: maximized ? 4 : 12, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="official-map-modal-title"
            onClick={(event) => event.stopPropagation()}
            style={{ width: maximized ? "calc(100vw - 8px)" : "min(1200px, calc(100vw - 24px))", height: maximized ? "calc(100vh - 8px)" : "min(820px, calc(100vh - 24px))", maxWidth: "100vw", maxHeight: "100vh", background: "#fff", borderRadius: maximized ? 6 : 12, overflow: "hidden", display: "flex", flexDirection: "column" }}
          >
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, minHeight: 52, padding: "8px 10px 8px 14px", borderBottom: "1px solid #d1d5db", background: "#fff" }}>
              <strong id="official-map-modal-title" style={{ flex: "1 1 150px", color: "#0f172a" }}>Plan des pistes</strong>
              <button type="button" onClick={() => setMaximized((value) => !value)} aria-pressed={maximized} style={{ border: "1px solid #94a3b8", borderRadius: 8, padding: "8px 12px", background: "#f8fafc", color: "#0f172a", cursor: "pointer", fontWeight: 700 }}>
                {maximized ? "Réduire" : "Agrandir"}
              </button>
              <button type="button" onClick={close} aria-label="Fermer le plan des pistes" style={{ width: 38, height: 38, flex: "0 0 38px", borderRadius: "50%", border: "1px solid #94a3b8", background: "#fff", color: "#0f172a", fontSize: 24, lineHeight: 1, cursor: "pointer", fontWeight: 700 }}>×</button>
            </div>
            <div style={{ flex: "1 1 auto", minHeight: 0, minWidth: 0, overflow: "hidden", background: "#fff" }}>
              <iframe src={officialMapUrl} title="Plan officiel des pistes" referrerPolicy="strict-origin-when-cross-origin" style={{ display: "block", width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", border: 0 }} />
            </div>
            <div style={{ flex: "0 0 auto", padding: "9px 14px", borderTop: "1px solid #d1d5db", fontSize: 13 }}>
              <a href={officialMapUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#0369a1", fontWeight: 700 }}>Ouvrir le plan officiel <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const PlanPistesFigure: React.FC<{ name: string; small?: string | null; large?: string | null; officialUrl?: string | null; caption?: string | null; headingLevel?: "h2" | "h3" }> = ({
  name,
  small,
  large,
  officialUrl,
  caption,
  headingLevel = "h2",
}) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  const src = textOrEmpty(small) || textOrEmpty(large);
  const officialMapUrl = normalizeOfficialMapUrl(officialUrl);
  if (!src && !officialMapUrl) return null;
  const big = textOrEmpty(large) || (small as string);
  const Heading = headingLevel;

  if (!src) {
    const officialMap = getOfficialMapPresentation(officialMapUrl);
    if (!officialMap) return null;

    if (officialMap.provider === "generic") {
      return <GenericOfficialMap name={name} officialMapUrl={officialMap.sourceUrl} />;
    }

    const iframeTitle = `Plan des pistes officiel de ${name}`;
    const iframeProps = {
      src: officialMap.embedUrl,
      title: iframeTitle,
      referrerPolicy: "strict-origin-when-cross-origin" as const,
      allow: officialMap.provider === "calameo" ? "fullscreen" : undefined,
      allowFullScreen: officialMap.provider === "calameo",
    };

    return (
      <>
        <figure
          style={{
            position: "relative",
            margin: 0,
            border: "1px solid #cbd5e1",
            borderRadius: 12,
            overflow: "hidden",
            background: "#f8fafc",
            height: PANEL_HEIGHT,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <iframe
            {...iframeProps}
            loading="lazy"
            style={{ width: "100%", flex: 1, border: 0, background: "#fff" }}
          />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Agrandir le plan des pistes de ${name}`}
            style={{ position: "absolute", top: 10, right: 10, border: "1px solid #cbd5e1", borderRadius: 999, padding: "8px 12px", background: "rgba(255,255,255,0.96)", boxShadow: "0 4px 14px rgba(15,23,42,0.15)", cursor: "zoom-in", fontWeight: 700 }}
          >
            Agrandir le plan
          </button>
          <figcaption style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 10, fontSize: 13, color: "#4b5563", borderTop: "1px solid #d1d5db" }}>
            <span>{caption || "Plan officiel"}</span>
            <a href={officialMap.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#0369a1", fontWeight: 700, whiteSpace: "nowrap" }}>
              Ouvrir la source <span aria-hidden="true">↗</span>
            </a>
          </figcaption>
        </figure>

        {open && (
          <div onClick={() => setOpen(false)} role="presentation" style={{ position: "fixed", inset: 0, padding: 12, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div role="dialog" aria-modal="true" aria-label={iframeTitle} onClick={(event) => event.stopPropagation()} style={{ position: "relative", width: "min(1200px, 96vw)", height: "min(820px, 90vh)", background: "#fff", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" style={{ position: "absolute", zIndex: 1, top: 8, right: 8, width: 36, height: 36, borderRadius: "50%", border: "1px solid #cbd5e1", background: "#fff", fontSize: 20, cursor: "pointer" }}>×</button>
              <iframe {...iframeProps} style={{ width: "100%", flex: 1, border: 0, background: "#fff" }} />
              <div style={{ padding: "9px 14px", borderTop: "1px solid #d1d5db", fontSize: 13 }}>
                Si le lecteur ne s’affiche pas, <a href={officialMap.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#0369a1", fontWeight: 700 }}>ouvrir le plan officiel <span aria-hidden="true">↗</span></a>.
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <figure
        style={{
          margin: 0,
          border: "1px solid #cbd5e1",
          borderRadius: 12,
          overflow: "hidden",
          background: "#fff",
          height: PANEL_HEIGHT,
          display: "flex",
          flexDirection: "column",
          padding: 12,
        }}
      >
        <Heading style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#111827" }}>
          Plan des pistes
        </Heading>
        <button type="button" onClick={() => setOpen(true)} aria-label={`Agrandir le plan des pistes de ${name}`} style={{ all: "unset", cursor: "zoom-in", display: "block", flex: 1, minHeight: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`Plan des pistes de ${name}`} style={{ display: "block", width: "100%", height: "100%", objectFit: "contain", background: "#fff" }} />
        </button>
        {caption ? (
          <figcaption
            style={{ padding: 10, fontSize: 13, color: "#4b5563", borderTop: "1px solid #d1d5db" }}
          >
            {caption}
          </figcaption>
        ) : null}
      </figure>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "96vw",
              maxHeight: "90vh",
              background: "#fff",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "1px solid #cbd5e1",
                background: "#fff",
                fontSize: 18,
                lineHeight: "30px",
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={big}
              alt={`Plan des pistes de ${name}`}
              style={{ maxWidth: "96vw", maxHeight: "86vh", objectFit: "contain", borderRadius: 8 }}
            />
            {caption ? <p style={{ marginTop: 8, fontSize: 13, color: "#4b5563" }}>{caption}</p> : null}
          </div>
        </div>
      )}
    </>
  );
};
