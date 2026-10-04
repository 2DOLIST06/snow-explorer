
// src/pages/stations/[slug].tsx
import type { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { fetchStationWidgetsConfig } from "@/lib/api/stations";
import { normalizeOfficialMapUrl } from "@/lib/officialMap";
import { getStationApiBase, isResortInactive, loadStationPageSources, resolveResortRegion } from "@/lib/api/stationPage";
import { StationWidgetsConfig } from "@/types/station";
import type { SkiPassSeason } from "@/types/skiPass";
import { regionHref } from "@/lib/regions";
import { resolveStationPisteMap } from "@/lib/stationPisteMap";

import StationForfaitsBlocks, { hasStationForfaits } from "@/components/stations/StationForfaitsBlocks";
import { getSnowparksCount, isSnowparkEnabled } from "@/lib/snowparkAvailability";
import { resolveStationForfaits } from "@/lib/stationForfaits";
import StationLogoFrame from "@/components/stations/StationLogoFrame";
import StationMapCard from "@/components/maps/StationMapCard";
import SkiAreaPublicCard, { StationCards } from "@/components/stations/SkiAreaPublicCard";
import type { SkiAreaPublic } from "@/types/skiArea";
import { fetchActiveResortsServer, getDepartmentResorts } from "@/lib/api/resorts";
import StationV3Page from "@/components/stations/StationV3Page";
import StationLegacyHero from "@/components/stations/StationLegacyHero";
import { PlanPistesFigure } from "@/components/stations/StationPisteMap";
import { MeteoblueSkiWidget } from "@/components/stations/StationLegacyWeather";
import { WebcamsAuto } from "@/components/stations/StationLegacyWebcams";

/* =========================
 * Types
 * =======================*/
type Resort = {
  id?: string;
  name: string;
  slug: string;
  is_active?: boolean;
  resort_is_active?: boolean;
  active?: boolean;
  region?: { id?: string; name?: string; slug?: string; country_code?: string };
  region_id?: string | null;
  region_name?: string | null;
  region_label?: string | null;
  department?: { id?: string; name?: string; slug?: string } | string | null;
  altitude_base_m?: number | null;
  altitude_top_m?: number | null;
  ski_area_km?: number | null;
  lifts_count?: number | null;
  pistes_count?: number | null;
  snowparks_count?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  website_url?: string | null;
  cover_image_url?: string | null;
  logo_url?: string | null;
  description_md?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  pistes_small_map_url?: string | null;
  pistes_large_map_url?: string | null;
  pistes_caption?: string | null;
  ski_pass?: SkiPassSeason | null;
  ski_areas?: SkiAreaPublic[];
  page_layout_version?: "legacy" | "v2";
  v2?: Record<string, unknown> | null;
  public_v2?: Record<string, unknown> | null;
  v2_content?: Record<string, unknown> | null;
  v2_contents?: Record<string, unknown> | null;
  v2_published_sections?: string[] | Record<string, boolean> | null;
  v2_overview_html?: string | null;
  v2_weather_snow_html?: string | null;
  v2_ski_pass_html?: string | null;
  v2_piste_map_html?: string | null;
  v2_webcam_html?: string | null;
  pistes_colors?: Record<string, number | null> | null;
  elevation_drop_m?: number | null;
  vertical_drop_m?: number | null;
  webcams?: unknown[];

  // Champs éventuels en base (admin)
  altitude_min_m?: number | null;
  altitude_max_m?: number | null;
  season_open_date?: string | null;
  season_close_date?: string | null;
};

interface Props {
  resort: Resort;
  cfg: StationWidgetsConfig | null;
  departmentStations: import("@/types/skiArea").StationOption[];
}

/* =========================
 * Constantes UI
 * =======================*/
// Source de vérité unique pour le bloc de répartition des pistes. Elle pilote
// à la fois son rendu et la présence de ses données dans les props SSR.
const SHOW_PISTE_COLOR_DETAILS = false;

/* =========================
 * Helpers UI
 * =======================*/
const Card: React.FC<
  React.PropsWithChildren<{ title?: string; style?: React.CSSProperties; bodyStyle?: React.CSSProperties }>
> = ({ title, style, bodyStyle, children }) => (
  <section
    style={{
      border: "1px solid #cbd5e1",
      borderRadius: 12,
      background: "#fff",
      padding: 12,
      ...style,
    }}
  >
    {title ? (
      <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#111827" }}>{title}</h2>
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
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
};

const dateYear = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.getFullYear();
};

const formatBig = (v: string | number | null | undefined) => {
  if (v === null || v === undefined || v === "" || Number.isNaN(v as any)) return "—";
  const n = Number(v);
  if (Number.isFinite(n)) return n.toLocaleString("fr-FR");
  return String(v);
};

const sumAvailable = (...values: Array<number | null | undefined>) => {
  const available = values.filter((value): value is number => Number.isFinite(value));
  return available.length ? available.reduce((total, value) => total + value, 0) : null;
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
const Tile: React.FC<{ icon: React.ReactNode; title: string; values: TileValue[]; stacked?: boolean }> = ({
  icon,
  title,
  values,
  stacked = false,
}) => {
  const cols = stacked ? 1 : Math.min(Math.max(values.length, 1), 3);
  return (
    <div
      style={{
        background: "#eef2f7",
        border: "1px solid #d1d9e6",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <TileHeader icon={icon} title={title} />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: 12 }}>
       {values.map((v, i) => (
  <div key={i} style={{ display: "flex", flexDirection: "column" }}>
    <div
      style={{
        marginBottom: 4,
        fontSize: 11,
        letterSpacing: 0.6,
        color: "#4b5563",
        textTransform: "uppercase",
      }}
    >
      {v.sub || " "}
    </div>

    <div
      style={{
        fontSize: 26,
        fontWeight: 800,
        color: "#0f172a",
        lineHeight: 1.1,
      }}
    >
      {v.value}
    </div>
  </div>
))}
      </div>
    </div>
  );
};

/** Tuile synthétique « Pistes & remontées » */
const PistesTile: React.FC<{
  total: string;
  km: string;
  snowparks: string;
  snowparkName?: string | null;
  lifts: string;
  snowparksClickable?: boolean;
  onSnowparkClick?: () => void;
  colors?: StationWidgetsConfig["pistes"]["colors"];
}> = ({ total, km, snowparks, snowparkName, lifts, snowparksClickable, onSnowparkClick, colors }) => {
  const metricStyle: React.CSSProperties = { fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 };
  const labelStyle: React.CSSProperties = { marginTop: 4, fontSize: 11, letterSpacing: 0.6, color: "#4b5563", textTransform: "uppercase" };
  const snowparkMetric = <><div style={metricStyle}>{snowparks}</div><div style={labelStyle}>{snowparkName || "Snowparks"}</div></>;

  return (
    <div style={{ background: "#eef2f7", border: "1px solid #d1d9e6", borderRadius: 16, padding: 16 }}>
      <TileHeader icon={<IconPistes />} title="Pistes & remontées" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div><div style={metricStyle}>{total}</div><div style={labelStyle}>Pistes</div></div>
        <div><div style={metricStyle}>{km}</div><div style={labelStyle}>Kilomètres de pistes</div></div>
        {snowparksClickable ? (
          <button type="button" onClick={onSnowparkClick} style={{ all: "unset", cursor: "pointer", borderRadius: 8 }} aria-label="Voir le(s) snowpark(s)">
            {snowparkMetric}
          </button>
        ) : <div>{snowparkMetric}</div>}
        <div><div style={metricStyle}>{lifts}</div><div style={labelStyle}>Remontées</div></div>
      </div>
      {SHOW_PISTE_COLOR_DETAILS && colors ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
          <div>Vertes : <strong>{formatBig(colors.green)}</strong></div>
          <div>Bleues : <strong>{formatBig(colors.blue)}</strong></div>
          <div>Rouges : <strong>{formatBig(colors.red)}</strong></div>
          <div>Noires : <strong>{formatBig(colors.black)}</strong></div>
        </div>
      ) : null}
    </div>
  );
};

/* =========================
 * Plan des pistes
 * =======================*/
/* =========================
 * Webcams
 * =======================*/
/* =========================
 * Snowpark
 * =======================*/
const SnowparkCard: React.FC<{ name: string; url?: string | null; caption?: string | null; clickable?: boolean; onClick?: () => void }> = ({
  name,
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
        <button
          type="button"
          onClick={onClick}
          style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}
          aria-label="Voir la page snowpark"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`Plan du snowpark de ${name}`}
            style={{ width: "100%", height: "auto", display: "block", borderRadius: 10, border: "1px solid #cbd5e1" }}
          />
        </button>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Plan du snowpark de ${name}`}
          style={{ width: "100%", height: "auto", display: "block", borderRadius: 10, border: "1px solid #cbd5e1" }}
        />
      )}
      {caption ? <p style={{ marginTop: 8, fontSize: 13, color: "#4b5563" }}>{caption}</p> : null}
    </Card>
  );
};

/* =========================
 * Panneaux d'infos étendus (tuiles compactes)
 * =======================*/
const StationExtraPanels: React.FC<{
  resort: Resort;
  cfg: StationWidgetsConfig | null;
  computedPistesCount: number | null;
  computedLiftsCount: number | null;
  selectedSkiArea: SkiAreaPublic | null;
}> = ({
  resort,
  cfg,
  computedPistesCount,
  computedLiftsCount,
  selectedSkiArea,
}) => {
  const router = useRouter();

  const activeStats = selectedSkiArea
    ? {
        altitudeMin: selectedSkiArea.altitude_min_m,
        altitudeMax: selectedSkiArea.altitude_max_m,
        skiAreaKm: selectedSkiArea.ski_area_km,
        pistesCount: selectedSkiArea.pistes_count,
        liftsCount: selectedSkiArea.lifts_count,
        snowparksCount: selectedSkiArea.snowparks_count ?? null,
        openDate: selectedSkiArea.forecast_open_date,
        closeDate: selectedSkiArea.forecast_close_date,
      }
    : {
        altitudeMin: resort.altitude_min_m ?? resort.altitude_base_m ?? null,
        altitudeMax: resort.altitude_max_m ?? resort.altitude_top_m ?? null,
        skiAreaKm: resort.ski_area_km,
        pistesCount: computedPistesCount,
        liftsCount: computedLiftsCount,
        snowparksCount: resort.snowparks_count,
        openDate: resort.season_open_date ?? cfg?.snow?.season?.openingDate ?? cfg?.snow?.openingDate ?? null,
        closeDate: resort.season_close_date ?? cfg?.snow?.season?.closingDate ?? cfg?.snow?.closingDate ?? null,
      };

  // Altitudes
  const altMin = activeStats.altitudeMin;
  const altMax = activeStats.altitudeMax;
  const drop =
    Number.isFinite(altMin as any) && Number.isFinite(altMax as any)
      ? Number(altMax) - Number(altMin)
      : null;

  // Saison
  const openRaw = activeStats.openDate;
  const closeRaw = activeStats.closeDate;
  // Domaine / pistes
  const km = Number.isFinite(activeStats.skiAreaKm as any) ? `${formatBig(activeStats.skiAreaKm)} km` : "—";
  const pistesTotal = formatBig(activeStats.pistesCount);

  // Snowparks
  const snowparksCountRaw = activeStats.snowparksCount;
  const snowparksLabel = formatBig(snowparksCountRaw);
  const snowparksClickable = !selectedSkiArea && typeof snowparksCountRaw === "number" && snowparksCountRaw > 0;
  const onSnowparkClick = () => router.push(`/stations/${resort.slug}/snowpark`);

  // Seul le total des remontées est affiché.
  const liftsTotal = formatBig(activeStats.liftsCount);
  const openingYear = dateYear(openRaw);
  const closingYear = dateYear(closeRaw);
  const seasonTitle = openingYear && closingYear
    ? `Saison ${openingYear}-${closingYear}`
    : `Saison${openingYear || closingYear ? ` ${openingYear || closingYear}` : ""}`;
  const seasonValues: TileValue[] = [
    { value: fmtDate(openRaw), sub: "Date d’ouverture" },
    { value: fmtDate(closeRaw), sub: "Date de fermeture" },
  ];

  return (
    <section style={{ marginTop: 18 }}>
      <div className="stations-panels-grid">
        {/* Altitude */}
        <div
          style={{
            background: "#eef2f7",
            border: "1px solid #d1d9e6",
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
                  color: "#4b5563",
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
                  color: "#4b5563",
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
                  color: "#4b5563",
                  textTransform: "uppercase",
                }}
              >
                DÉNIVELÉ
              </div>
            </div>
          </div>
        </div>

        {/* Pistes + remontées */}
        <PistesTile
          total={`${pistesTotal}`}
          km={`${km}`}
          snowparks={`${snowparksLabel}`}
          snowparkName={selectedSkiArea?.snowpark_name}
          lifts={`${liftsTotal}`}
          snowparksClickable={snowparksClickable}
          onSnowparkClick={snowparksClickable ? onSnowparkClick : undefined}
          colors={SHOW_PISTE_COLOR_DETAILS ? cfg?.pistes?.colors : undefined}
        />

        {/* Saison */}
        <Tile icon={<IconCalendar />} title={seasonTitle} values={seasonValues} stacked />
      </div>
    </section>
  );
};

/* =========================
 * Page
 * =======================*/
const LegacyResortPage: NextPage<Props> = ({ resort, cfg, departmentStations }) => {
  const router = useRouter();
  const [selectedScope, setSelectedScope] = useState<"station" | number>("station");
  const skiAreas = resort.ski_areas || [];
  const selectedSkiArea = typeof selectedScope === "number"
    ? skiAreas.find((area) => area.id === selectedScope) || null
    : null;

  const seoTitle =
    textOrEmpty(resort.meta_title) || textOrEmpty(cfg?.description?.metaTitle) ||
    `${resort.name} – Station de ski${resort.region?.name ? " • " + resort.region.name : ""}`;

  const seoDescription =
    textOrEmpty(resort.meta_description) || textOrEmpty(cfg?.description?.metaDescription) ||
    `Infos ${resort.name}${resort.region?.name ? " (" + resort.region.name + ")" : ""} : altitude, pistes, remontées, carte.`;

  const canonicalUrl = `https://www.snow-explorer.com/stations/${resort.slug}`;
  const resortRegionHref = regionHref(resort.region);

  const resolvedPistes = resolveStationPisteMap(resort, cfg?.pistes || {});
  // A large published image also serves as the thumbnail; a small image is optional.
  const mapSmall = resolvedPistes.smallMapUrl || resolvedPistes.largeMapUrl;
  const mapLarge = resolvedPistes.largeMapUrl;
  const mapCaption = resolvedPistes.caption;
  const officialMapUrl = normalizeOfficialMapUrl(resolvedPistes.officialMapUrl);

  const description = resort.description_md || cfg?.description?.html || "";
  const descriptionParagraphs = description
    ? description.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
    : [];
  // Les cartes et widgets utilisent uniquement les coordonnées publiées par la station.
  const geoLat = resort.latitude ?? null;
  const geoLon = resort.longitude ?? null;

  // Snowpark (config)
  const snowparkEnabled = isSnowparkEnabled(cfg);
  const snowparkUrl: string | null = snowparkEnabled
    ? ((cfg as any)?.snowpark?.mapUrl as string) || ((cfg as any)?.snowpark?.imageUrl as string) || null
    : null;
  const snowparkCaption: string | null = (cfg as any)?.snowpark?.caption || null;

  // clics snowpark (ligne + plan)
  const snowparksCountForCard = getSnowparksCount(cfg);
  const goSnowpark = () => router.push(`/stations/${resort.slug}/snowpark`);
  const hasValidCoordinates =
    Number.isFinite(Number(geoLat)) &&
    Number.isFinite(Number(geoLon));

  const pisteColors = SHOW_PISTE_COLOR_DETAILS ? cfg?.pistes?.colors : undefined;
  const computedPistesCount = resort.pistes_count ?? (SHOW_PISTE_COLOR_DETAILS ? sumAvailable(
    pisteColors?.green, pisteColors?.blue, pisteColors?.red, pisteColors?.black
  ) : null);
  const computedLiftsCount = resort.lifts_count ?? sumAvailable(
    cfg?.remontees?.tireFesses, cfg?.remontees?.telesieges, cfg?.remontees?.telepheriques
  );
  const webPageStructuredData = {
    "@context": "https://schema.org", "@type": "WebPage", name: seoTitle, url: canonicalUrl,
    inLanguage: "fr-FR", ...(seoDescription ? { description: seoDescription } : {}),
    ...(resort.cover_image_url ? { primaryImageOfPage: { "@type": "ImageObject", url: resort.cover_image_url } } : {}),
  };
  const breadcrumbStructuredData = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://www.snow-explorer.com/" },
      { "@type": "ListItem", position: 2, name: "Stations", item: "https://www.snow-explorer.com/stations" },
      { "@type": "ListItem", position: 3, name: resort.name, item: canonicalUrl },
    ],
  };

  return (
    <>
      <Head>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="Snow Explorer" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={canonicalUrl} />
        {resort.cover_image_url ? <meta property="og:image" content={resort.cover_image_url} /> : null}
        {resort.cover_image_url ? <meta property="og:image:alt" content={`Paysage ${resort.name}`} /> : null}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        {resort.cover_image_url ? <meta name="twitter:image" content={resort.cover_image_url} /> : null}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageStructuredData) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }} />
      </Head>

      <StationLegacyHero station={resort} />

      {/* LAYOUT */}
      <main className="station-profile-page">
        <nav className="station-profile-breadcrumb" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link><span aria-hidden="true"> &gt; </span>
          <Link href="/stations">Stations</Link><span aria-hidden="true"> &gt; </span>
          {resortRegionHref ? <><Link href={resortRegionHref}>{resort.region?.name}</Link><span aria-hidden="true"> &gt; </span></> : null}
          <span aria-current="page">{resort.name}</span>
        </nav>
        <section className="station-overview-card">
          <StationLogoFrame src={resort.logo_url} stationName={resort.name} />
          <div>
            <p className="eyebrow">Résumé</p>
            <h2>{resort.name}</h2>
            {descriptionParagraphs.length ? (
              <div className="station-description">
                {descriptionParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              </div>
            ) : (
              <p className="station-description station-description--empty">Description détaillée à venir.</p>
            )}
          </div>
        </section>

        {skiAreas.length > 0 ? (
          <div className="station-stats-scope" aria-label="Contenu affiché">
            <span>Afficher les informations de</span>
            <div className="station-stats-scope__options" role="group" aria-label="Périmètre de la fiche">
              <button type="button" className={selectedScope === "station" ? "is-active" : undefined} aria-pressed={selectedScope === "station"} onClick={() => setSelectedScope("station")}>
                La station
              </button>
              {skiAreas.map((area) => (
                <button type="button" key={area.id} className={selectedScope === area.id ? "is-active" : undefined} aria-pressed={selectedScope === area.id} onClick={() => setSelectedScope(area.id)}>
                  Domaine {area.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Le périmètre sélectionné pilote uniquement les cartes statistiques. */}
        <StationExtraPanels resort={resort} cfg={cfg} computedPistesCount={computedPistesCount} computedLiftsCount={computedLiftsCount} selectedSkiArea={selectedSkiArea} />

        {resort.website_url ? (
          <div className="station-official-site">
            <a className="btn btn--primary" href={resort.website_url} target="_blank" rel="noreferrer">
              Voir le site de {resort.name}
            </a>
          </div>
        ) : null}

        {/* Les quatre outils principaux partagent une grille 2 × 2 sur desktop. */}
        <section id="station-conditions" className="stations-layout">
          {(mapSmall || mapLarge || officialMapUrl) ? <div>
            <PlanPistesFigure name={resort.name} small={mapSmall} large={mapLarge} officialUrl={officialMapUrl} caption={mapCaption} />
          </div> : null}
          {hasValidCoordinates ? <WebcamsAuto name={resort.name} lat={geoLat} lon={geoLon} /> : null}
          {hasValidCoordinates ? <MeteoblueSkiWidget lat={geoLat} lon={geoLon} /> : null}
          <StationMapCard station={{
            id: resort.id || resort.slug, name: resort.name, slug: resort.slug,
            latitude: hasValidCoordinates ? Number(geoLat) : undefined,
            longitude: hasValidCoordinates ? Number(geoLon) : undefined,
            logo: resort.logo_url || null,
            department: typeof resort.department === "string" ? resort.department : resort.department?.name || null,
            region: resort.region?.name || null,
          }} />
          {snowparkEnabled ? <SnowparkCard
              name={resort.name}
              url={snowparkUrl}
              caption={snowparkCaption || undefined}
              clickable={snowparksCountForCard > 0}
              onClick={snowparksCountForCard > 0 ? goSnowpark : undefined}
            /> : null}
        </section>

        {/* Forfaits */}
        {hasStationForfaits(cfg) ? <div style={{ marginTop: 20, display: "grid", gap: 20 }}><StationForfaitsBlocks widgets={cfg} /></div> : null}
        {resort.ski_areas?.map(area => <SkiAreaPublicCard key={area.id} area={area} />)}
        {!resort.ski_areas?.length && departmentStations.length > 0 ? (
          <section className="ski-area-public-card">
            <header>
              <p className="eyebrow">À proximité</p>
              <h2>Autres stations du même département</h2>
            </header>
            <StationCards stations={departmentStations} />
          </section>
        ) : null}
      </main>

      <style jsx global>{`
        .stations-layout {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          align-items: stretch;
          margin-top: 16px;
        }

        .station-official-site {
          display: flex;
          justify-content: center;
          margin-top: 24px;
        }

        .stations-panels-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        /* Tablette / petit desktop : 2 colonnes de tuiles, layout simplifié */
        @media (max-width: 1024px) and (min-width: 769px) {
          .stations-layout {
            grid-template-columns: repeat(2, minmax(0, 1fr));
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

// The historical page implementations remain in this file for a quick rollback,
// but the canonical station URL now always renders the validated V3 presentation.
const ResortPage: NextPage<Props> = ({ resort, cfg, departmentStations }) => (
  <StationV3Page station={resort} widgets={cfg} departmentStations={departmentStations} />
);

/* =========================
 * SSR
 * =======================*/
export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = ctx.params?.slug as string;

  // 1) L'endpoint individuel renvoie directement l'objet station. Seul son
  // véritable statut 404 devient une page introuvable ; toute autre erreur
  // amont reste une erreur SSR.
  // Le détail station fournit les données métier (dont `ski_pass` et la
  // région). Seule la configuration des widgets reste sur un second endpoint ;
  // les deux requêtes indépendantes démarrent au même moment.
  const { stationResponse, widgets } = await loadStationPageSources(slug, {
    apiBase: getStationApiBase(),
    loadWidgets: fetchStationWidgetsConfig,
  });
  if (stationResponse.status === 404) {
    return { notFound: true };
  }
  if (!stationResponse.ok) {
    throw new Error(`[stations/[slug]] station API returned HTTP ${stationResponse.status}`);
  }

  const stationPayload: unknown = await stationResponse.json();
  if (
    !stationPayload ||
    typeof stationPayload !== "object" ||
    Array.isArray(stationPayload) ||
    typeof (stationPayload as Resort).name !== "string" ||
    typeof (stationPayload as Resort).slug !== "string"
  ) {
    throw new Error("[stations/[slug]] station API returned an invalid payload");
  }
  const loadedResort = stationPayload as Resort;
  if (isResortInactive(loadedResort)) {
    return { notFound: true };
  }

  // Le détail accepte déjà la région imbriquée et les champs plats historiques.
  // Le backend peut donc ajouter `{ id, name, slug }` sans modifier le contrat.
  const resort = resolveResortRegion(loadedResort) as Resort;

  const publishedSkiAreas = Array.isArray(resort.ski_areas)
    ? resort.ski_areas.filter((area) => area?.status === "published")
    : [];
  let departmentStations: import("@/types/skiArea").StationOption[] = [];
  if (publishedSkiAreas.length === 0 && resort.department) {
    try {
      const activeResorts = await fetchActiveResortsServer();
      departmentStations = getDepartmentResorts(activeResorts, resort.department, resort.slug).map((station) => ({
        id: station.id,
        name: station.name,
        slug: station.slug,
        cover_image_url: station.cover_image_url || null,
        logo_url: station.logo_url || station.logoUrl || null,
        is_active: station.is_active,
      }));
    } catch (error) {
      console.error(`[stations/[slug]] department stations request failed for ${slug}`, error instanceof Error ? error.message : "unknown_error");
    }
  }

  // 2) Widgets config
  let cfg: StationWidgetsConfig | null = widgets.config;
  if (widgets.error) {
    const e: any = widgets.error;
    if (e?.status === 404) {
      console.info(`[stations/[slug]] widgets not configured for ${slug}`);
    } else {
      console.error(`[stations/[slug]] widgets request failed for ${slug}`, e instanceof Error ? e.message : "unknown_error");
    }
    cfg = null;
  }

  const stationForfaits = resolveStationForfaits(cfg?.forfaits, loadedResort.ski_pass);
  const normalizedForfaits = stationForfaits.normalizedForfaits;

  // Une station peut publier un forfait normalisé même sans configuration de
  // widgets legacy. Dans ce cas, conserver un socle désactivé permet tout de
  // même de rendre le forfait fourni par la réponse individuelle.
  if (!cfg && normalizedForfaits) {
    cfg = {
      stationSlug: resort.slug,
      pistes: { enabled: false },
      meteo: { enabled: false },
      description: { enabled: false },
      forfaits: { enabled: false, columns: [], items: [] },
      webcams: { enabled: false, items: [] },
      snow: { enabled: false },
      snowpark: { enabled: false },
    };
  }

  const resolvedPistes = resolveStationPisteMap(resort, cfg?.pistes || {});
  const cleanCfg: StationWidgetsConfig | null = cfg ? {
    stationSlug: resort.slug,
    pistes: {
      enabled: resolvedPistes.enabled,
      smallMapUrl: resolvedPistes.smallMapUrl,
      largeMapUrl: resolvedPistes.largeMapUrl,
      officialMapUrl: resolvedPistes.officialMapUrl,
      caption: resolvedPistes.caption,
      ...(SHOW_PISTE_COLOR_DETAILS && cfg.pistes?.colors ? { colors: cfg.pistes.colors } : {}),
    },
    meteo: { enabled: Boolean(cfg.meteo?.enabled), iframeUrl: cfg.meteo?.iframeUrl || null },
    description: {
      enabled: Boolean(cfg.description?.enabled),
      html: cfg.description?.html || null,
      metaTitle: cfg.description?.metaTitle || null,
      metaDescription: cfg.description?.metaDescription || null,
    },
    forfaits: stationForfaits.forfaits,
    ...(normalizedForfaits ? { normalizedForfaits } : {}),
    webcams: { enabled: Boolean(cfg.webcams?.enabled), items: cfg.webcams?.items || [] },
    snow: {
      enabled: Boolean(cfg.snow?.enabled),
      iframeUrl: cfg.snow?.iframeUrl || null,
      openingDate: cfg.snow?.openingDate || null,
      closingDate: cfg.snow?.closingDate || null,
      ...(cfg.snow?.season ? { season: {
        openingDate: cfg.snow.season.openingDate || null,
        closingDate: cfg.snow.season.closingDate || null,
      } } : {}),
    },
    snowpark: {
      enabled: Boolean(cfg.snowpark?.enabled),
      mapUrl: cfg.snowpark?.mapUrl || null,
      imageUrl: cfg.snowpark?.imageUrl || null,
      caption: cfg.snowpark?.caption || null,
    },
    ...(cfg.remontees ? { remontees: cfg.remontees } : {}),
    ...(cfg.snowparks ? { snowparks: cfg.snowparks } : {}),
  } : null;

  // Ne pas transmettre aveuglément la réponse métier : seules les propriétés
  // effectivement consommées par la fiche publique sont sérialisées.
  const stationForPage: Resort = {
    name: resort.name,
    slug: resort.slug,
    ...(resort.region ? { region: resort.region } : {}),
    ...(resort.department ? { department: resort.department } : {}),
    altitude_base_m: resort.altitude_base_m ?? null,
    altitude_top_m: resort.altitude_top_m ?? null,
    altitude_min_m: resort.altitude_min_m ?? null,
    altitude_max_m: resort.altitude_max_m ?? null,
    ski_area_km: resort.ski_area_km ?? null,
    lifts_count: resort.lifts_count ?? null,
    pistes_count: resort.pistes_count ?? null,
    snowparks_count: resort.snowparks_count ?? null,
    latitude: resort.latitude ?? null,
    longitude: resort.longitude ?? null,
    website_url: resort.website_url ?? null,
    cover_image_url: resort.cover_image_url ?? null,
    logo_url: resort.logo_url ?? null,
    description_md: resort.description_md ?? null,
    meta_title: resort.meta_title ?? null,
    meta_description: resort.meta_description ?? null,
    season_open_date: resort.season_open_date ?? null,
    season_close_date: resort.season_close_date ?? null,
    pistes_small_map_url: resort.pistes_small_map_url ?? null,
    pistes_large_map_url: resort.pistes_large_map_url ?? null,
    pistes_caption: resort.pistes_caption ?? null,
    ski_pass: resort.ski_pass ?? null,
    ski_areas: publishedSkiAreas,
    v2_overview_html: resort.v2_overview_html ?? null,
    v2_weather_snow_html: resort.v2_weather_snow_html ?? null,
    v2_ski_pass_html: resort.v2_ski_pass_html ?? null,
    v2_piste_map_html: resort.v2_piste_map_html ?? null,
    v2_webcam_html: resort.v2_webcam_html ?? null,
    ...(resort.v2 ? { v2: resort.v2 } : {}),
    ...(resort.public_v2 ? { public_v2: resort.public_v2 } : {}),
    ...(resort.v2_content ? { v2_content: resort.v2_content } : {}),
    ...(resort.v2_contents ? { v2_contents: resort.v2_contents } : {}),
    ...(resort.v2_published_sections ? { v2_published_sections: resort.v2_published_sections } : {}),
    ...(resort.pistes_colors ? { pistes_colors: resort.pistes_colors } : {}),
    elevation_drop_m: resort.elevation_drop_m ?? null,
    vertical_drop_m: resort.vertical_drop_m ?? null,
    ...(Array.isArray(resort.webcams) ? { webcams: resort.webcams } : {}),
  };

  return { props: { resort: stationForPage, cfg: cleanCfg, departmentStations } };
};

export default ResortPage;
