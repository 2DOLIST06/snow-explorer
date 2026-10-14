import type { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { getServerResortsApiUrls, parseResortsPayload } from "@/lib/api/resorts";
import { fetchRegionDetailServer } from "@/lib/api/regions";
import { splitRegionDescription, regionDescription, hasRegionContent } from "@/lib/regionHtml";
import { isRegionMatch, regionSlug, type RegionSummary } from "@/lib/regions";

type Resort = { id: string; name: string; slug: string; is_active?: boolean | null; region?: RegionSummary };
type Props = { region: RegionSummary & { name: string }; resorts: Resort[] };

const RegionPage: NextPage<Props> = ({ region, resorts }) => {
  const slug = regionSlug(region);
  const title = region.meta_title?.trim() || `Stations de ski en ${region.name} | Snow Explorer`;
  const description = region.meta_description?.trim() || `Découvrez les stations de ski de la région ${region.name}, leurs pistes, webcams, météo et informations pratiques.`;
  const { before, after } = splitRegionDescription(regionDescription(region));
  const canonical = `https://www.snow-explorer.com/regions/${slug}`;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://www.snow-explorer.com/" },
      { "@type": "ListItem", position: 2, name: "Stations", item: "https://www.snow-explorer.com/stations" },
      { "@type": "ListItem", position: 3, name: region.name, item: canonical },
    ],
  };

  return <>
    <Head>
      <title>{title}</title><meta name="description" content={description} /><link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} /><meta property="og:description" content={description} /><meta property="og:url" content={canonical} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }} />
    </Head>
    <main className="region-page">
      <nav aria-label="Fil d’Ariane"><Link href="/">Accueil</Link><span> &gt; </span><Link href="/stations">Stations</Link><span> &gt; </span><span aria-current="page">{region.name}</span></nav>
      <header className="region-page__hero"><p className="eyebrow">Destination montagne</p><div className="region-page__title">{region.name}</div><p>{resorts.length} station{resorts.length > 1 ? "s" : ""} à découvrir dans la région.</p></header>
      {hasRegionContent(before) && <section className="region-page__seo" aria-label={`Présentation de ${region.name}`} dangerouslySetInnerHTML={{ __html: before }} />}
      <section className="region-page__stations" aria-labelledby="region-stations-title">
        <h2 id="region-stations-title">Les stations de {region.name}</h2>
        <div className="station-results-grid">{resorts.map((resort) => <article key={resort.id} className="station-result-card">
          <div className="station-result-card__icon"><MapPin size={20} /></div><div><h3>{resort.name}</h3><p>{region.name}</p></div>
          <Link href={`/stations/${resort.slug}`} className="station-result-card__link">Voir la station <ArrowRight size={16} /></Link>
        </article>)}</div>
      </section>
      {hasRegionContent(after) && <section className="region-page__seo" aria-label={`Suite de la présentation de ${region.name}`} dangerouslySetInnerHTML={{ __html: after }} />}
    </main>
  </>;
};

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const slug = String(params?.slug || "");
  let resorts: Resort[] = [];
  for (const url of getServerResortsApiUrls()) {
    try { const response = await fetch(url); if (response.ok) { resorts = parseResortsPayload(await response.json()) as Resort[]; break; } } catch { /* try the next configured backend */ }
  }
  const matching = resorts.filter((resort) => resort.is_active !== false && resort.is_active !== null && isRegionMatch(resort.region, slug));
  if (!matching.length || !matching[0].region?.name) return { notFound: true };
  matching.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  let region: RegionSummary = matching[0].region;
  // Keep station geography and URLs; only select the canonical editorial record.
  const editorialId = region.id === "auvergne" || slug === "auvergne" ? "auvergne-rhone-alpes" : region.id || slug;
  const detailed = await fetchRegionDetailServer(editorialId);
  if (detailed) region = { ...region, ...detailed, id: region.id, slug: region.slug, name: region.name };
  return { props: { region: { ...region, name: region.name || matching[0].region.name }, resorts: matching } };
};

export default RegionPage;
