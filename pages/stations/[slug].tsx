// src/pages/stations/[slug].tsx
import type { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

import { fetchStationWidgetsConfig } from "@/lib/api/stations";
import { StationWidgetsConfig } from "@/types/station";

import StationForfaitsBlock from "@/components/stations/StationForfaitsBlock";

/* =========================
 * Types
 * =======================*/
type Resort = {
  id: string;
  name: string;
  slug: string;
  region?: { id?: string; name?: string; country_code?: string };
  altitude_base_m?: number | null;
  altitude_top_m?: number | null;
  ski_area_km?: number | null;
  lifts_count?: number | null;
  pistes_count?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  website_url?: string | null;
  cover_image_url?: string | null;
  logo_url?: string | null;
  amenities?: string | null;
  description_md?: string | null;

  // Champs éventuels en base (admin)
  altitude_min_m?: number | null;
  altitude_max_m?: number | null;
  season_open_date?: string | null;
  season_close_date?: string | null;
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

const textOrEmpty = (v?: string | null) => (v && v.trim() ? v.trim() : "");
const dash = (s?: string | number | null) =>
  s === 0 ? "0" : s === "" || s === null || s === undefined ? "—" : String(s);

const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
};

const formatBig = (v: string | number | null | undefined) => {
  if (v === null || v === undefined || v === "" || Number.isNaN(v as any)) return "—";
  const n = Number(v);
  if (Number.isFinite(n)) return n.toLocaleString("fr-FR");
  return String(v);
};

/* =========================
 * Icônes (SVG inline, pas de lib)
 * =======================*/
const IconArrowCircle = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="#1e3a8a" role="img" aria-label="→">
    <circle cx="12" cy="12" r="11" fill="#1d4ed8" />
    <path d="M8 12h6m0 0-2-2m2 2-2 2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconAltitude = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
    <path d="M3 18l6-8 4 5 3-4 5 7H3Z" strokeLinejoin="round" />
    <path d="M5 18h14" />
  </svg>
);

const IconPistes = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
    <path d="M4 16l14-8" strokeLinecap="round" />
    <path d="M7 20l12-7" strokeLinecap="round" />
    <circle cx="18" cy="6" r="1.8" fill="#111827" />
  </svg>
);

const IconLifts = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
    <path d="M3 6h18" strokeLinecap="round" />
    <path d="M6 6v8a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V6" />
    <path d="M15 6v6a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V6" />
  </svg>
);

const IconCalendar = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M8 2v4M16 2v4M3 10h18" />
  </svg>
);

const IconMap = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
    <path d="M9 6l6-2 6 2v12l-6 2-6-2-6 2V8l6-2v12" strokeLinejoin="round" />
  </svg>
);

const IconSnowpark = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
    <path d="M12 2v20M4 6l16 12M20 6 4 18" strokeLinecap="round" />
  </svg>
);

const IconPin = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

/* =========================
 * Tuiles "style capture" : base + variantes compactes
 * =======================*/
type TileValue = { value: string; sub?: string };

const TileHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div>{icon}</div>
      <div
        style={{
          fontSize: 12,
          letterSpacing: 1.2,
          color: "#374151",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {title}
      </div>
    </div>
    <IconArrowCircle />
  </div>
);

/** Tuile générique (grands chiffres) */
const Tile: React.FC<{ icon: React.ReactNode; title: string; values: TileValue[] }> = ({ icon, title, values }) => {
  const cols = Math.min(Math.max(values.length, 1), 3);
  return (
    <div
      style={{
        background: "#f7f7fb",
        border: "1px solid #eef0f4",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <TileHeader icon={icon} title={title} />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: 12 }}>
        {values.map((v, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{v.value}</div>
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                letterSpacing: 0.6,
                color: "#6b7280",
                textTransform: "uppercase",
              }}
            >
              {v.sub || " "}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---- utilitaires pour légendes compactes ---- */
const ColorDot: React.FC<{ c: string; label: string }> = ({ c, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: 9999,
        background: c,
        border: "1px solid rgba(0,0,0,0.12)",
      }}
    />
    <span style={{ fontSize: 13, color: "#374151" }}>{label}</span>
  </div>
);

const LegendRow: React.FC<{ left: React.ReactNode; right: React.ReactNode }> = ({ left, right }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{left}</div>
    <div style={{ fontWeight: 700, color: "#0f172a" }}>{right}</div>
  </div>
);

/* Mini-icônes pour types de remontées (cohérentes visuellement) */
const MiniDrag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
    <path d="M4 6h16" strokeLinecap="round" />
    <path d="M8 6v7a3 3 0 0 0 6 0V6" />
  </svg>
);
const MiniChair = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
    <path d="M4 6h16" strokeLinecap="round" />
    <path d="M7 12h10M8 12v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4" />
  </svg>
);
const MiniCable = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
    <path d="M3 6h18" strokeLinecap="round" />
    <rect x="8" y="9" width="8" height="6" rx="1.5" />
    <path d="M12 9v-3" />
  </svg>
);

