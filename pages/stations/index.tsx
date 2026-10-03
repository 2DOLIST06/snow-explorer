import type { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Map as MapIcon, MapPin, Maximize2, Minimize2, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { regionHref } from "@/lib/regions";
import { fetchActiveResortsServer, type Resort } from "@/lib/api/resorts";
import { fetchAllPublicSkiAreasWithStations } from "@/lib/api/skiAreas";
import type { SkiAreaPublic } from "@/types/skiArea";
import { matchesSearch, normalizeSearchText } from "@/lib/searchNormalization";
import StationMap from "@/components/maps/StationMapDynamic";
import { fetchStationMapServer } from "@/lib/api/stationMap";
import type { StationMapItem } from "@/types/stationMap";
import { getDepartmentOptions, getSkiAreaOptions, getSkiAreaStationIds, getStationDepartment, matchesStationLocation } from "@/lib/stationDirectoryFilters";

type Props = { initialStations: Resort[]; mapStations: StationMapItem[]; skiAreas: SkiAreaPublic[] };

const StationsList: NextPage<Props> = ({ initialStations, mapStations, skiAreas }) => {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [department, setDepartment] = useState("");
  const [skiArea, setSkiArea] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [mapExpanded, setMapExpanded] = useState(false);

  const selectedSkiAreaStationIds = useMemo(
    () => getSkiAreaStationIds(skiAreas, skiArea),
    [skiArea, skiAreas],
  );

  const data = useMemo(() => {
    const needle = normalizeSearchText(q);
    return initialStations.filter((station) => {
      const stationDepartment = getStationDepartment(station);
      const matchesQuery = !needle || matchesSearch(`${station.name} ${station.region?.name || ""} ${stationDepartment || ""}`, needle);
      return matchesQuery
        && matchesStationLocation(station, region, department)
        && (!selectedSkiAreaStationIds || selectedSkiAreaStationIds.has(station.id));
    });
  }, [department, initialStations, q, region, selectedSkiAreaStationIds]);

  const regionOptions = useMemo(() => [...new Set(initialStations.map((station) => station.region?.name).filter((name): name is string => Boolean(name)))].sort((a, b) => a.localeCompare(b, "fr")), [initialStations]);
  const departmentOptions = useMemo(() => getDepartmentOptions(initialStations), [initialStations]);
  const skiAreaOptions = useMemo(() => getSkiAreaOptions(skiAreas, initialStations, region), [initialStations, region, skiAreas]);
  const changeRegion = (nextRegion: string) => {
    setRegion(nextRegion);
    // A department is the more specific location filter and therefore takes
    // precedence while it is selected. Clear it when the user explicitly
    // changes region so that the new region immediately updates the results.
    setDepartment("");
    if (skiArea && !getSkiAreaOptions(skiAreas, initialStations, nextRegion).some((area) => area.slug === skiArea)) setSkiArea("");
  };
  const filteredMapStations = useMemo(() => {
    const slugs = new Set(data.map((station) => station.slug));
    return mapStations.filter((station) => slugs.has(station.slug));
  }, [data, mapStations]);
  const regionsCount = useMemo(() => new Set(data.map((station) => station.region?.name).filter(Boolean)).size, [data]);
  const hasFilters = Boolean(q || region || department || skiArea);

  const resetFilters = () => {
    setQ("");
    setRegion("");
    setDepartment("");
    setSkiArea("");
  };

  return (
    <>
      <Head>
        <title>Stations de ski en France : guide et comparaison | Snow Explorer</title>
        <meta name="description" content="Découvrez les stations de ski en France, comparez les domaines, altitudes, pistes et informations pratiques avec Snow Explorer." />
        <link rel="canonical" href="https://www.snow-explorer.com/stations" />
      </Head>
      <main className="stations-directory">
        <section className="stations-directory__hero">
          <div>
            <p className="eyebrow">Explorer les domaines</p>
            <h1>Stations de ski</h1>
            <p>Trouvez rapidement une station, comparez sa région et ouvrez une fiche détaillée avec météo, webcams, pistes et informations pratiques.</p>
          </div>
          <div className="station-directory-stats" aria-label="Résumé des résultats">
            <div><strong>{data.length}</strong><span>stations</span></div>
            <div><strong>{regionsCount || "—"}</strong><span>régions</span></div>
          </div>
        </section>

        <section className="station-search-card" aria-label="Recherche et filtres des stations">
          <label className="station-search-field">
            <span>Rechercher une station</span>
            <div><Search size={20} aria-hidden="true" /><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Auron, Val Thorens, Chamonix…" /></div>
          </label>
          <button type="button" className="btn btn--secondary station-filter-toggle" aria-expanded={showFilters} aria-controls="station-directory-filters" onClick={() => setShowFilters((visible) => !visible)}><SlidersHorizontal size={18} /> Filtres</button>
          {showFilters && <div id="station-directory-filters" className="station-directory-filters">
            <label><span>Région</span><select value={region} onChange={(event) => changeRegion(event.target.value)}><option value="">Toutes les régions</option>{regionOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
            <label><span>Département</span><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">Tous les départements</option>{departmentOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
            <label><span>Domaine skiable</span><select value={skiArea} onChange={(event) => setSkiArea(event.target.value)}><option value="">Tous les domaines</option>{skiAreaOptions.map((area) => <option key={area.id} value={area.slug}>{area.name}</option>)}</select></label>
            <button type="button" className="btn btn--ghost" onClick={resetFilters} disabled={!hasFilters}><RotateCcw size={17} /> Réinitialiser</button>
          </div>}
        </section>

        <div className="station-map-toggle">
          <button type="button" className="btn btn--secondary" aria-expanded={showMap} aria-controls="stations-overview-map" onClick={() => setShowMap((visible) => !visible)}>
            <MapIcon size={18} aria-hidden="true" /> {showMap ? "Masquer la carte" : "Voir les stations sur la carte"}
          </button>
        </div>

        <div className={`stations-directory-layout${mapExpanded ? " stations-directory-layout--map-expanded" : ""}${!showMap ? " stations-directory-layout--map-hidden" : ""}`}>
          {showMap && <section id="stations-overview-map" className="stations-overview-map" aria-label="Carte des stations">
            <button type="button" className="station-map-expand" onClick={() => setMapExpanded((expanded) => !expanded)} aria-pressed={mapExpanded}>
              {mapExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />} {mapExpanded ? "Réduire la carte" : "Agrandir la carte"}
            </button>
            {filteredMapStations.length ? <StationMap stations={filteredMapStations} mode="overview" resizeSignal={mapExpanded} /> : <div className="empty-state"><strong>Aucune station géolocalisée</strong><span>Modifiez les filtres pour afficher d’autres stations.</span></div>}
          </section>}

          <div className="station-results" aria-live="polite">
            <section className="station-results-grid" aria-label="Résultats stations">
              {data.map((resort) => <article key={resort.id} className="station-result-card">
                <div className="station-result-card__icon"><MapPin size={20} /></div>
                <div><h2>{resort.name}</h2><p>{regionHref(resort.region) ? <Link href={regionHref(resort.region)!}>{resort.region?.name}</Link> : "Station de ski"}</p></div>
                <Link href={`/stations/${resort.slug}`} className="station-result-card__link">Voir la fiche <ArrowRight size={16} /></Link>
              </article>)}
            </section>
            {data.length === 0 && <div className="empty-state empty-state--hero"><strong>Aucun résultat</strong><span>Modifiez votre recherche ou réinitialisez les filtres.</span>{hasFilters && <button type="button" className="btn btn--secondary" onClick={resetFilters}>Réinitialiser les filtres</button>}</div>}
          </div>
        </div>
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const [initialStations, mapStations, skiAreas] = await Promise.all([
    fetchActiveResortsServer(),
    fetchStationMapServer(),
    fetchAllPublicSkiAreasWithStations().catch((error) => {
      console.error("[stations] Ski areas unavailable", error instanceof Error ? error.message : "unknown_error");
      return [];
    }),
  ]);
  return { props: { initialStations, mapStations, skiAreas } };
};

export default StationsList;
