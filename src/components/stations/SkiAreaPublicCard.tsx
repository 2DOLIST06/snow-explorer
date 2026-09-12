import Link from "next/link";
import type { SkiAreaPublic, StationOption } from "@/types/skiArea";

const present = (value: unknown) => value !== null && value !== undefined && value !== "";
const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
export function SkiAreaFacts({ area }: { area: SkiAreaPublic }) {
  const facts = [
    ["Altitude basse", area.altitude_min_m, "m"], ["Altitude haute", area.altitude_max_m, "m"], ["Pistes", area.ski_area_km, "km"], ["Nombre de pistes", area.pistes_count, ""],
    ["Pistes vertes", area.green_pistes_count, ""], ["Pistes bleues", area.blue_pistes_count, ""], ["Pistes rouges", area.red_pistes_count, ""], ["Pistes noires", area.black_pistes_count, ""], ["Remontées mécaniques", area.lifts_count, ""],
  ].filter(([, value]) => present(value));
  if (!facts.length) return null;
  return <dl className="ski-area-facts">{facts.map(([label,value,unit]) => <div key={String(label)}><dt>{label}</dt><dd>{Number(value).toLocaleString("fr-FR")} {unit}</dd></div>)}</dl>;
}
export function StationCards({ stations }: { stations: StationOption[] }) { const unique = [...new Map(stations.map(station => [station.id, station])).values()]; return <div className="ski-area-stations">{unique.map(station => <article key={station.id}>{(station.cover_image_url || station.logo_url) && <img src={station.cover_image_url || station.logo_url || ""} alt={`Station ${station.name}`} />}<div><h3>{station.name}</h3><Link href={`/stations/${station.slug}`}>Voir la station</Link></div></article>)}</div>; }
export default function SkiAreaPublicCard({ area, compact = false }: { area: SkiAreaPublic; compact?: boolean }) {
  const hasDates = area.forecast_open_date || area.forecast_close_date;
  return <section className={`ski-area-public-card${compact ? " is-compact" : ""}`}><header><p className="eyebrow">Données du domaine</p><h2>Le domaine skiable {area.name}</h2></header><SkiAreaFacts area={area} />
    {hasDates && <p className="ski-area-forecast"><strong>Dates prévisionnelles{area.season ? ` · saison ${area.season}` : ""}</strong><span>{area.forecast_open_date ? `Ouverture prévue le ${date(area.forecast_open_date)}` : ""}{area.forecast_open_date && area.forecast_close_date ? " · " : ""}{area.forecast_close_date ? `Fermeture prévue le ${date(area.forecast_close_date)}` : ""}</span></p>}
    <Link className="btn btn--secondary" href={`/domaines-skiables/${area.slug}`}>Voir la fiche du domaine</Link>
    {area.stations && area.stations.length > 0 && <div><h3>Autres stations du même domaine</h3><StationCards stations={area.stations} /></div>}
  </section>;
}

