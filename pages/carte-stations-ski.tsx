import type { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import StationMap from "@/components/maps/StationMapDynamic";
import { fetchStationMapServer } from "@/lib/api/stationMap";
import type { StationMapItem } from "@/types/stationMap";

type Props = { stations: StationMapItem[] };

const SkiStationsMapPage: NextPage<Props> = ({ stations }) => (
  <>
    <Head>
      <title>Carte des stations de ski en France | Snow Explorer</title>
      <meta name="description" content="Explorez les stations de ski françaises sur une carte interactive et accédez à leurs fiches détaillées." />
      <link rel="canonical" href="https://www.snow-explorer.com/carte-stations-ski" />
    </Head>
    <main className="station-map-page">
      <nav className="station-profile-breadcrumb" aria-label="Fil d’Ariane"><Link href="/">Accueil</Link><span aria-hidden="true"> &gt; </span><span aria-current="page">Carte des stations</span></nav>
      <header className="station-map-page__header">
        <p className="eyebrow">Explorer la montagne</p>
        <h1>Carte des stations de ski</h1>
        <p>Parcourez les stations disponibles en France, zoomez sur un massif puis sélectionnez un repère pour ouvrir la fiche de la station.</p>
      </header>
      {stations.length ? <StationMap stations={stations} mode="overview" /> : <div className="empty-state empty-state--hero"><strong>Aucune station à afficher</strong><span>Les stations avec des coordonnées apparaîtront prochainement sur cette carte.</span></div>}
      <p className="station-map-page__count">{stations.length} station{stations.length > 1 ? "s" : ""} géolocalisée{stations.length > 1 ? "s" : ""}.</p>
    </main>
  </>
);

export const getServerSideProps: GetServerSideProps<Props> = async () => ({
  props: { stations: await fetchStationMapServer() },
});

export default SkiStationsMapPage;
