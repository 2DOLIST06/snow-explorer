import MobileDescription from "@/components/skiAreas/MobileDescription";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { fetchPublicSkiArea } from "@/lib/api/skiAreas";
import { SkiAreaFacts, StationCards } from "@/components/stations/SkiAreaPublicCard";
import { StationV3Styles } from "@/components/stations/StationV3Page";
import SkiAreaPisteMap from "@/components/skiAreas/SkiAreaPisteMap";
import { StationSection, SkiAreaStationStyles } from "@/components/skiAreas/SkiAreaStationSections";
import SkiAreaSections, { type SkiAreaSection } from "@/components/skiAreas/SkiAreaSections";
import { loadSkiAreaStations, type SkiAreaStation } from "@/lib/api/skiAreaStations";
import { loadSkiAreaInitialData } from "@/lib/api/skiAreaInitialData";
import type { StationInitialData } from "@/lib/api/stationInitialData";
import { getOfficialMapPresentation } from "@/lib/officialMap";
import type { SkiAreaPublic } from "@/types/skiArea";

const ORIGIN = "https://www.snow-explorer.com";
const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
type Props = { area: SkiAreaPublic; stations: SkiAreaStation[]; initialDataByStation: Record<string, StationInitialData> };

export default function SkiAreaDetail({ area, stations, initialDataByStation }: Props) {
  const canonical = `${ORIGIN}/domaines-skiables/${encodeURIComponent(area.slug)}`;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: `${ORIGIN}/` },
      { "@type": "ListItem", position: 2, name: "Domaines skiables", item: `${ORIGIN}/domaines-skiables` },
      { "@type": "ListItem", position: 3, name: area.name, item: canonical },
    ],
  };
  const title = `${area.name} : domaine skiable et stations | Snow Explorer`;
  const description = `Découvrez le domaine skiable ${area.name} : stations, météo, enneigement, webcams et accès.`;
  const sections: SkiAreaSection[] = [
    { id: "apercu", label: "Aperçu", content: <div className="ski-area-overview"><SkiAreaFacts area={area} />
      {(area.forecast_open_date || area.forecast_close_date || area.season) && <section><h2>Ouverture prévisionnelle</h2>
        {area.season && <p>Saison {area.season}</p>}
        <p>{area.forecast_open_date && `Ouverture prévue le ${date(area.forecast_open_date)}`}{area.forecast_open_date && area.forecast_close_date && " · "}{area.forecast_close_date && `Fermeture prévue le ${date(area.forecast_close_date)}`}</p>
      </section>}</div> },
    { id: "meteo-neige", label: "Météo & neige", mobileLabel: "Météo", content: <StationSection domainName={area.name} stations={stations} section="weather" label="Météo et enneigement" initialDataByStation={initialDataByStation} /> },
    { id: "webcams", label: "Webcams", content: <StationSection domainName={area.name} stations={stations} section="webcams" label="Webcams" initialDataByStation={initialDataByStation} /> },
    ...(area.piste_map_url && getOfficialMapPresentation(area.piste_map_url) ? [{ id: "plan-des-pistes", label: "Plan des pistes", mobileLabel: "Plan", content: <SkiAreaPisteMap name={area.name} url={area.piste_map_url} /> }] : []),
    { id: "localisation-acces", label: "Accès & hébergement", content: <StationSection domainName={area.name} stations={stations} section="access" label="Accès et hébergement" initialDataByStation={initialDataByStation} /> },
    ...(stations.length ? [{ id: "stations", label: "Stations du domaine", mobileLabel: "Stations", content: <section className="ski-area-members"><h2>Stations du domaine</h2><StationCards stations={stations} /></section> }] : []),
  ];
  return <>
    <Head><title>{title}</title><meta name="description" content={description} /><link rel="canonical" href={canonical} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }} />
    </Head>
    <main className="ski-area-detail">
      <nav className="v3-breadcrumb" aria-label="Fil d’Ariane"><Link href="/">Accueil</Link><span aria-hidden="true">›</span><Link href="/domaines-skiables">Domaines skiables</Link><span aria-hidden="true">›</span><span aria-current="page">{area.name}</span></nav>

      <SkiAreaSections key={area.slug} sections={sections} hero={<header className="ski-area-hero">{area.cover_image_url && <img src={area.cover_image_url} alt={`Domaine skiable ${area.name}`} />}<div><p className="eyebrow">Domaine skiable</p><h1>{area.name}</h1>{area.description && <MobileDescription text={area.description} />}</div></header>} />
    </main>
    <StationV3Styles /><SkiAreaStationStyles />
  </>;
}

export const getServerSideProps: GetServerSideProps<Props> = async context => {
  try {
    const area = await fetchPublicSkiArea(String(context.params?.slug || ""));
    if (!area) return { notFound: true };
    const stations = await loadSkiAreaStations(area.stations || []);
    const initialDataByStation = await loadSkiAreaInitialData(stations);
    return { props: { area, stations, initialDataByStation } };
  } catch (error) {
    console.error("[ski-area] detail unavailable", error);
    throw error;
  }
};
