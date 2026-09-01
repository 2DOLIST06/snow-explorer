import Head from "next/head";
import type { GetServerSideProps, NextPage } from "next";
import Link from "next/link";
import React, { useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, MapPin, Search, ShieldCheck, Ticket } from "lucide-react";
import StationForfaitsBlock from "@/components/stations/StationForfaitsBlock";
import type { StationWidgetsConfig } from "@/types/station";
import type { SkiPassSeason } from "@/types/skiPass";
import { fetchActiveResortsServer } from "@/lib/api/resorts";
import { getSkiPassBlocksVisibility } from "@/lib/skiPassVisibility";
import { normalizeLegacyStationForfaits, normalizeStationSkiPass } from "@/lib/stationForfaits";

type Resort = {
  id?: string;
  name: string;
  slug: string;
  is_active?: boolean;
  region?: { name?: string };
  department?: { name?: string };
  ski_pass?: SkiPassSeason | null;
};

type AvailableResort = Resort & {
  forfaits: StationWidgetsConfig["forfaits"];
  normalizedForfaits?: StationWidgetsConfig["normalizedForfaits"];
};
type Props = { initialStations: Resort[] };

const ForfaitsPage: NextPage<Props> = ({ initialStations }) => {
  const [query, setQuery] = useState("");
  const [stations] = useState<Resort[]>(initialStations);
  const [selected, setSelected] = useState<AvailableResort | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [mobileSelection, setMobileSelection] = useState<Resort | null>(null);
  const [mobilePickerOpen, setMobilePickerOpen] = useState(true);
  const pickerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLElement>(null);

  async function selectStation(station: Resort) {
    setLoading(true);
    setLoadError(false);
    setSelected(null);
    setMobileSelection(station);
    setMobilePickerOpen(false);
    if (window.matchMedia("(max-width: 640px)").matches) {
      window.requestAnimationFrame(() => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        contentRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      });
    }
    try {
      const encodedSlug = encodeURIComponent(station.slug);
      const response = await fetch(`/api/ski/stations/${encodedSlug}-ski-passes`);
      if (!response.ok) throw new Error("ski_passes_fetch_failed");
      const payload = await response.json();
      const forfaits = normalizeLegacyStationForfaits(payload.legacy_forfaits);
      const normalizedForfaits = normalizeStationSkiPass(payload.ski_pass);
      setSelected({ ...station, forfaits, ...(normalizedForfaits ? { normalizedForfaits } : {}) });
    } catch {
      setLoadError(true);
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

  const filteredStations = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return stations.filter((station) => !needle || `${station.name} ${station.region?.name || ""} ${station.department?.name || ""}`.toLocaleLowerCase("fr").includes(needle));
  }, [query, stations]);

  const visibility = getSkiPassBlocksVisibility(
    Boolean(selected?.forfaits?.enabled),
    Boolean(selected?.normalizedForfaits?.enabled),
  );

  return (
    <>
      <Head>
        <title>Prix des forfaits de ski par station | Snow Explorer</title>
        <meta name="description" content="Comparez les prix des forfaits de ski disponibles par station et préparez votre séjour à la montagne avec Snow Explorer." />
        <link rel="canonical" href="https://www.snow-explorer.com/forfaits" />
      </Head>
      <main className="passes-page">
        <section className="passes-hero">
          <div>
            <p className="eyebrow">Tarifs en station</p>
            <h1>Prix des forfaits de ski dans les stations</h1>
            <p>Choisissez une station et retrouvez immédiatement les tarifs de forfaits renseignés : journée, séjour, adulte ou enfant selon les offres disponibles.</p>
          </div>
          <div className="passes-hero__ticket" aria-hidden="true"><Ticket size={34} /><span>Préparez votre budget</span><strong>Avant de partir</strong></div>
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
            {!selected && !loading && <div className="passes-welcome"><span><Ticket size={30} /></span><p className="eyebrow">Tarifs en un coup d’œil</p><h2>Choisissez une station</h2><p>Sélectionnez une station pour consulter les informations disponibles sur les forfaits.</p></div>}
            {loading && <div className="skeleton-panel skeleton-panel--large"><div /><div /><div /></div>}
            {loadError && !loading && <div className="notice notice--warning" role="alert"><strong>Forfaits indisponibles</strong><span>Impossible de charger les tarifs de {mobileSelection?.name || "cette station"}. Réessayez en sélectionnant à nouveau la station.</span></div>}
            {selected && <div className="passes-result"><header><div><p className="eyebrow">Tarifs publiés</p><h2>Forfaits à {selected.name}</h2><p>{selected.region?.name || selected.department?.name || "Station de ski"}</p></div><Link href={`/stations/${selected.slug}`} className="btn btn--secondary">Voir la station <ArrowRight size={17} /></Link></header>{visibility.any ? <><StationForfaitsBlock
              enabled={visibility.legacy}
              columns={selected.forfaits?.columns || []}
              items={selected.forfaits?.items || []}
              periods={selected.forfaits?.periods || []}
              season={selected.forfaits?.season}
              source_url={selected.forfaits?.source_url}
              sourceUrl={selected.forfaits?.sourceUrl}
            /><StationForfaitsBlock
              enabled={visibility.normalized}
              periods={selected.normalizedForfaits?.periods || []}
              season={selected.normalizedForfaits?.season}
              source_url={selected.normalizedForfaits?.source_url}
            /><p className="passes-disclaimer"><ShieldCheck size={18} /> Tarifs indicatifs communiqués par la station. Vérifiez les conditions et le prix final avant votre achat.</p></> : <div className="notice notice--warning"><strong>Forfaits indisponibles</strong><span>Aucun tarif actif n’est actuellement renseigné pour {selected.name}.</span></div>}</div>}
          </section>
        </section>

        <section className="passes-seo">
          <p className="eyebrow">Bien préparer son séjour</p>
          <h2>Comment choisir son forfait de ski ?</h2>
          <div><p>Le prix d’un forfait de ski dépend notamment de la durée, de l’âge du skieur, de la période et de l’étendue du domaine skiable. Comparer les formules avant le départ permet de choisir celle qui correspond vraiment à votre séjour.</p><p>Les stations peuvent proposer des tarifs journée, plusieurs jours, famille ou saison. Pensez à vérifier les dates de validité, les justificatifs demandés et les éventuelles conditions de réservation en ligne.</p></div>
        </section>
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async () => ({ props: { initialStations: await fetchActiveResortsServer() } });

export default ForfaitsPage;
