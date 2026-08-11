import type { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { getServerApiBases, getServerResortsApiUrls, parseResortsPayload } from "@/lib/api/resorts";
import { isRegionMatch, regionSlug, type RegionSummary } from "@/lib/regions";

type Resort = { id: string; name: string; slug: string; is_active?: boolean | null; region?: RegionSummary };
type Props = { region: RegionSummary & { name: string }; resorts: Resort[] };

const RegionPage: NextPage<Props> = ({ region, resorts }) => {
  const slug = regionSlug(region);
  const title = region.meta_title?.trim() || `Stations de ski en ${region.name} | Snow Explorer`;
  const description = region.meta_description?.trim() || `Découvrez les stations de ski de la région ${region.name}, leurs pistes, webcams, météo et informations pratiques.`;
  const seoText = region.seo_text || region.description_html || "";
  const paragraphs = seoText.split(/\n\s*\n|<\/?p[^>]*>/i).map((value) => value.replace(/<[^>]+>/g, "").trim()).filter(Boolean);
  const canonical = `https://www.snow-explorer.com/regions/${slug}`;

  return <>
    <Head>
      <title>{title}</title><meta name="description" content={description} /><link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} /><meta property="og:description" content={description} /><meta property="og:url" content={canonical} />
    </Head>
    <main className="region-page">
      <nav aria-label="Fil d’Ariane"><Link href="/">Accueil</Link><span> &gt; </span><Link href="/stations">Stations</Link><span> &gt; </span><span aria-current="page">{region.name}</span></nav>
      <header className="region-page__hero"><p className="eyebrow">Destination montagne</p><h1>Stations de ski en {region.name}</h1><p>{resorts.length} station{resorts.length > 1 ? "s" : ""} à découvrir dans la région.</p></header>
      <section className="region-page__stations" aria-labelledby="region-stations-title">
        <h2 id="region-stations-title">Les stations de {region.name}</h2>
        <div className="station-results-grid">{resorts.map((resort) => <article key={resort.id} className="station-result-card">
          <div className="station-result-card__icon"><MapPin size={20} /></div><div><h3>{resort.name}</h3><p>{region.name}</p></div>
          <Link href={`/stations/${resort.slug}`} className="station-result-card__link">Voir la station <ArrowRight size={16} /></Link>
        </article>)}</div>
      </section>
      {paragraphs.length > 0 && <section className="region-page__seo"><h2>Skier en {region.name}</h2>{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</section>}
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
  for (const base of getServerApiBases()) {
    try {
      const response = await fetch(`${base}/api/regions`, { headers: { accept: "application/json" } });
      if (!response.ok) continue;
      const payload = await response.json();
      const regions: RegionSummary[] = Array.isArray(payload) ? payload : payload.items || payload.data || [];
      const detailed = regions.find((candidate) => isRegionMatch(candidate, slug));
      if (detailed) { region = { ...region, ...detailed }; break; }
    } catch { /* keep the region embedded in the station response */ }
  }
  return { props: { region: { ...region, name: region.name || matching[0].region.name }, resorts: matching } };
};

export default RegionPage;
