import { stationNameAt } from "@/lib/stationName";
import { parseCoordinate } from "@/lib/stationAutomaticData";
import type { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import React, { useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, MapPin } from "lucide-react";
import FollowStationButton from "@/components/newsletter/FollowStationButton";
import StationWeather from "@/components/weather/StationWeather";
import { fetchActiveResortsServer, type Resort } from "@/lib/api/resorts";
import { matchesSearch, normalizeSearchText } from "@/lib/searchNormalization";

type Props = { initialStations: Resort[] };

const MeteoPage: NextPage<Props> = ({ initialStations }) => {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Resort | null>(null);
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
    window.requestAnimationFrame(() => pickerRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  };

  const filteredStations = useMemo(() => {
    const needle = normalizeSearchText(q);
    return needle ? initialStations.filter((station) => matchesSearch(`${station.name} ${station.region?.name || ""} ${station.department?.name || ""}`, needle)) : initialStations;
  }, [q, initialStations]);

  const lat = parseCoordinate(selected?.latitude, 90);
  const lon = parseCoordinate(selected?.longitude, 180);

  return (
    <>
      <Head>
        <title>Météo neige et enneigement des stations de ski | Snow Explorer</title>
        <meta name="description" content="Consultez la météo des stations de ski, les prévisions neige et les données d’enneigement disponibles sur Snow Explorer." />
        <link rel="canonical" href="https://www.snow-explorer.com/meteo" />
      </Head>
      <main className="weather-page">
      <section className="weather-page__hero"><div><p className="eyebrow">Météo montagne</p><h1>Météo et enneigement des stations de ski</h1><p>Consultez la météo des stations de ski et les données d’enneigement disponibles sur Snow Explorer. Retrouvez les prévisions utiles avant de skier et, lorsque les données sont renseignées, les observations Météo-France au poste de mesure et les prévisions Open-Meteo.</p></div><div className="notice notice--info"><strong>Conseil sortie</strong><span>Les données sont indicatives et peuvent évoluer rapidement en altitude.</span></div></section>
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
          {selected && <div className="weather-content__station"><div><p className="eyebrow">Station sélectionnée</p><h2>Météo {stationNameAt(selected.name)}</h2></div><Link href={`/stations/${selected.slug}`} className="btn btn--secondary">Voir la station <ArrowRight size={17} /></Link></div>}
          {selected && <div className="weather-email-subscription"><div><strong>La météo de {selected.name} par email</strong><p>Choisissez la fréquence et retrouvez cet abonnement dans vos préférences.</p></div><FollowStationButton stationId={selected.id} stationName={selected.name} topic="weather" label="Recevoir la météo de cette station" /></div>}
          {!selected && <div className="empty-state empty-state--hero"><strong>Choisissez une station</strong><span>Sélectionnez une station pour consulter ses conditions météo et ses prévisions.</span></div>}{selected && <StationWeather slug={selected.slug} name={selected.name} latitude={lat} longitude={lon} />}
        </section>
      </section>
      <section className="directory-editorial">
        <div><h2>Météo neige des stations de ski</h2><p>La météo en montagne peut varier rapidement selon l’altitude et le secteur. Snow Explorer permet de retrouver les informations météorologiques disponibles pour les stations référencées et d’accéder rapidement à leur fiche détaillée.</p></div>
        <div><h2>Enneigement et hauteur de neige</h2><p>Les données d’enneigement complètent les prévisions météo pour mieux comprendre les conditions présentes en station. Lorsque l’information est disponible, Snow Explorer affiche la hauteur de neige mesurée au poste Météo-France, avec son altitude, sa distance à la station et la date réelle du relevé.</p></div>
      </section>
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async () => ({ props: { initialStations: await fetchActiveResortsServer() } });

export default MeteoPage;
