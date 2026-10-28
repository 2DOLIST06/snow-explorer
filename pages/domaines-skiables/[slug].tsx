import type { GetServerSideProps } from "next";
import Head from "next/head";
import { fetchPublicSkiArea } from "@/lib/api/skiAreas";
import { SkiAreaFacts, StationCards } from "@/components/stations/SkiAreaPublicCard";
import SkiAreaPisteMap from "@/components/skiAreas/SkiAreaPisteMap";
import SkiAreaStationSections from "@/components/skiAreas/SkiAreaStationSections";
import { loadSkiAreaStations, type SkiAreaStation } from "@/lib/api/skiAreaStations";
import { loadStationInitialData, type StationInitialData } from "@/lib/api/stationInitialData";
import type { SkiAreaPublic } from "@/types/skiArea";
const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
type Props = { area: SkiAreaPublic; stations: SkiAreaStation[]; initialData: StationInitialData | null };
export default function SkiAreaDetail({ area, stations, initialData }: Props) { const description = area.description?.slice(0, 155) || `Découvrez le domaine skiable ${area.name} et ses stations.`; return <><Head><title>{area.name} : domaine skiable et stations | Snow Explorer</title><meta name="description" content={description} /><link rel="canonical" href={`https://www.snow-explorer.com/domaines-skiables/${area.slug}`} /></Head><main className="ski-area-detail"><header>{area.cover_image_url && <img src={area.cover_image_url} alt={`Domaine skiable ${area.name}`} />}<div><p className="eyebrow">Domaine skiable</p><h1>{area.name}</h1>{area.description && <p className="ski-area-description">{area.description}</p>}</div></header><SkiAreaFacts area={area} />{(area.forecast_open_date || area.forecast_close_date || area.season) && <section><h2>Ouverture prévisionnelle</h2>{area.season && <p>Saison {area.season}</p>}<p>{area.forecast_open_date && `Ouverture prévue le ${date(area.forecast_open_date)}`}{area.forecast_open_date && area.forecast_close_date && " · "}{area.forecast_close_date && `Fermeture prévue le ${date(area.forecast_close_date)}`}</p></section>}{area.piste_map_url && <SkiAreaPisteMap name={area.name} url={area.piste_map_url} />}<SkiAreaStationSections key={area.slug} stations={stations} initialData={initialData} />{stations.length > 0 && <section><h2>Stations du domaine</h2><StationCards stations={stations} /></section>}</main></>; }
export const getServerSideProps: GetServerSideProps<Props> = async context => {
  try {
    const area = await fetchPublicSkiArea(String(context.params?.slug || ""));
    if (!area) return { notFound: true };
    const stations = await loadSkiAreaStations(area.stations || []);
    const initialData = stations.length ? await loadStationInitialData(stations[0]) : null;
    return { props: { area, stations, initialData } };
  } catch (error) {
    console.error("[ski-area] detail unavailable", error);
    throw error;
  }
};