/** Tuile compacte "Pistes + couleurs" */
const PistesTile: React.FC<{
  total: string;
  km: string;
  green: string;
  blue: string;
  red: string;
  black: string;
  snowparks: string;
  snowparksClickable?: boolean;
  onSnowparkClick?: () => void;
}> = ({ total, km, green, blue, red, black, snowparks, snowparksClickable, onSnowparkClick }) => (
  <div
    style={{
      background: "#f7f7fb",
      border: "1px solid #eef0f4",
      borderRadius: 16,
      padding: 16,
    }}
  >
    <TileHeader icon={<IconPistes />} title="Pistes" />

    {/* chiffres principaux */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{total}</div>
        <div style={{ marginTop: 4, fontSize: 11, letterSpacing: 0.6, color: "#6b7280", textTransform: "uppercase" }}>
          Pistes
        </div>
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{km}</div>
        <div style={{ marginTop: 4, fontSize: 11, letterSpacing: 0.6, color: "#6b7280", textTransform: "uppercase" }}>
          Domaine
        </div>
      </div>
    </div>

    <div style={{ height: 1, background: "#e9edf3", margin: "8px 0 10px" }} />

    {/* légendes couleurs */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
      <LegendRow left={<ColorDot c="#16a34a" label="Vertes" />} right={<span>{green}</span>} />
      <LegendRow left={<ColorDot c="#2563eb" label="Bleues" />} right={<span>{blue}</span>} />
      <LegendRow left={<ColorDot c="#dc2626" label="Rouges" />} right={<span>{red}</span>} />
      <LegendRow left={<ColorDot c="#111827" label="Noires" />} right={<span>{black}</span>} />
      {snowparksClickable ? (
        <button
          onClick={onSnowparkClick}
          style={{ all: "unset", cursor: "pointer", borderRadius: 8, padding: 4 }}
          aria-label="Voir le(s) snowpark(s)"
        >
          <LegendRow
            left={
              <>
                <IconSnowpark />
                <span style={{ fontSize: 13, color: "#374151", textDecoration: "underline" }}>Snowparks</span>
              </>
            }
            right={<span>{snowparks}</span>}
          />
        </button>
      ) : (
        <LegendRow
          left={
            <>
              <IconSnowpark />
              <span style={{ fontSize: 13, color: "#374151" }}>Snowparks</span>
            </>
          }
          right={<span>{snowparks}</span>}
        />
      )}
    </div>
  </div>
);

/** Tuile compacte "Remontées + types" */
const LiftsTile: React.FC<{
  total: string;
  typesLabel: string;
  drag: string;
  chair: string;
  cable: string;
}> = ({ total, typesLabel, drag, chair, cable }) => (
  <div
    style={{
      background: "#f7f7fb",
      border: "1px solid #eef0f4",
      borderRadius: 16,
      padding: 16,
    }}
  >
    <TileHeader icon={<IconLifts />} title="Remontées mécaniques" />

    {/* chiffres principaux */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{total}</div>
        <div style={{ marginTop: 4, fontSize: 11, letterSpacing: 0.6, color: "#6b7280", textTransform: "uppercase" }}>
          Remontées
        </div>
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{typesLabel}</div>
        <div style={{ marginTop: 4, fontSize: 11, letterSpacing: 0.6, color: "#6b7280", textTransform: "uppercase" }}>
          Types
        </div>
      </div>
    </div>

    <div style={{ height: 1, background: "#e9edf3", margin: "8px 0 10px" }} />

    {/* légendes types */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
      <LegendRow
        left={
          <>
            <MiniDrag />
            <span style={{ fontSize: 13, color: "#374151" }}>Tire-fesses</span>
          </>
        }
        right={<span>{drag}</span>}
      />
      <LegendRow
        left={
          <>
            <MiniChair />
            <span style={{ fontSize: 13, color: "#374151" }}>Télésièges</span>
          </>
        }
        right={<span>{chair}</span>}
      />
      <LegendRow
        left={
          <>
            <MiniCable />
            <span style={{ fontSize: 13, color: "#374151" }}>Téléphériques</span>
          </>
        }
        right={<span>{cable}</span>}
      />
    </div>
  </div>
);

/* =========================
 * Description (hauteur fixe)
 * =======================*/
const DescriptionCard: React.FC<{ html: string }> = ({ html }) => {
  const safe = textOrEmpty(html);
  if (!safe) return null;
  return (
    <Card
      title="Description"
      style={{ height: PANEL_HEIGHT, display: "flex", flexDirection: "column" }}
      bodyStyle={{ overflow: "auto", flex: 1 }}
    >
      <div
        style={{ fontSize: 15, lineHeight: 1.7, color: "#374151" }}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    </Card>
  );
};

/* =========================
 * Plan des pistes
 * =======================*/
const PlanPistesFigure: React.FC<{ small?: string | null; large?: string | null; caption?: string | null }> = ({
  small,
  large,
  caption,
}) => {
  const [open, setOpen] = useState(false);
  const src = textOrEmpty(small) || textOrEmpty(large);
  if (!src) return null;
  const big = textOrEmpty(large) || (small as string);

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
        aria-label="Agrandir le plan des pistes"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={caption || "Plan des pistes"}
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
              src={big}
              alt={caption || "Plan des pistes"}
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
 * Webcams
 * =======================*/
const WebcamsAuto: React.FC<{ name: string; lat?: number | null; lon?: number | null }> = ({
  name,
  lat,
  lon,
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
    <Card title="Webcam" style={{ width: "100%" }}>
      {loading && <div style={{ fontSize: 13, color: "#6b7280" }}>Chargement…</div>}
      {err && !loading && <div style={{ fontSize: 13, color: "#dc2626" }}>Webcams : {err}</div>}
      {!loading && !err && cams.length === 0 && (
        <div style={{ fontSize: 13, color: "#6b7280" }}>Aucune webcam trouvée à proximité.</div>
      )}

      {!loading && !err && cams.length > 0 && (
        <div
          style={{
            position: "relative",
            width: "100%",
            overflow: "hidden",
            borderRadius: 10,
            background: "#f3f4f6",
            border: "1px solid #e5e7eb",
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
              border: "1px solid #e5e7eb",
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

      <div style={{ marginTop: 8, fontSize: 11, color: "#6b7280" }}>Source : Windy Webcams API (attribution requise)</div>

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

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{activeTitle}</h3>
              {cams.length > MAX_STRIP && (
                <button
                  onClick={() => setShowAll((v) => !v)}
                  style={{
                    height: 36,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  {showAll ? "Revenir à la galerie" : "Voir plus de webcams"}
                </button>
              )}
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
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
                        border: isActive ? "2px solid #2563eb" : "1px solid #e5e7eb",
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
                        border: "1px solid #e5e7eb",
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

const getWeatherIcon = (code: number | null | undefined) => {
  const c = typeof code === "number" ? code : 0;

  if (c === 0) {
    return { symbol: "☀️", label: "Ensoleillé", bg: "#fef3c7" };
  }
  if ([1, 2].includes(c)) {
    return { symbol: "🌤️", label: "Peu nuageux", bg: "#e0f2fe" };
  }
  if (c === 3) {
    return { symbol: "☁️", label: "Couvert", bg: "#e5e7eb" };
  }
  if ([45, 48].includes(c)) {
    return { symbol: "🌫️", label: "Brouillard", bg: "#e5e7eb" };
  }
  if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(c)) {
    return { symbol: "🌧️", label: "Pluie", bg: "#dbeafe" };
  }
  if ([71, 73, 75, 77, 85, 86].includes(c)) {
    return { symbol: "❄️", label: "Neige", bg: "#e0f2fe" };
  }
  if ([95, 96, 99].includes(c)) {
    return { symbol: "⛈️", label: "Orages", bg: "#fee2e2" };
  }
  return { symbol: "🌡️", label: "Météo", bg: "#f3f4f6" };
};

/* =========================
 * Météo Open-Meteo
 * =======================*/
type OpenMeteoDaily = {
  date: string;
  temp_min: number;
  temp_max: number;
  snow_cm: number;
  code: number;
};

const MeteoblueSkiWidget: React.FC<{ lat?: number | null; lon?: number | null; height?: number }> = ({
  lat,
  lon,
}) => {
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

  if (!Number.isFinite(usedLat) || !Number.isFinite(usedLon)) {
    return (
      <Card title="Météo & neige">
        <div style={{ fontSize: 13, color: "#6b7280" }}>Coordonnées indisponibles.</div>
      </Card>
    );
  }

  const currentIcon = getWeatherIcon(current?.code ?? null);

  return (
    <Card title="Météo & neige">
      {loading && <div style={{ fontSize: 13, color: "#6b7280" }}>Chargement…</div>}
      {err && !loading && <div style={{ fontSize: 13, color: "#dc2626" }}>Erreur : {err}</div>}

      {!loading && !err && current && (
        <>
          {/* Bloc maintenant */}
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

          {/* Prévisions neige + icônes */}
          {forecast.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  color: "#6b7280",
                  marginBottom: 6,
                }}
              >
                Prochains jours
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
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

          <div style={{ marginTop: 8, fontSize: 11, color: "#6b7280" }}>Source : Open-Meteo</div>
        </>
      )}
    </Card>
  );
};

/* =========================
 * Snowpark
 * =======================*/
const SnowparkCard: React.FC<{ url?: string | null; caption?: string | null; clickable?: boolean; onClick?: () => void }> = ({
  url,
  caption,
  clickable,
  onClick,
}) => {
  const src = textOrEmpty(url);
  if (!src) return null;
  return (
    <Card title="Snowpark">
      {clickable ? (
        <div
          onClick={onClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick?.()}
          style={{ cursor: "pointer" }}
          aria-label="Voir la page snowpark"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={caption || "Plan du snowpark"}
            style={{ width: "100%", height: "auto", display: "block", borderRadius: 10, border: "1px solid #e5e7eb" }}
          />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={caption || "Plan du snowpark"}
          style={{ width: "100%", height: "auto", display: "block", borderRadius: 10, border: "1px solid #e5e7eb" }}
        />
      )}
      {caption ? <p style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>{caption}</p> : null}
    </Card>
  );
};

/* =========================
 * Search box
 * =======================*/
const ResortSearchBox: React.FC<{ onPick: (slug: string) => void }> = ({ onPick }) => {
  type LiteResort = { id: string; name: string; slug: string; region?: { name?: string } };

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<LiteResort[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<number>(-1);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001";
  const fetchUrl = useMemo(() => {
    const base = typeof window !== "undefined" ? "/api/ski/resorts/" : `${apiBase}/api/resorts/`;
    const q = query.trim();
    return q ? `${base}?q=${encodeURIComponent(q)}` : base;
  }, [apiBase, query]);

  useEffect(() => {
    let cancel = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(fetchUrl);
        if (!r.ok) throw new Error("failed");
        const data: LiteResort[] = await r.json();
        if (!cancel) setItems(data);
      } catch {
        if (!cancel) setItems([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    }, 250);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [fetchUrl]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = items[cursor] || items[0];
      if (picked) {
        onPick(picked.slug);
        setOpen(false);
        setCursor(-1);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setCursor(-1);
    }
  }

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        type="text"
        placeholder="Recherchez une station (ex. Auron, Val Thorens, …)"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setCursor(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        style={{
          width: "100%",
          padding: "14px 16px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.6)",
          background: "rgba(255,255,255,0.95)",
          fontSize: 18,
          outline: "none",
          color: "#111827",
        }}
      />
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 8,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "#fff",
            color: "#111827",
            maxHeight: 320,
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            zIndex: 20,
          }}
          role="listbox"
        >
          {loading && <div style={{ padding: 12, color: "#666" }}>Chargement…</div>}
          {!loading && items.length === 0 && <div style={{ padding: 12, color: "#666" }}>Aucun résultat</div>}
          {!loading &&
            items.map((r, i) => (
              <div
                key={r.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(r.slug);
                  setOpen(false);
                  setCursor(-1);
                }}
                role="option"
                aria-selected={cursor === i}
                style={{
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  cursor: "pointer",
                  background: cursor === i ? "#f3f4f6" : "#fff",
                  borderBottom: "1px solid #f3f4f6",
                }}
                onMouseEnter={() => setCursor(i)}
              >
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div style={{ color: "#6b7280" }}>{r.region?.name || ""}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

/* =========================
 * Panneaux d'infos étendus (tuiles compactes)
 * =======================*/
const StationExtraPanels: React.FC<{ resort: Resort; cfg?: any }> = ({ resort, cfg }) => {
  const router = useRouter();

  // Altitudes
  const altMin = (resort as any)?.altitude_min_m ?? resort.altitude_base_m ?? null;
  const altMax = (resort as any)?.altitude_max_m ?? resort.altitude_top_m ?? null;
  const drop =
    Number.isFinite(altMin as any) && Number.isFinite(altMax as any)
      ? Math.max(0, Number(altMax) - Number(altMin))
      : null;

  // Saison
  const openRaw =
    (resort as any)?.season_open_date ??
    cfg?.snow?.season?.openingDate ??
    cfg?.snow?.openingDate ??
    cfg?.forfaits?.openingDate ??
    null;
  const closeRaw =
    (resort as any)?.season_close_date ??
    cfg?.snow?.season?.closingDate ??
    cfg?.snow?.closingDate ??
    cfg?.forfaits?.closingDate ??
    null;
  const seasonStr =
    openRaw && closeRaw
      ? `${fmtDate(openRaw)} → ${fmtDate(closeRaw)}`
      : openRaw
      ? `Dès ${fmtDate(openRaw)}`
      : closeRaw
      ? `Jusqu’au ${fmtDate(closeRaw)}`
      : "—";

  // Domaine / pistes
  const km = Number.isFinite(resort.ski_area_km as any) ? `${formatBig(resort.ski_area_km)} km` : "—";
  const pistesTotal = Number.isFinite(resort.pistes_count as any) ? formatBig(resort.pistes_count) : "—";
  const pc = cfg?.pistes?.colors || {};
  const pistesGreen = Number.isFinite(pc.green) ? formatBig(pc.green) : "—";
  const pistesBlue = Number.isFinite(pc.blue) ? formatBig(pc.blue) : "—";
  const pistesRed = Number.isFinite(pc.red) ? formatBig(pc.red) : "—";
  const pistesBlack = Number.isFinite(pc.black) ? formatBig(pc.black) : "—";

  // Snowparks (depuis cfg)
  const snowparksCountRaw =
    typeof cfg?.snowparks?.count === "number"
      ? cfg.snowparks.count
      : typeof cfg?.widgets?.snowparks?.count === "number"
      ? cfg.widgets.snowparks.count
      : 0;
  const snowparksLabel = formatBig(snowparksCountRaw);
  const snowparksClickable = (snowparksCountRaw ?? 0) > 0;
  const onSnowparkClick = () => router.push(`/stations/${resort.slug}/snowpark`);

  // Remontées mécaniques
  const rm = cfg?.remontees || {};
  const liftsDrag = Number.isFinite(rm.tireFesses) ? Number(rm.tireFesses) : 0;
  const liftsChairs = Number.isFinite(rm.telesieges) ? Number(rm.telesieges) : 0;
  const liftsCable = Number.isFinite(rm.telepheriques) ? Number(rm.telepheriques) : 0;

  // 🔹 Total = somme des 3 types
  const liftsTotalNum = liftsDrag + liftsChairs + liftsCable;
  const liftsTotal = liftsTotalNum > 0 ? formatBig(liftsTotalNum) : "—";

  // 🔹 Nombre de types actifs
  const liftTypesCount = [liftsDrag, liftsChairs, liftsCable].filter((v) => v > 0).length;
  const liftTypesLabel = liftTypesCount ? `${liftTypesCount}` : "—";

  return (
    <section style={{ marginTop: 18 }}>
      <div className="stations-panels-grid">
        {/* Altitude */}
        <div
          style={{
            background: "#f7f7fb",
            border: "1px solid #eef0f4",
            borderRadius: 16,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IconAltitude />
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: 1.2,
                  color: "#374151",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Altitude
              </div>
            </div>
            <IconArrowCircle />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
                {formatBig(altMax)}m
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  letterSpacing: 0.6,
                  color: "#6b7280",
                  textTransform: "uppercase",
                }}
              >
                EN HAUT
              </div>
            </div>

            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
                {formatBig(altMin)}m
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  letterSpacing: 0.6,
                  color: "#6b7280",
                  textTransform: "uppercase",
                }}
              >
                EN BAS
              </div>
            </div>

            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
                {formatBig(drop)}m
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  letterSpacing: 0.6,
                  color: "#6b7280",
                  textTransform: "uppercase",
                }}
              >
                DÉNIVELÉ
              </div>
            </div>
          </div>
        </div>

        {/* Pistes + couleurs */}
        <PistesTile
          total={`${pistesTotal}`}
          km={`${km}`}
          green={`${pistesGreen}`}
          blue={`${pistesBlue}`}
          red={`${pistesRed}`}
          black={`${pistesBlack}`}
          snowparks={`${snowparksLabel}`}
          snowparksClickable={snowparksClickable}
          onSnowparkClick={snowparksClickable ? onSnowparkClick : undefined}
        />

        {/* Remontées + types */}
        <LiftsTile
          total={`${liftsTotal}`}
          typesLabel={`${liftTypesLabel}`}
          drag={`${formatBig(liftsDrag)}`}
          chair={`${formatBig(liftsChairs)}`}
          cable={`${formatBig(liftsCable)}`}
        />

        {/* Saison */}
        <Tile icon={<IconCalendar />} title="Saison" values={[{ value: seasonStr, sub: " " }]} />
      </div>
    </section>
  );
};

/* =========================
 * Page
 * =======================*/
const ResortPage: NextPage<Props> = ({ slug, resort, cfg }) => {
  const router = useRouter();
  if (!resort) {
    return (
      <main style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px" }}>
        <h1>Station introuvable</h1>
        <p>La station demandée n’existe pas ou a été désactivée.</p>
      </main>
    );
  }

  const title =
    textOrEmpty(cfg?.description?.metaTitle) ||
    `${resort.name} – Station de ski${resort.region?.name ? " • " + resort.region.name : ""}`;

  const metaDesc =
    textOrEmpty(cfg?.description?.metaDescription) ||
    `Infos ${resort.name}${resort.region?.name ? " (" + resort.region.name + ")" : ""} : altitude, pistes, remontées, carte.`;

  const cover = resort.cover_image_url || "https://d38x6kuhd141c9.cloudfront.net/page-accueil-ski.jpg";

  // URLs plan (ordre de priorité : cfg.pistes → resort.* à plat)
  const pistesCfg = cfg?.pistes || null;

  const mapSmall: string = (
    pistesCfg?.smallMapUrl?.trim() ||
    (resort as any)?.pistes_small_map_url?.trim() ||
    (resort as any)?.pistes_large_map_url?.trim() ||
    ""
  ) as string;

  const mapLarge: string = (
    pistesCfg?.largeMapUrl?.trim() ||
    (resort as any)?.pistes_large_map_url?.trim() ||
    ""
  ) as string;

  const mapCaption: string | null = pistesCfg?.caption ?? (resort as any)?.pistes_caption ?? null;

  const descriptionHtml: string = ((cfg?.description?.html as string) || resort.description_md || "").trim();

  // Debug temporaire
  // eslint-disable-next-line no-console
  console.log("pistes source =", {
    fromCfg: Boolean(cfg?.pistes),
    fromResortWidgets: Boolean((resort as any)?.widgets?.pistes),
    mapSmall,
    mapLarge,
    mapCaption,
  });

  const hasDescription = Boolean(descriptionHtml);
  const hasLogo = Boolean(resort.logo_url);

  // Coords
  const [geoLat, setGeoLat] = useState<number | null>(resort.latitude ?? null);
  const [geoLon, setGeoLon] = useState<number | null>(resort.longitude ?? null);

  // TEMP Auron
  useEffect(() => {
    const s = (slug || "").toLowerCase().trim();
    if (s === "auron") {
      setGeoLat(44.255);
      setGeoLon(6.934);
    }
  }, [slug]);

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

  const handlePick = (slug: string) => router.push(`/stations/${slug}`);

  // Snowpark (config)
  const snowparkUrl: string | null =
    ((cfg as any)?.snowpark?.mapUrl as string) || ((cfg as any)?.snowpark?.imageUrl as string) || null;
  const snowparkCaption: string | null = (cfg as any)?.snowpark?.caption || null;

  // clics snowpark (ligne + plan)
  const snowparksCountForCard =
    (typeof (cfg as any)?.snowparks?.count === "number" ? (cfg as any).snowparks.count : null) ??
    (typeof (cfg as any)?.widgets?.snowparks?.count === "number" ? (cfg as any).widgets.snowparks.count : null) ??
    0;
  const goSnowpark = () => router.push(`/stations/${resort.slug}/snowpark`);

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
        <Image src={cover} alt={`Photo de ${resort.name}`} fill sizes="100vw" priority style={{ objectFit: "cover" }} />
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
            {resort.name}
          </h1>
          {resort.region?.name && (
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
          )}
          <ResortSearchBox onPick={handlePick} />
        </div>
      </section>

      {/* LAYOUT */}
      <main style={{ maxWidth: 1200, margin: "24px auto 40px", padding: "0 16px" }}>
        {/* Description + logo station */}
        {(hasLogo || hasDescription) && (
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
                {resort.logo_url ? (
                  <img
                    src={resort.logo_url}
                    alt={`Logo ${resort.name}`}
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

              {hasDescription && (
                <Card title="Description de la station">
                  <div
                    style={{ fontSize: 15, lineHeight: 1.7, color: "#374151" }}
                    dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                  />
                </Card>
              )}
            </div>
          </section>
        )}

        {/* Tuiles info */}
        <StationExtraPanels resort={resort} cfg={cfg as any} />

        {/* Ligne A : plan + widgets droite */}
        <section className="stations-layout">
          <div>
            <PlanPistesFigure small={mapSmall} large={mapLarge} caption={mapCaption} />
          </div>

          <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <WebcamsAuto name={resort.name} lat={geoLat} lon={geoLon} />
            <MeteoblueSkiWidget lat={geoLat} lon={geoLon} />
            <SnowparkCard
              url={snowparkUrl}
              caption={snowparkCaption || undefined}
              clickable={snowparksCountForCard > 0}
              onClick={snowparksCountForCard > 0 ? goSnowpark : undefined}
            />
          </aside>
        </section>

        {/* Forfaits */}
        <section style={{ marginTop: 20 }}>
          <StationForfaitsBlock enabled={cfg?.forfaits?.enabled} items={cfg?.forfaits?.items || []} />
        </section>
      </main>

      <style jsx global>{`
        .stations-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.4fr);
          gap: 16px;
          align-items: flex-start;
          margin-top: 16px;
        }

        .stations-panels-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        /* Tablette / petit desktop : 2 colonnes de tuiles, layout simplifié */
        @media (max-width: 1024px) and (min-width: 769px) {
          .stations-layout {
            grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.6fr);
          }

          .stations-panels-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        /* Mobile : tout en 1 colonne */
        @media (max-width: 768px) {
          .stations-layout {
            grid-template-columns: minmax(0, 1fr);
          }

          .stations-panels-grid {
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

  // 1) Resort via proxy Next puis fallback API
  let resort: Resort | null = null;
  try {
    const host = ctx.req.headers.host || "localhost:3001";
    const proxyUrl = `http://${host}/api/ski/resorts/${encodeURIComponent(slug)}`;
    let r = await fetch(proxyUrl);
    if (r.ok) {
      const data = await r.json();
      resort = (data?.resort ?? data) as Resort;
    } else {
      const api = process.env.SKI_API_URL || "http://127.0.0.1:5001";
      r = await fetch(`${api}/api/resorts/${encodeURIComponent(slug)}`);
      if (r.ok) {
        const data = await r.json();
        resort = (data?.resort ?? data) as Resort;
      }
    }
  } catch {
    resort = null;
  }

  // 2) Widgets config
  let cfg: StationWidgetsConfig | null = null;
  try {
    cfg = await fetchStationWidgetsConfig(slug);
  } catch {
    cfg = null;
  }

  return { props: { slug, resort, cfg } };
};


export default ResortPage;
