import type { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Expand, Map as MapIcon, MapPin, Minimize2, RotateCcw, Search } from "lucide-react";
import { regionHref } from "@/lib/regions";
import { fetchActiveResortsServer, type Resort } from "@/lib/api/resorts";
import { fetchAllPublicSkiAreas } from "@/lib/api/skiAreas";
import { matchesSearch, normalizeSearchText } from "@/lib/searchNormalization";
import StationMap from "@/components/maps/StationMapDynamic";
import { fetchStationMapServer } from "@/lib/api/stationMap";
import type { StationMapItem } from "@/types/stationMap";
import type { SkiAreaPublic } from "@/types/skiArea";

type Props = { initialStations: Resort[]; mapStations: StationMapItem[]; skiAreas: SkiAreaPublic[] };

const StationsList: NextPage<Props> = ({ initialStations, mapStations, skiAreas }) => {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [department, setDepartment] = useState("");
  const [skiArea, setSkiArea] = useState("");
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const stationAreaIds = useMemo(() => {
    const memberships = new Map<string, Set<string>>();
    skiAreas.forEach((area) => area.stations?.forEach((station) => {
      const areas = memberships.get(String(station.id)) || new Set<string>();
      areas.add(String(area.id));
      memberships.set(String(station.id), areas);
    }));
    return memberships;
  }, [skiAreas]);

  const regions = useMemo(() => [...new Set(initialStations.map((station) => station.region?.name).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "fr")), [initialStations]);
  const departments = useMemo(() => [...new Set(initialStations.filter((station) => !region || station.region?.name === region).map((station) => station.department?.name).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "fr")), [initialStations, region]);

  const data = useMemo(() => {
    const needle = normalizeSearchText(q);
    return initialStations.filter((station) =>
      (!needle || matchesSearch(`${station.name} ${station.region?.name || ""} ${station.department?.name || ""}`, needle)) &&
      (!region || station.region?.name === region) &&
      (!department || station.department?.name === department) &&
      (!skiArea || stationAreaIds.get(String(station.id))?.has(skiArea)),
    );
  }, [department, initialStations, q, region, skiArea, stationAreaIds]);

  const filteredIds = useMemo(() => new Set(data.map((station) => String(station.id))), [data]);
  const filteredMapStations = useMemo(() => mapStations.filter((station) => filteredIds.has(String(station.id))), [filteredIds, mapStations]);
  const regionsCount = useMemo(() => new Set(data.map((station) => station.region?.name).filter(Boolean)).size, [data]);
  const hasFilters = Boolean(q.trim() || region || department || skiArea);
  const viewportKey = `${normalizeSearchText(q)}|${region}|${department}|${skiArea}|${isMapExpanded}`;

  const resetFilters = () => { setQ(""); setRegion(""); setDepartment(""); setSkiArea(""); };
  const changeRegion = (value: string) => {
    setRegion(value);
    if (department && !initialStations.some((station) => station.region?.name === value && station.department?.name === department)) setDepartment("");
  };

  const mapPanel = showMap ? (
    <section id="stations-overview-map" className="stations-overview-map" aria-label="Carte des stations">
      <button type="button" className="station-map-expand" onClick={() => setIsMapExpanded((expanded) => !expanded)} aria-label={isMapExpanded ? "Réduire la carte" : "Agrandir la carte"}>
        {isMapExpanded ? <Minimize2 size={18} /> : <Expand size={18} />}<span>{isMapExpanded ? "Réduire" : "Agrandir"}</span>
      </button>
      <StationMap stations={filteredMapStations} fitBoundsStations={hasFilters ? filteredMapStations : mapStations} viewportKey={viewportKey} mode="overview" />
    </section>
  ) : null;

  return <>
    <Head>
      <title>Stations de ski en France : guide et comparaison | Snow Explorer</title>
      <meta name="description" content="Découvrez les stations de ski en France, comparez les domaines, altitudes, pistes et informations pratiques avec Snow Explorer." />
      <link rel="canonical" href="https://www.snow-explorer.com/stations" />
    </Head>
    <main className="stations-directory">
      <section className="stations-directory__hero">
        <div><p className="eyebrow">Explorer les domaines</p><h1>Stations de ski</h1><p>Trouvez rapidement une station, comparez sa région et ouvrez une fiche détaillée avec météo, webcams, pistes et informations pratiques.</p></div>
        <div className="station-directory-stats" aria-label="Résumé des résultats"><div><strong>{data.length}</strong><span>stations</span></div><div><strong>{regionsCount || "—"}</strong><span>régions</span></div></div>
      </section>

      <section className="station-search-card" aria-label="Recherche et filtres de stations">
        <label className="station-search-field"><span>Rechercher une station</span><div><Search size={20} aria-hidden="true" /><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Auron, Val Thorens, Chamonix…" /></div></label>
        <label className={region ? "station-filter is-active" : "station-filter"}><span>Région</span><select value={region} onChange={(event) => changeRegion(event.target.value)}><option value="">Toutes les régions</option>{regions.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label className={department ? "station-filter is-active" : "station-filter"}><span>Département</span><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">Tous les départements</option>{departments.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label className={skiArea ? "station-filter is-active" : "station-filter"}><span>Domaine skiable</span><select value={skiArea} onChange={(event) => setSkiArea(event.target.value)}><option value="">Tous les domaines</option>{skiAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
        {hasFilters && <button type="button" className="btn btn--ghost station-filters-reset" onClick={resetFilters}><RotateCcw size={17} /> Réinitialiser</button>}
      </section>

      <div className="station-map-toggle"><button type="button" className="btn btn--secondary" aria-expanded={showMap} aria-controls="stations-overview-map" onClick={() => setShowMap((visible) => !visible)}><MapIcon size={18} /> {showMap ? "Masquer la carte" : "Voir les stations sur la carte"}</button></div>

      <div className={isMapExpanded ? "stations-directory__content is-map-expanded" : "stations-directory__content"}>
        {mapPanel}
        <div className="station-results">
          <div className="station-results__heading"><strong>{data.length} station{data.length > 1 ? "s" : ""}</strong>{hasFilters && <span>selon vos critères</span>}</div>
          <section className="station-results-grid" aria-label="Résultats stations">
            {data.map((station) => <article key={station.id} className="station-result-card">
              <div className="station-result-card__icon"><MapPin size={20} /></div>
              <div><h2>{station.name}</h2><p>{regionHref(station.region) ? <Link href={regionHref(station.region)!}>{station.region?.name}</Link> : "Station de ski"}</p>{station.department?.name && <small>{station.department.name}</small>}</div>
              <Link href={`/stations/${station.slug}`} className="station-result-card__link">Voir la fiche <ArrowRight size={16} /></Link>
            </article>)}
          </section>
          {data.length === 0 && <div className="empty-state empty-state--hero"><strong>Aucun résultat</strong><span>Modifiez ou réinitialisez vos critères pour retrouver des stations.</span></div>}
        </div>
      </div>
    </main>
  </>;
};

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const [stationsResult, mapResult, skiAreasResult] = await Promise.allSettled([fetchActiveResortsServer(), fetchStationMapServer(), fetchAllPublicSkiAreas()]);
  return { props: {
    initialStations: stationsResult.status === "fulfilled" ? stationsResult.value : [],
    mapStations: mapResult.status === "fulfilled" ? mapResult.value : [],
    skiAreas: skiAreasResult.status === "fulfilled" ? skiAreasResult.value : [],
  } };
};

export default StationsList;
