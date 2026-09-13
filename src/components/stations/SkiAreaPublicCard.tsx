import Link from "next/link";
import type { SkiAreaPublic, StationOption } from "@/types/skiArea";

const present = (value: unknown) => value !== null && value !== undefined && value !== "";
const formattedNumber = (value: unknown) => Number(value).toLocaleString("fr-FR");
const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function SkiAreaFacts({ area }: { area: SkiAreaPublic }) {
  const overview = [["Altitude basse", area.altitude_min_m, "m"], ["Altitude haute", area.altitude_max_m, "m"], ["Domaine skiable", area.ski_area_km, "km"], ["Remontées mécaniques", area.lifts_count, ""]].filter(([, value]) => present(value));
  const pisteColours = [["Vertes", area.green_pistes_count, "green"], ["Bleues", area.blue_pistes_count, "blue"], ["Rouges", area.red_pistes_count, "red"], ["Noires", area.black_pistes_count, "black"]].filter(([, value]) => present(value));
  const hasPistes = present(area.pistes_count) || pisteColours.length > 0;
  if (!overview.length && !hasPistes) return null;
  return <div className="ski-area-facts">
    {overview.length > 0 && <dl className="ski-area-facts__overview">{overview.map(([label, value, unit]) => <div key={String(label)}><dt>{label}</dt><dd>{formattedNumber(value)}{unit ? ` ${unit}` : ""}</dd></div>)}</dl>}
    {hasPistes && <section className="ski-area-facts__pistes" aria-labelledby={`pistes-${area.id}`}><div className="ski-area-facts__total"><span id={`pistes-${area.id}`}>Pistes de ski</span>{present(area.pistes_count) && <strong>{formattedNumber(area.pistes_count)} <small>au total</small></strong>}</div>{pisteColours.length > 0 && <dl>{pisteColours.map(([label, value, colour]) => <div className={`ski-area-piste ski-area-piste--${colour}`} key={String(label)}><dt>{label}</dt><dd>{formattedNumber(value)}</dd></div>)}</dl>}</section>}
  </div>;
}

export function StationCards({ stations }: { stations: StationOption[] }) {
  const unique = [...new Map(stations.map(station => [station.id, station])).values()];
  return <div className="ski-area-stations">{unique.map(station => <article key={station.id}>{(station.cover_image_url || station.logo_url) && <img src={station.cover_image_url || station.logo_url || ""} alt={`Station de ski ${station.name}`} />}<div><h3>{station.name}</h3><Link href={`/stations/${station.slug}`} aria-label={`Découvrir la station de ski ${station.name}`}>Découvrir {station.name}</Link></div></article>)}</div>;
}

export default function SkiAreaPublicCard({ area, compact = false }: { area: SkiAreaPublic; compact?: boolean }) {
  const hasDates = area.forecast_open_date || area.forecast_close_date;
  return <section className={`ski-area-public-card${compact ? " is-compact" : ""}`}><header><p className="eyebrow">Données du domaine</p><h2>Le domaine skiable {area.name}</h2></header><SkiAreaFacts area={area} />
    {hasDates && <p className="ski-area-forecast"><strong>Dates prévisionnelles{area.season ? ` · saison ${area.season}` : ""}</strong><span>{area.forecast_open_date ? `Ouverture prévue le ${date(area.forecast_open_date)}` : ""}{area.forecast_open_date && area.forecast_close_date ? " · " : ""}{area.forecast_close_date ? `Fermeture prévue le ${date(area.forecast_close_date)}` : ""}</span></p>}
    <Link className="btn btn--secondary" href={`/domaines-skiables/${area.slug}`}>Découvrir le domaine skiable {area.name}</Link>
    {area.stations && area.stations.length > 0 && <div><h3>Autres stations du même domaine</h3><StationCards stations={area.stations} /></div>}
  </section>;
}
