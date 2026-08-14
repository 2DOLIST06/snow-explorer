import Head from "next/head";
import type { GetServerSideProps, NextPage } from "next";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Map, Search } from "lucide-react";
import { fetchActiveResortsServer } from "@/lib/api/resorts";
import { getOfficialMapPresentation } from "@/lib/officialMap";

type Resort = {
  id?: string;
  name: string;
  slug: string;
  region?: { name?: string };
  department?: { name?: string };
};

type Pistes = {
  enabled?: boolean;
  smallMapUrl?: string | null;
  largeMapUrl?: string | null;
  officialMapUrl?: string | null;
  caption?: string | null;
};

type SelectedResort = Resort & { pistes: Pistes };
type Props = { initialStations: Resort[] };

function safeMapUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getPistes(payload: any): Pistes {
  const pistes = payload?.pistes || payload?.widgets?.pistes || {};
  return {
    enabled: pistes.enabled !== false,
    smallMapUrl: safeMapUrl(pistes.smallMapUrl || pistes.small_map_url),
    largeMapUrl: safeMapUrl(pistes.largeMapUrl || pistes.large_map_url),
    officialMapUrl: safeMapUrl(pistes.officialMapUrl || pistes.official_map_url),
    caption: typeof pistes.caption === "string" ? pistes.caption : null,
  };
}

const PlanDesPistesPage: NextPage<Props> = ({ initialStations }) => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SelectedResort | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const filteredStations = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return initialStations.filter((station) => !needle || `${station.name} ${station.region?.name || ""} ${station.department?.name || ""}`.toLocaleLowerCase("fr").includes(needle));
  }, [initialStations, query]);

  async function selectStation(station: Resort) {
    setMapOpen(false);
    setLoading(true);
    setSelected(null);
    try {
      const response = await fetch(`/api/ski/stations/${encodeURIComponent(station.slug)}-widgets`);
      if (!response.ok) throw new Error("widgets_fetch_failed");
      setSelected({ ...station, pistes: getPistes(await response.json()) });
    } catch {
      setSelected({ ...station, pistes: {} });
    } finally {
      setLoading(false);
    }
  }

  const mapUrl = selected && (selected.pistes.largeMapUrl || selected.pistes.smallMapUrl);
  const officialMapUrl = selected?.pistes.officialMapUrl;
  const officialMap = getOfficialMapPresentation(officialMapUrl);

  useEffect(() => {
    if (!mapOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMapOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mapOpen]);

  return (
    <>
      <Head>
        <title>Plans des pistes des stations de ski | Snow Explorer</title>
        <meta name="description" content="Consultez le plan des pistes de votre station de ski et préparez vos itinéraires sur le domaine skiable." />
        <link rel="canonical" href="https://www.snow-explorer.com/plan-des-pistes" />
      </Head>
      <main className="passes-page">
        <section className="passes-hero">
          <div><p className="eyebrow">Domaines skiables</p><h1>Plans des pistes des stations</h1><p>Choisissez une station et consultez son plan des pistes pour repérer les secteurs, les remontées mécaniques et préparer vos itinéraires.</p></div>
          <div className="passes-hero__ticket" aria-hidden="true"><Map size={34} /><span>Repérez votre parcours</span><strong>Avant de skier</strong></div>
        </section>

        <section className="passes-layout">
          <aside className="station-picker passes-picker" aria-label="Choisir une station">
            <div className="section-heading"><div><p className="eyebrow">Stations disponibles</p><h2>Choisir une station</h2></div>{query && <span>{filteredStations.length} résultat(s)</span>}</div>
            <label className="passes-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Rechercher une station</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, région, département…" /></label>
            <div className="station-list" role="listbox" aria-label="Stations actives">
              {filteredStations.map((station) => <div className={selected?.slug === station.slug ? "station-choice is-selected" : "station-choice"} key={station.id || station.slug}><button type="button" role="option" aria-selected={selected?.slug === station.slug} onClick={() => void selectStation(station)}><strong>{station.name}</strong><span>{station.region?.name || station.department?.name || "Station de ski"}</span></button></div>)}
              {query && filteredStations.length === 0 && <div className="empty-state"><strong>Aucune station trouvée</strong><span>Essayez un nom plus court ou une région proche.</span></div>}
            </div>
          </aside>

          <section className="passes-content" aria-live="polite">
            {!selected && !loading && <div className="passes-welcome"><span><Map size={30} /></span><p className="eyebrow">Le domaine en un coup d’œil</p><h2>Choisissez une station</h2><p>Sélectionnez une station pour afficher son plan des pistes.</p></div>}
            {loading && <div className="skeleton-panel skeleton-panel--large"><div /><div /><div /></div>}
            {selected && <div className="passes-result"><header><div><p className="eyebrow">Plan du domaine</p><h2>Plan des pistes de {selected.name}</h2><p>{selected.region?.name || selected.department?.name || "Station de ski"}</p></div><Link href={`/stations/${selected.slug}`} className="btn btn--secondary">Voir la station <ArrowRight size={17} /></Link></header>
              {mapUrl ? <figure className="pistes-map"><button type="button" onClick={() => setMapOpen(true)} aria-label={`Agrandir le plan des pistes de ${selected.name}`}><img src={mapUrl} alt={`Plan des pistes de ${selected.name}`} /></button>{selected.pistes.caption && <figcaption>{selected.pistes.caption}</figcaption>}</figure> : officialMap ? <div className="pistes-official-link"><Map size={38} /><strong>Plan officiel de {selected.name}</strong><p>Le plan est proposé sur le site officiel de la station.</p><button type="button" className="btn btn--primary" onClick={() => setMapOpen(true)}>Ouvrir le plan</button></div> : <div className="notice notice--warning"><strong>Plan indisponible</strong><span>Aucun plan des pistes n’est actuellement renseigné pour {selected.name}.</span></div>}
            </div>}
          </section>
        </section>

        {mapOpen && selected && (mapUrl || officialMap) && <div className="pistes-modal-backdrop" onClick={() => setMapOpen(false)} role="presentation"><div className={mapUrl ? "pistes-modal pistes-modal--image" : "pistes-modal pistes-modal--official"} role="dialog" aria-modal="true" aria-label={`Plan des pistes de ${selected.name}`} onClick={(event) => event.stopPropagation()}><button type="button" className="pistes-modal__close" onClick={() => setMapOpen(false)} aria-label="Fermer">×</button>{mapUrl ? <><img src={mapUrl} alt={`Plan des pistes de ${selected.name}`} />{selected.pistes.caption && <p>{selected.pistes.caption}</p>}</> : officialMap ? <iframe src={officialMap.embedUrl} title={`Plan des pistes officiel de ${selected.name}`} referrerPolicy="strict-origin-when-cross-origin" allow={officialMap.provider === "calameo" ? "fullscreen" : undefined} allowFullScreen={officialMap.provider === "calameo"} /> : null}</div></div>}
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async () => ({ props: { initialStations: await fetchActiveResortsServer() } });

export default PlanDesPistesPage;
