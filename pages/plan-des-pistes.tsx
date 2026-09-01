import Head from "next/head";
import type { GetServerSideProps, NextPage } from "next";
import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Map, MapPin, Search } from "lucide-react";
import { fetchActiveResortsServer } from "@/lib/api/resorts";
import { getOfficialMapPresentation } from "@/lib/officialMap";
import type { Resort } from "@/lib/api/resorts";
import { getDirectoryPistes, getPistes, type PublicPisteMap } from "@/lib/publicPisteMap";

type Props = { initialStations: Resort[] };

const PlanDesPistesPage: NextPage<Props> = ({ initialStations }) => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Resort | null>(null);
  const [legacyPistes, setLegacyPistes] = useState<PublicPisteMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mobileSelection, setMobileSelection] = useState<Resort | null>(null);
  const [mobilePickerOpen, setMobilePickerOpen] = useState(true);
  const pickerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLElement>(null);

  const filteredStations = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return initialStations.filter((station) => !needle || `${station.name} ${station.region?.name || ""} ${station.department?.name || ""}`.toLocaleLowerCase("fr").includes(needle));
  }, [initialStations, query]);

  async function selectStation(station: Resort) {
    setMapOpen(false);
    setSelected(station);
    setLegacyPistes(null);
    setMobileSelection(station);
    setMobilePickerOpen(false);
    if (window.matchMedia("(max-width: 640px)").matches) {
      window.requestAnimationFrame(() => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        contentRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      });
    }
    const directoryPistes = getDirectoryPistes(station);
    if (directoryPistes) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/ski/stations/${encodeURIComponent(station.slug)}-widgets`);
      if (!response.ok) throw new Error("widgets_fetch_failed");
      setLegacyPistes(getPistes(await response.json()));
    } catch {
      setLegacyPistes({});
    } finally {
      setLoading(false);
    }
  }

  function reopenMobilePicker() {
    setMobilePickerOpen(true);
    window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      pickerRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  }

  const pistes = selected ? (getDirectoryPistes(selected) || legacyPistes) : null;
  const mapUrl = pistes && (pistes.largeMapUrl || pistes.smallMapUrl);
  const officialMapUrl = pistes?.officialMapUrl;
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
          <aside ref={pickerRef} className={`station-picker passes-picker${mobileSelection && !mobilePickerOpen ? " station-picker--collapsed" : ""}`} aria-label="Choisir une station">
            {mobileSelection && <div className="station-picker__mobile-summary"><div className="station-picker__selected"><MapPin size={20} aria-hidden="true" /><div><span>Station sélectionnée</span><strong>{mobileSelection.name}</strong></div></div><button type="button" onClick={reopenMobilePicker} aria-expanded={mobilePickerOpen}><span>Changer</span><ChevronDown size={18} aria-hidden="true" /></button></div>}
            <div className="station-picker__controls">
              <div className="section-heading"><div><p className="eyebrow">Stations disponibles</p><h2>Choisir une station</h2></div>{query && <span>{filteredStations.length} résultat(s)</span>}</div>
              <label className="passes-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Rechercher une station</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, région, département…" /></label>
              <div className="station-list" role="listbox" aria-label="Stations actives">
                {filteredStations.map((station) => <div className={(selected?.slug || mobileSelection?.slug) === station.slug ? "station-choice is-selected" : "station-choice"} key={station.id || station.slug}><button type="button" role="option" aria-selected={(selected?.slug || mobileSelection?.slug) === station.slug} onClick={() => void selectStation(station)}><strong>{station.name}</strong><span>{station.region?.name || station.department?.name || "Station de ski"}</span></button></div>)}
                {query && filteredStations.length === 0 && <div className="empty-state"><strong>Aucune station trouvée</strong><span>Essayez un nom plus court ou une région proche.</span></div>}
              </div>
            </div>
          </aside>

          <section ref={contentRef} className="passes-content" aria-live="polite">
            {!selected && !loading && <div className="passes-welcome"><span><Map size={30} /></span><p className="eyebrow">Le domaine en un coup d’œil</p><h2>Choisissez une station</h2><p>Sélectionnez une station pour afficher son plan des pistes.</p></div>}
            {loading && <div className="skeleton-panel skeleton-panel--large"><div /><div /><div /></div>}
            {selected && !loading && <div className="passes-result"><header><div><p className="eyebrow">Plan du domaine</p><h2>Plan des pistes de {selected.name}</h2><p>{selected.region?.name || selected.department?.name || "Station de ski"}</p></div><Link href={`/stations/${selected.slug}`} className="btn btn--secondary">Voir la station <ArrowRight size={17} /></Link></header>
              {mapUrl ? <figure className="pistes-map"><button type="button" onClick={() => setMapOpen(true)} aria-label={`Agrandir le plan des pistes de ${selected.name}`}><img src={mapUrl} alt={`Plan des pistes de ${selected.name}`} /></button>{pistes?.caption && <figcaption>{pistes.caption}</figcaption>}</figure> : officialMap ? <div className="pistes-official-link"><Map size={38} /><strong>Plan officiel de {selected.name}</strong><p>Le plan est proposé sur le site officiel de la station.</p><button type="button" className="btn btn--primary" onClick={() => setMapOpen(true)}>Ouvrir le plan</button></div> : <div className="notice notice--warning"><strong>Plan indisponible</strong><span>Aucun plan des pistes n’est actuellement renseigné pour {selected.name}.</span></div>}
            </div>}
          </section>
        </section>

        {mapOpen && selected && (mapUrl || officialMap) && <div className="pistes-modal-backdrop" onClick={() => setMapOpen(false)} role="presentation"><div className={mapUrl ? "pistes-modal pistes-modal--image" : "pistes-modal pistes-modal--official"} role="dialog" aria-modal="true" aria-label={`Plan des pistes de ${selected.name}`} onClick={(event) => event.stopPropagation()}><button type="button" className="pistes-modal__close" onClick={() => setMapOpen(false)} aria-label="Fermer">×</button>{mapUrl ? <><img src={mapUrl} alt={`Plan des pistes de ${selected.name}`} />{pistes?.caption && <p>{pistes.caption}</p>}</> : officialMap ? <iframe src={officialMap.embedUrl} title={`Plan des pistes officiel de ${selected.name}`} referrerPolicy="strict-origin-when-cross-origin" allow={officialMap.provider === "calameo" ? "fullscreen" : undefined} allowFullScreen={officialMap.provider === "calameo"} /> : null}</div></div>}
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async () => ({ props: { initialStations: await fetchActiveResortsServer() } });

export default PlanDesPistesPage;
