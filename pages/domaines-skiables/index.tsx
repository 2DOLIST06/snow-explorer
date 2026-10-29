import { useEffect, useRef } from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { fetchAllPublicSkiAreas } from "@/lib/api/skiAreas";
import type { SkiAreaPublic } from "@/types/skiArea";

export default function SkiAreasDirectory({ areas, apiError }: { areas: SkiAreaPublic[]; apiError: boolean }) {
  const resultsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (window.matchMedia("(max-width: 760px)").matches) {
      const target = resultsRef.current;
      if (target) {
        const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--site-header-visible-height")) || 0;
        const top = Math.min(160, Math.max(0, window.scrollY + target.getBoundingClientRect().top - header - 16));
        window.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
    }
  }, []);
  return <>
    <Head>
      <title>Domaines skiables en France : stations et pistes | Snow Explorer</title>
      <meta name="description" content="Découvrez les domaines skiables en France, leurs stations associées et les informations disponibles sur les pistes, altitudes et remontées mécaniques." />
      <link rel="canonical" href="https://www.snow-explorer.com/domaines-skiables" />
    </Head>
    <main className="ski-areas-page">
      <header className="ski-areas-hero"><p className="eyebrow">Explorer la montagne</p><h1>Domaines skiables en France</h1><p>Explorez les domaines skiables référencés sur Snow Explorer et découvrez les stations qui leur sont associées. Les fiches permettent de retrouver les caractéristiques disponibles de chaque domaine, notamment les pistes, les altitudes, les remontées mécaniques et les stations reliées lorsque ces informations sont renseignées.</p></header>
      {areas.length > 0 && <section ref={resultsRef} className="ski-areas-directory">{areas.map(area => (
        <article key={area.id}>
          <Link className="ski-area-card-link" href={`/domaines-skiables/${area.slug}`} aria-label={`Découvrir le domaine skiable ${area.name}`}>
            {area.cover_image_url && <img src={area.cover_image_url} alt={`Domaine skiable ${area.name}`} />}
            <div><h2>{area.name}</h2>{area.description && <p>{area.description}</p>}<span className="ski-area-discover-desktop">Découvrir le domaine</span><span className="ski-area-discover-mobile">Découvrir {area.name}</span></div>
          </Link>
        </article>
      ))}</section>}
      {apiError ? <p className="notice notice--warning" role="alert">Les domaines skiables sont temporairement indisponibles. Réessayez ultérieurement.</p> : areas.length === 0 && <p className="empty-state">Aucun domaine skiable publié actuellement.</p>}
      <section className="directory-editorial"><div><h2>Comparer les domaines skiables</h2><p>Un domaine skiable peut regrouper une ou plusieurs stations et plusieurs secteurs de ski. Snow Explorer rassemble les données disponibles pour permettre de comparer plus facilement leur taille, leurs pistes, leurs altitudes et les stations qui y sont rattachées.</p></div><div><h2>Retrouver les informations de chaque domaine</h2><p>Depuis chaque fiche, consultez les informations disponibles sur le domaine et accédez aux stations associées. Les données affichées proviennent exclusivement des informations enregistrées sur Snow Explorer.</p></div></section>
    </main>
  </>;
}

export const getServerSideProps: GetServerSideProps = async () => { try { return { props: { areas: await fetchAllPublicSkiAreas(), apiError: false } }; } catch (error) { console.error("[ski-areas] list unavailable", error); return { props: { areas: [], apiError: true } }; } };
