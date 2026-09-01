import type { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, MapPin } from "lucide-react";
import SkiWeatherWidget from "@/components/SkiWeatherWidget";
import { fetchActiveResortsServer, type Resort } from "@/lib/api/resorts";

type StationWidgets = { meteo?: { enabled?: boolean; iframeUrl?: string | null; iframe_url?: string | null }; widgets?: { meteo?: { enabled?: boolean; iframeUrl?: string | null; iframe_url?: string | null } } };

type Props = { initialStations: Resort[] };

const MeteoPage: NextPage<Props> = ({ initialStations }) => {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Resort | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [loadingWidget, setLoadingWidget] = useState(false);
  const [mobilePickerOpen, setMobilePickerOpen] = useState(true);
  const pickerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLElement>(null);

  const selectStation = (station: Resort) => {
    setSelected(station);
    setMobilePickerOpen(false);

    if (window.matchMedia("(max-width: 640px)").matches) {
      window.requestAnimationFrame(() => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        contentRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      });
    }
  };

  const reopenMobilePicker = () => {
    setMobilePickerOpen(true);
    window.requestAnimationFrame(() => pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const filteredStations = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? initialStations.filter((station) => `${station.name} ${station.region?.name || ""} ${station.department?.name || ""}`.toLowerCase().includes(needle)) : initialStations;
  }, [q, initialStations]);

  useEffect(() => {
    async function loadWidget() {
      if (!selected?.slug) { setIframeUrl(null); return; }
      const directoryMeteo = selected.meteo || selected.widgets?.meteo;
      const directoryIframeUrl = directoryMeteo?.iframeUrl || directoryMeteo?.iframe_url || null;
      if (directoryIframeUrl || directoryMeteo?.enabled === false) {
        setIframeUrl(directoryIframeUrl);
        setLoadingWidget(false);
        return;
      }
      setLoadingWidget(true);
      try {
        const r = await fetch(`/api/ski/stations/${encodeURIComponent(selected.slug)}-widgets`);
        if (!r.ok) throw new Error("station_fetch_failed");
        const detail: StationWidgets = await r.json();
        setIframeUrl(detail?.meteo?.iframeUrl || detail?.meteo?.iframe_url || detail?.widgets?.meteo?.iframeUrl || detail?.widgets?.meteo?.iframe_url || null);
      } catch { setIframeUrl(null); }
      finally { setLoadingWidget(false); }
    }
    loadWidget();
  }, [selected]);

  return (
    <>
      <Head>
        <title>Météo des stations de ski en France | Snow Explorer</title>
        <meta name="description" content="Consultez la météo des stations de ski : températures, neige, vent, visibilité et prévisions pour préparer votre séjour à la montagne." />
        <link rel="canonical" href="https://www.snow-explorer.com/meteo" />
      </Head>
      <main className="weather-page">
      <section className="weather-page__hero"><div><p className="eyebrow">Météo montagne</p><h1>Météo des stations</h1><p>Consultez rapidement les conditions utiles pour préparer une sortie : température, neige, vent, visibilité et prévisions.</p></div><div className="notice notice--info"><strong>Conseil sortie</strong><span>Les données sont indicatives et peuvent évoluer rapidement en altitude.</span></div></section>
      <section className="weather-layout">
        <aside ref={pickerRef} className={`station-picker${selected && !mobilePickerOpen ? " station-picker--collapsed" : ""}`} aria-label="Choisir une station">
          {selected && <div className="station-picker__mobile-summary"><div className="station-picker__selected"><MapPin size={20} aria-hidden="true" /><div><span>Station sélectionnée</span><strong>{selected.name}</strong></div></div><button type="button" onClick={reopenMobilePicker} aria-expanded={mobilePickerOpen}><span>Changer</span><ChevronDown size={18} aria-hidden="true" /></button></div>}
          <div className="station-picker__controls">
            <div className="section-heading"><div><p className="eyebrow">Recherche</p><h2>Choisir une station</h2></div>{q && <span>{filteredStations.length} résultat(s)</span>}</div>
            <label className="field"><span>Station ou région</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex. Auron, Chamonix, Alpes…" /></label>
            <div className="station-list" role="listbox">{filteredStations.map((station) => <div className={selected?.slug === station.slug ? "station-choice is-selected" : "station-choice"} key={station.id || station.slug}><button type="button" role="option" aria-selected={selected?.slug === station.slug} onClick={() => selectStation(station)}><strong>{station.name}</strong><span>{station.region?.name || "Station de ski"}</span></button></div>)}{q && filteredStations.length === 0 && <div className="empty-state"><strong>Aucune station trouvée</strong><span>Essayez un nom plus court ou une région proche.</span></div>}</div>
          </div>
        </aside>
        <section ref={contentRef} className="weather-content">
          {selected && <div className="weather-content__station"><div><p className="eyebrow">Station sélectionnée</p><h2>Météo à {selected.name}</h2></div><Link href={`/stations/${selected.slug}`} className="btn btn--secondary">Voir la station <ArrowRight size={17} /></Link></div>}
          {!selected && <div className="empty-state empty-state--hero"><strong>Choisissez une station</strong><span>Sélectionnez une station pour consulter ses conditions météo et ses prévisions.</span></div>}{loadingWidget && <div className="skeleton-panel skeleton-panel--large"><div /><div /><div /></div>}{selected && !loadingWidget && iframeUrl && <div className="embedded-weather"><iframe src={iframeUrl} title={`Météo ${selected.name}`} loading="lazy" /></div>}{selected && !loadingWidget && !iframeUrl && selected.latitude != null && selected.longitude != null && <SkiWeatherWidget name={selected.name} lat={selected.latitude} lon={selected.longitude} />}{selected && !loadingWidget && !iframeUrl && !(selected.latitude != null && selected.longitude != null) && <div className="notice notice--warning"><strong>Météo indisponible</strong><span>Aucun widget météo ou coordonnées ne sont configurés pour {selected.name}.</span></div>}
        </section>
      </section>
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async () => ({ props: { initialStations: await fetchActiveResortsServer() } });

export default MeteoPage;
