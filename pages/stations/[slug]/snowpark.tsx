// src/pages/stations/[slug]/snowpark.tsx
import type { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

import { fetchStationWidgetsConfig } from "@/lib/api/stations";
import { StationWidgetsConfig } from "@/types/station";

/* =========================
 * Types
 * =======================*/
type Resort = {
  id: string;
  name: string;
  slug: string;
  region?: { id?: string; name?: string; country_code?: string };
  latitude?: number | null;
  longitude?: number | null;
  cover_image_url?: string | null;
  logo_url?: string | null;
  description_md?: string | null;
};

interface Props {
  slug: string;
  resort: Resort | null;
  cfg: StationWidgetsConfig | null;
}

/* =========================
 * Constantes UI
 * =======================*/
const PANEL_HEIGHT = 420;

/* =========================
 * Helpers UI
 * =======================*/
const textOrEmpty = (v?: string | null) => (v && v.trim() ? v.trim() : "");
const formatBig = (v: string | number | null | undefined) => {
  if (v === null || v === undefined || v === "" || Number.isNaN(v as any)) return "—";
  const n = Number(v);
  if (Number.isFinite(n)) return n.toLocaleString("fr-FR");
  return String(v);
};

const Card: React.FC<
  React.PropsWithChildren<{ title?: string; style?: React.CSSProperties; bodyStyle?: React.CSSProperties }>
> = ({ title, style, bodyStyle, children }) => (
  <section
    style={{
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      background: "#fff",
      padding: 12,
      ...style,
    }}
  >
    {title ? (
      <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>{title}</h2>
    ) : null}
    <div style={bodyStyle}>{children}</div>
  </section>
);

/* =========================
 * Icônes
 * =======================*/
const IconArrowCircle = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="#1e3a8a" role="img" aria-label="→">
    <circle cx="12" cy="12" r="11" fill="#1d4ed8" />
    <path d="M8 12h6m0 0-2-2m2 2-2 2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* =========================
 * Plan du snowpark (zoom plein format au clic)
 * =======================*/
const PlanSnowparkFigure: React.FC<{ url?: string | null; caption?: string | null }> = ({ url, caption }) => {
  const [open, setOpen] = useState(false);
  const src = textOrEmpty(url);
  if (!src) return null;

  return (
    <>
      <figure
        style={{
          margin: 0,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
          background: "#fff",
          cursor: "zoom-in",
          height: PANEL_HEIGHT,
          display: "flex",
          flexDirection: "column",
        }}
        onClick={() => setOpen(true)}
        aria-label="Agrandir le plan du snowpark"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={caption || "Plan du snowpark"}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "contain",
            background: "#fff",
          }}
        />
        {caption ? (
          <figcaption
            style={{ padding: 10, fontSize: 13, color: "#6b7280", borderTop: "1px solid #f3f4f6" }}
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
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "1px solid #e5e7eb",
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
              src={src}
              alt={caption || "Plan du snowpark"}
              style={{ maxWidth: "96vw", maxHeight: "86vh", objectFit: "contain", borderRadius: 8 }}
            />
            {caption ? <p style={{ marginTop: 8, fontSize: 13, color: "#4b5563" }}>{caption}</p> : null}
          </div>
        </div>
      )}
    </>
  );
};

/* =========================
 * Météo Open-Meteo (recyclé)
 * =======================*/
const getWeatherIcon = (code: number | null | undefined) => {
  const c = typeof code === "number" ? code : 0;
  if (c === 0) return { symbol: "☀️", label: "Ensoleillé", bg: "#fef3c7" };
  if ([1, 2].includes(c)) return { symbol: "🌤️", label: "Peu nuageux", bg: "#e0f2fe" };
  if (c === 3) return { symbol: "☁️", label: "Couvert", bg: "#e5e7eb" };
  if ([45, 48].includes(c)) return { symbol: "🌫️", label: "Brouillard", bg: "#e5e7eb" };
  if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(c)) return { symbol: "🌧️", label: "Pluie", bg: "#dbeafe" };
  if ([71, 73, 75, 77, 85, 86].includes(c)) return { symbol: "❄️", label: "Neige", bg: "#e0f2fe" };
  if ([95, 96, 99].includes(c)) return { symbol: "⛈️", label: "Orages", bg: "#fee2e2" };
  return { symbol: "🌡️", label: "Météo", bg: "#f3f4f6" };
};

