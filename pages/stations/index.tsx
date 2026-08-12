import type { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { regionHref } from "@/lib/regions";
import { fetchActiveResortsServer, getValidActiveResorts, parseResortsPayload } from "@/lib/api/resorts";

type Resort = { id: string; name: string; slug: string; is_active?: boolean; region?: { name?: string } };

type Props = { initialStations: Resort[] };

const StationsList: NextPage<Props> = ({ initialStations }) => {
  const [q, setQ] = useState("");
  const [data, setData] = useState<Resort[]>(initialStations);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancel = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const query = q.trim();
        const url = query.length ? `/api/ski/resorts/?q=${encodeURIComponent(query)}` : `/api/ski/resorts/`;
        const r = await fetch(url);
        if (!r.ok) throw new Error("fetch_failed");
        const j: Resort[] = await r.json();
        const onlyActive = getValidActiveResorts(parseResortsPayload(j)) as Resort[];
        if (!cancel) setData(onlyActive);
      } catch {
        if (!cancel && q.trim()) setData([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    }, 200);
    return () => { cancel = true; clearTimeout(t); };
  }, [q]);

  const regionsCount = useMemo(() => new Set(data.map((r) => r.region?.name).filter(Boolean)).size, [data]);

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

      <section className="station-search-card" aria-label="Recherche de station">
        <label className="station-search-field">
          <span>Rechercher une station</span>
          <div><Search size={20} aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Auron, Val Thorens, Chamonix…" /></div>
        </label>
        <button type="button" className="btn btn--secondary"><SlidersHorizontal size={18} /> Filtres</button>
      </section>

      {loading && <div className="station-list-skeleton"><Loader2 size={18} /> Chargement des stations…</div>}

      <section className="station-results-grid" aria-label="Résultats stations">
        {data.map((r) => (
          <article key={r.id} className="station-result-card">
            <div className="station-result-card__icon"><MapPin size={20} /></div>
            <div>
              <h2>{r.name}</h2>
              <p>{regionHref(r.region) ? <Link href={regionHref(r.region)!}>{r.region?.name}</Link> : "Station de ski"}</p>
            </div>
            <Link href={`/stations/${r.slug}`} className="station-result-card__link">Voir la fiche <ArrowRight size={16} /></Link>
          </article>
        ))}
      </section>

      {!loading && data.length === 0 && <div className="empty-state empty-state--hero"><strong>Aucun résultat</strong><span>Essayez un nom plus court ou une autre destination montagne.</span></div>}
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async () => ({
  props: { initialStations: await fetchActiveResortsServer() },
});

export default StationsList;
