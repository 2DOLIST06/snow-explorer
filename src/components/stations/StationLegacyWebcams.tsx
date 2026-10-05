import React, { useEffect, useState } from "react";

type HeadingLevel = "h2" | "h3";

const Card: React.FC<React.PropsWithChildren<{ title?: string; style?: React.CSSProperties; headingLevel?: HeadingLevel }>> = ({ title, style, headingLevel = "h2", children }) => {
  const Heading = headingLevel;
  return (
  <section style={{ border: "1px solid #cbd5e1", borderRadius: 12, background: "#fff", padding: 12, ...style }}>
    {title ? <Heading style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#111827" }}>{title}</Heading> : null}
    <div>{children}</div>
  </section>
  );
};

export const WebcamsAuto: React.FC<{ name: string; lat?: number | null; lon?: number | null; headingLevel?: HeadingLevel }> = ({
  name,
  lat,
  lon,
  headingLevel = "h2",
}) => {
  const [cams, setCams] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [showAll, setShowAll] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const usedLat = Number(lat);
        const usedLon = Number(lon);
        if (!Number.isFinite(usedLat) || !Number.isFinite(usedLon)) {
          setErr("Coordonnées indisponibles.");
          setCams([]);
          return;
        }
        const r = await fetch(`/api/webcams?lat=${usedLat}&lon=${usedLon}&radiusKm=30`, {
          headers: { accept: "application/json" },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const list: any[] = Array.isArray(j?.webcams) ? j.webcams : [];

        // tri par distance
        const withDist = list.map((c) => {
          const clat = Number(c?.lat);
          const clon = Number(c?.lon);
          if (Number.isFinite(clat) && Number.isFinite(clon)) {
            const dLat = (clat - usedLat) * (Math.PI / 180);
            const dLon = (clon - usedLon) * (Math.PI / 180);
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos((usedLat * Math.PI) / 180) * Math.cos((clat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
            const cang = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return { ...c, _distKm: 6371 * cang };
          }
          return { ...c, _distKm: Number.POSITIVE_INFINITY };
        });
        withDist.sort((a, b) => (a._distKm || 9e9) - (b._distKm || 9e9));
        const in30 = withDist.filter((c) => Number.isFinite(c._distKm) && c._distKm <= 30);
        setCams(in30);
        setActiveIndex(0);
      } catch (e: any) {
        setErr(e?.message || "Erreur webcams");
        setCams([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [name, lat, lon]);

  const MAX_STRIP = 6;
  const hasActive = cams[activeIndex];
  const activeTitle = hasActive?.title || "Webcam";
  const activePreview = hasActive?.preview || null;

  return (
    <Card title="Webcam" headingLevel={headingLevel} style={{ width: "100%" }}>
      {loading && <div style={{ fontSize: 13, color: "#4b5563" }}>Chargement…</div>}
      {err && !loading && <div style={{ fontSize: 13, color: "#dc2626" }}>Webcams : {err}</div>}
      {!loading && !err && cams.length === 0 && (
        <div style={{ fontSize: 13, color: "#4b5563" }}>Aucune webcam trouvée à proximité.</div>
      )}

      {!loading && !err && cams.length > 0 && (
        <div
          style={{
            position: "relative",
            width: "100%",
            overflow: "hidden",
            borderRadius: 10,
            background: "#cbd5e1",
            border: "1px solid #cbd5e1",
            cursor: "pointer",
          }}
          onClick={() => setOpen(true)}
          aria-label="Voir la webcam en grand"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activePreview} alt={activeTitle} style={{ width: "100%", height: "auto", display: "block" }} />
          <div
            style={{
              position: "absolute",
              right: 8,
              bottom: 8,
              width: 34,
              height: 34,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              lineHeight: "32px",
            }}
          >
            ⤢
          </div>
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 11, color: "#4b5563" }}>Source : Windy Webcams API (attribution requise)</div>

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
              width: "min(1100px,96vw)",
              maxHeight: "92vh",
              background: "#fff",
              borderRadius: 12,
              padding: 12,
              overflow: "auto",
            }}
          >
            <button
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

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{activeTitle}</h3>
              {cams.length > MAX_STRIP && (
                <button
                  onClick={() => setShowAll((v) => !v)}
                  style={{
                    height: 36,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  {showAll ? "Revenir à la galerie" : "Voir plus de webcams"}
                </button>
              )}
            </div>

            <div style={{ border: "1px solid #cbd5e1", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePreview}
                alt={activeTitle}
                style={{ width: "100%", maxHeight: "62vh", objectFit: "contain", display: "block", background: "#fff" }}
              />
            </div>

            {!showAll ? (
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridAutoFlow: "column",
                  gridAutoColumns: "minmax(140px, 1fr)",
                  gap: 10,
                  overflowX: "auto",
                  paddingBottom: 4,
                }}
              >
                {cams.slice(0, MAX_STRIP).map((c: any, idx: number) => {
                  const title = c?.title || "Webcam";
                  const hasImg = Boolean(c?.preview);
                  const isActive = idx === activeIndex;
                  return (
                    <div
                      key={c.id ?? c.webcamId ?? `strip-${idx}`}
                      onClick={() => setActiveIndex(idx)}
                      style={{
                        border: isActive ? "2px solid #2563eb" : "1px solid #cbd5e1",
                        borderRadius: 10,
                        overflow: "hidden",
                        cursor: "pointer",
                        background: "#fff",
                      }}
                      aria-label={`Afficher ${title}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {hasImg ? (
                        <img
                          src={c.preview}
                          alt={title}
                          style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }}
                        />
                      ) : null}
                      <div
                        style={{
                          padding: 8,
                          fontSize: 12,
                          color: "#374151",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {title}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))",
                  gap: 12,
                }}
              >
                {cams.map((c: any, idx: number) => {
                  const title = c?.title || "Webcam";
                  const hasImg = Boolean(c?.preview);
                  return (
                    <div
                      key={`all-${c.id ?? c.webcamId ?? idx}`}
                      onClick={() => {
                        setActiveIndex(idx);
                        setShowAll(false);
                      }}
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 10,
                        overflow: "hidden",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                      aria-label={`Afficher ${title}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {hasImg ? (
                        <img
                          src={c.preview}
                          alt={title}
                          style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
                        />
                      ) : null}
                      <div style={{ padding: 8, fontSize: 12, color: "#374151" }}>{title}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
