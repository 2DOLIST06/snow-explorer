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

type Piste = {
  id: string;
  resort_id: string;
  difficulty?: string | null;
  color?: string | null;
  length_m?: number | null;
};

type Lift = {
  id: string;
  resort_id: string;
  type?: string | null;
  category?: string | null;
};

interface Props {
  slug: string;
  resort: Resort | null;
  pistes: Piste[];
  lifts: Lift[];
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
  <svg width="18" height="18" viewBox
