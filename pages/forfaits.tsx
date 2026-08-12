import Head from "next/head";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, ShieldCheck, Ticket } from "lucide-react";
import StationForfaitsBlock from "@/components/stations/StationForfaitsBlock";
import type { ForfaitColumn, ForfaitItem } from "@/types/station";

type Resort = {
  id?: string;
  name: string;
  slug: string;
  is_active?: boolean;
  region?: { name?: string };
  department?: { name?: string };
};

type AvailableResort = Resort & {
  forfaits: { enabled: boolean; columns: ForfaitColumn[]; items: ForfaitItem[] };
};

const hasValue = (value: unknown) => typeof value === "string" && value.trim().length > 0;

export function hasActiveForfaits(payload: any): boolean {
  const forfaits = payload?.forfaits || payload?.widgets?.forfaits;
  if (!forfaits?.enabled || !Array.isArray(forfaits.items)) return false;
  return forfaits.items.some((item: any) =>
    hasValue(item?.price) ||
    (item?.prices && Object.values(item.prices).some(hasValue)) ||
    (Array.isArray(item?.columns) && item.columns.some((column: any) => hasValue(column?.value)))
  );
}

export default function ForfaitsPage() {
  const [query, setQuery] = useState("");
  const [stations, setStations] = useState<AvailableResort[]>([]);
  const [selected, setSelected] = useState<AvailableResort | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadForfaits() {
      setLoading(true);
      try {
        const response = await fetch("/api/ski/resorts/");
        if (!response.ok) throw new Error("stations_fetch_failed");
        const payload = await response.json();
        const resorts: Resort[] = (Array.isArray(payload) ? payload : payload?.items || [])
          .filter((station: Resort) => station?.slug && station.is_active !== false && station.is_active !== null);

        const available: AvailableResort[] = [];
        for (let index = 0; index < resorts.length; index += 8) {
          const batch = await Promise.all(resorts.slice(index, index + 8).map(async (station) => {
            try {
              const widgetResponse = await fetch(`/api/ski/stations/${encodeURIComponent(station.slug)}-widgets`);
              if (!widgetResponse.ok) return null;
              const widgets = await widgetResponse.json();
              if (!hasActiveForfaits(widgets)) return null;
              const forfaits = widgets.forfaits || widgets.widgets.forfaits;
              return { ...station, forfaits } as AvailableResort;
            } catch { return null; }
          }));
          available.push(...batch.filter((station): station is AvailableResort => station !== null));
        }
        available.sort((a, b) => a.name.localeCompare(b.name, "fr"));
        if (!cancelled) setStations(available);
      } catch {
        if (!cancelled) setStations([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadForfaits();
    return () => { cancelled = true; };
  }, []);

  const filteredStations = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return stations.filter((station) => !needle || `${station.name} ${station.region?.name || ""} ${station.department?.name || ""}`.toLocaleLowerCase("fr").includes(needle));
  }, [query, stations]);

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
          <aside className="station-picker passes-picker" aria-label="Choisir une station">
            <div className="section-heading"><div><p className="eyebrow">Stations disponibles</p><h2>Choisir une station</h2></div><span>{filteredStations.length} résultat(s)</span></div>
            <label className="passes-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Rechercher une station</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, région, département…" /></label>
            {loading && <div className="skeleton-panel passes-skeleton"><div /><div /><div /></div>}
            <div className="station-list" role="listbox" aria-label="Stations avec forfaits">
              {filteredStations.map((station) => <button key={station.id || station.slug} type="button" role="option" aria-selected={selected?.slug === station.slug} className={selected?.slug === station.slug ? "is-selected" : ""} onClick={() => setSelected(station)}><strong>{station.name}</strong><span>{station.region?.name || station.department?.name || "Station de ski"}</span></button>)}
              {!loading && filteredStations.length === 0 && <div className="empty-state"><strong>Aucun tarif disponible</strong><span>Seules les stations ayant des forfaits actifs et des prix renseignés apparaissent ici.</span></div>}
            </div>
          </aside>

          <section className="passes-content" aria-live="polite">
            {!selected && !loading && <div className="passes-welcome"><span><Ticket size={30} /></span><p className="eyebrow">Tarifs en un coup d’œil</p><h2>Sélectionnez votre station</h2><p>Les forfaits et leurs montants s’afficheront ici, sans recharger la page.</p></div>}
            {loading && <div className="skeleton-panel skeleton-panel--large"><div /><div /><div /></div>}
            {selected && <div className="passes-result"><header><div><p className="eyebrow">Tarifs publiés</p><h2>Forfaits à {selected.name}</h2><p>{selected.region?.name || selected.department?.name || "Station de ski"}</p></div><Link href={`/stations/${selected.slug}`} className="btn btn--secondary">Voir la station <ArrowRight size={17} /></Link></header><StationForfaitsBlock enabled columns={selected.forfaits.columns || []} items={selected.forfaits.items || []} /><p className="passes-disclaimer"><ShieldCheck size={18} /> Tarifs indicatifs communiqués par la station. Vérifiez les conditions et le prix final avant votre achat.</p></div>}
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
}