type OpenMeteoDaily = { date: string; temp_min: number; temp_max: number; snow_cm: number; code: number };

const MeteoWidget: React.FC<{ lat?: number | null; lon?: number | null }> = ({ lat, lon }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [current, setCurrent] = useState<{ temp: number; wind_kmh: number; code: number | null } | null>(null);
  const [forecast, setForecast] = useState<OpenMeteoDaily[]>([]);

  const usedLat = Number(lat);
  const usedLon = Number(lon);

  useEffect(() => {
    if (!Number.isFinite(usedLat) || !Number.isFinite(usedLon)) {
      setErr("Coordonnées indisponibles.");
      setLoading(false);
      setCurrent(null);
      setForecast([]);
      return;
    }

    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const params = new URLSearchParams({
          latitude: String(usedLat),
          longitude: String(usedLon),
          current_weather: "true",
          daily: "temperature_2m_max,temperature_2m_min,snowfall_sum,weathercode",
          timezone: "auto",
        });

        const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (aborted) return;

        const cw = j.current_weather || {};
        const dailyTimes: string[] = j.daily?.time || [];
        const tmin: number[] = j.daily?.temperature_2m_min || [];
        const tmax: number[] = j.daily?.temperature_2m_max || [];
        const snow: number[] = j.daily?.snowfall_sum || [];
        const codes: number[] = j.daily?.weathercode || [];

        const mappedForecast: OpenMeteoDaily[] = dailyTimes.map((d, idx) => ({
          date: d,
          temp_min: typeof tmin[idx] === "number" ? Math.round(tmin[idx]) : NaN,
          temp_max: typeof tmax[idx] === "number" ? Math.round(tmax[idx]) : NaN,
          snow_cm: typeof snow[idx] === "number" ? Math.round(snow[idx]) : 0,
          code: typeof codes[idx] === "number" ? codes[idx] : 0,
        }));

        setCurrent({
          temp: typeof cw.temperature === "number" ? Math.round(cw.temperature) : NaN,
          wind_kmh: typeof cw.windspeed === "number" ? Math.round(cw.windspeed) : 0,
          code: typeof cw.weathercode === "number" ? cw.weathercode : null,
        });
        setForecast(mappedForecast.slice(0, 4));
      } catch (e: any) {
        if (!aborted) setErr(e?.message || "Erreur météo");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [usedLat, usedLon]);

  const currentIcon = getWeatherIcon(current?.code ?? null);

  return (
    <Card title="Météo">
      {loading && <div style={{ fontSize: 13, color: "#6b7280" }}>Chargement…</div>}
      {err && !loading && <div style={{ fontSize: 13, color: "#dc2626" }}>Erreur : {err}</div>}

      {!loading && !err && current && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
              padding: 10,
              borderRadius: 12,
              background: currentIcon.bg,
            }}
          >
            <div>
              <div style={{ fontSize: 12, textTransform: "uppercase", color: "#4b5563" }}>Maintenant</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <div style={{ fontSize: 30, fontWeight: 800 }}>
                  {Number.isFinite(current.temp) ? `${current.temp}°C` : "—"}
                </div>
                <div style={{ fontSize: 22 }}>{currentIcon.symbol}</div>
              </div>
              <div style={{ fontSize: 13, color: "#374151" }}>
                {currentIcon.label} • vent {current.wind_kmh} km/h
              </div>
            </div>
          </div>

          {forecast.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", color: "#6b7280", marginBottom: 6 }}>
                Prochains jours
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                {forecast.map((d) => {
                  const icon = getWeatherIcon(d.code);
                  return (
                    <div
                      key={d.date}
                      style={{
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        padding: 8,
                        background: "#f9fafb",
                        fontSize: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: 600 }}>
                          {new Date(d.date).toLocaleDateString("fr-FR", {
                            weekday: "short",
                            day: "2-digit",
                            month: "short",
                          })}
                        </div>
                        <div style={{ fontSize: 18 }}>{icon.symbol}</div>
                      </div>
                      <div style={{ color: "#4b5563" }}>
                        {Number.isFinite(d.temp_min) ? `${d.temp_min}°` : "—"} /{" "}
                        {Number.isFinite(d.temp_max) ? `${d.temp_max}°` : "—"}
                      </div>
                      <div
                        style={{
                          marginTop: 2,
                          padding: "3px 6px",
                          borderRadius: 9999,
                          background: d.snow_cm > 0 ? "#e0f2fe" : "#f3f4f6",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          alignSelf: "flex-start",
                        }}
                      >
                        <span style={{ fontSize: 13 }}>❄️</span>
                        <span style={{ fontSize: 12 }}>
                          {d.snow_cm > 0 ? `${d.snow_cm} cm de neige` : "Pas de neige prévue"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

/* =========================
 * Webcams Snowpark (affiche seulement si cfg.snowpark.webcams[])
 * =======================*/
const SnowparkWebcams: React.FC<{ cfg?: any }> = ({ cfg }) => {
  const cams: any[] = Array.isArray(cfg?.snowpark?.webcams) ? cfg!.snowpark!.webcams : [];
  if (cams.length === 0) return null;

  return (
    <Card title="Webcam Snowpark">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
          gap: 12,
        }}
      >
        {cams.map((c, idx) => {
          const title = c?.title || `Webcam ${idx + 1}`;
          const preview = c?.preview || c?.image || "";
          return (
            <div
              key={c.id ?? idx}
              style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", background: "#fff" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {preview ? (
                <img
                  src={preview}
                  alt={title}
                  style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
                />
              ) : null}
              <div style={{ padding: 8, fontSize: 12, color: "#374151" }}>{title}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

/* =========================
 * Page
 * =======================*/
const SnowparkPage: NextPage<Props> = ({ slug, resort, cfg }) => {
  const router = useRouter();
  if (!resort) {
    return (
      <main style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px" }}>
        <h1>Snowpark introuvable</h1>
        <p>La station demandée n’existe pas ou a été désactivée.</p>
      </main>
    );
  }

  const title = `${resort.name} – Snowpark${resort.region?.name ? " • " + resort.region.name : ""}`;
  const metaDesc = `Snowpark de ${resort.name}${resort.region?.name ? " (" + resort.region.name + ")" : ""} : plan, météo, webcams.`;
  const cover =
    (cfg as any)?.snowpark?.cover || resort.cover_image_url || "https://d38x6kuhd141c9.cloudfront.net/page-accueil-ski.jpg";

  // Desc & logo (spécifique snowpark si dispo, sinon fallback station)
  const snowparkDescHtml: string = textOrEmpty((cfg as any)?.snowpark?.descriptionHtml) || "";
  const descriptionHtml: string = (snowparkDescHtml || resort.description_md || "").trim();
  const logoUrl: string | null = (cfg as any)?.snowpark?.logoUrl || resort.logo_url || null;

  // Plan du snowpark (mapUrl / imageUrl)
  const snowparkMapUrl: string | null =
    ((cfg as any)?.snowpark?.mapUrl as string) ||
    ((cfg as any)?.snowpark?.imageUrl as string) ||
    null;
  const snowparkCaption: string | null = (cfg as any)?.snowpark?.caption || null;

  // Coords météo : on utilise celles de la station pour l’instant
  const [geoLat, setGeoLat] = useState<number | null>(resort.latitude ?? null);
  const [geoLon, setGeoLon] = useState<number | null>(resort.longitude ?? null);

  useEffect(() => {
    const hasDbCoords =
      typeof resort.latitude === "number" &&
      !Number.isNaN(resort.latitude) &&
      typeof resort.longitude === "number" &&
      !Number.isNaN(resort.longitude);

    if (hasDbCoords) {
      setGeoLat(resort.latitude as number);
      setGeoLon(resort.longitude as number);
      return;
    }

    let aborted = false;
    (async () => {
      try {
        const g = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(resort.name)}`
        );
        const gj = await g.json();
        if (!aborted && Array.isArray(gj) && gj.length) {
          setGeoLat(parseFloat(gj[0].lat));
          setGeoLon(parseFloat(gj[0].lon));
        }
      } catch {}
    })();
    return () => {
      aborted = true;
    };
  }, [resort.name, resort.latitude, resort.longitude]);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={metaDesc} />
        <meta property="og:title" content={title} />
        <meta property="og:image" content={cover} />
      </Head>

      {/* HERO */}
      <section style={{ position: "relative", width: "100%", height: 270 }}>
        <Image src={cover} alt={`Snowpark • ${resort.name}`} fill sizes="100vw" priority style={{ objectFit: "cover" }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.5))",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "100%",
            maxWidth: 960,
            padding: "0 16px",
            color: "white",
          }}
        >
          <h1
            style={{
              textAlign: "center",
              fontWeight: 800,
              fontSize: 32,
              lineHeight: 1.15,
              marginBottom: 12,
              textShadow: "0 2px 8px rgba(0,0,0,0.35)",
            }}
          >
            Snowpark – {resort.name}
          </h1>
          {resort.region?.name ? (
            <p
              style={{
                marginTop: 2,
                marginBottom: 12,
                opacity: 0.95,
                textAlign: "center",
                textShadow: "0 2px 8px rgba(0,0,0,0.35)",
              }}
            >
              {resort.region.name}
            </p>
          ) : null}
        </div>
      </section>

      {/* LAYOUT */}
      <main style={{ maxWidth: 1200, margin: "24px auto 40px", padding: "0 16px" }}>
        {/* Description + logo (snowpark/station) */}
        <section style={{ marginTop: 16, marginBottom: 20 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "160px minmax(0, 1fr)",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                background: "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`Logo ${resort.name} – Snowpark`}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <span
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    textAlign: "center",
                    padding: 8,
                  }}
                >
                  Pas de logo pour l’instant
                </span>
              )}
            </div>

            {textOrEmpty(descriptionHtml) ? (
              <Card title="Description du snowpark">
                <div
                  style={{ fontSize: 15, lineHeight: 1.7, color: "#374151" }}
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              </Card>
            ) : (
              <Card title="Description du snowpark">
                <div style={{ fontSize: 14, color: "#6b7280" }}>—</div>
              </Card>
            )}
          </div>
        </section>

        {/* Grille principale : plan snowpark + widgets droite */}
        <section className="snowpark-layout">
          <div>
            <PlanSnowparkFigure url={snowparkMapUrl || undefined} caption={snowparkCaption || undefined} />
          </div>

          <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <MeteoWidget lat={geoLat} lon={geoLon} />
            <SnowparkWebcams cfg={cfg as any} />
          </aside>
        </section>

        {/* Cadres gris placeholders (vides pour le moment) */}
        <section style={{ marginTop: 20 }}>
          <div className="grey-panels-grid">
            <Card title=" " style={{ height: 160 }} />
            <Card title=" " style={{ height: 160 }} />
            <Card title=" " style={{ height: 160 }} />
            <Card title=" " style={{ height: 160 }} />
          </div>
        </section>
      </main>

      <style jsx global>{`
        .snowpark-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.4fr);
          gap: 16px;
          align-items: flex-start;
          margin-top: 16px;
        }

        .grey-panels-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        @media (max-width: 1024px) and (min-width: 769px) {
          .snowpark-layout {
            grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.6fr);
          }
          .grey-panels-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .snowpark-layout {
            grid-template-columns: minmax(0, 1fr);
          }
          .grey-panels-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </>
  );
};

/* =========================
 * SSR
 * =======================*/
export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = ctx.params?.slug as string;

  // 1) Resort (via proxy Next puis fallback API)
  let resort: Resort | null = null;
  try {
    const host = ctx.req.headers.host || "localhost:3001";
    const proxyUrl = `http://${host}/api/ski/resorts/${encodeURIComponent(slug)}`;
    let r = await fetch(proxyUrl);
    if (r.ok) {
      resort = (await r.json()) as Resort;
    } else {
      const api = process.env.SKI_API_URL || "http://127.0.0.1:5001";
      r = await fetch(`${api}/api/resorts/${encodeURIComponent(slug)}`);
      if (r.ok) resort = (await r.json()) as Resort;
    }
  } catch {
    resort = null;
  }

  // 2) Widgets config (inclut snowpark)
  let cfg: StationWidgetsConfig | null = null;
  try {
    cfg = await fetchStationWidgetsConfig(slug);
  } catch {
    cfg = null;
  }

  return { props: { slug, resort, cfg } };
};

export default SnowparkPage;
