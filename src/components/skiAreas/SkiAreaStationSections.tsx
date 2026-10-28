import Link from "next/link";
import { useId, useState } from "react";
import { Weather, Webcams, LocationAccess, StationV3Styles } from "@/components/stations/StationV3Page";
import type { SkiAreaStation } from "@/lib/api/skiAreaStations";
import type { StationInitialData } from "@/lib/api/stationInitialData";

export type Section = "weather" | "webcams" | "access";
const sections: { value: Section; label: string }[] = [
  { value: "weather", label: "Météo et enneigement" },
  { value: "webcams", label: "Webcams" },
  { value: "access", label: "Accès et hébergement" },
];

export function StationSection({ stations, section, label, initialDataByStation = {} }: {
  stations: SkiAreaStation[]; section: Section; label: string; initialDataByStation?: Record<string, StationInitialData>;
}) {
  const [slug, setSlug] = useState(stations[0]?.slug || "");
  const selected = stations.some(item => item.slug === slug) ? slug : stations[0]?.slug;
  const id = useId();
  if (!stations.length) return <section className="v3-floor"><h2>{label}</h2><p>Aucune station active disponible pour ce domaine.</p></section>;
  return <div className="ski-area-station-section">
    <div className="ski-area-station-picker">
      <label htmlFor={id}>{label} — choisir une station</label>
      <select id={id} value={selected} onChange={event => setSlug(event.target.value)}>
        {stations.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}
      </select>
    </div>
    {stations.map(station => <div className="ski-area-station-panel" id={`${id}-${station.slug}`} key={station.slug} hidden={station.slug !== selected}>
      <p>Informations pour <Link href={`/stations/${station.slug}`}>{station.name}</Link>.</p>
      {section === "weather" && <Weather station={station} initialData={initialDataByStation[station.slug]} active={station.slug === selected} />}
      {section === "webcams" && <Webcams station={station} initialData={initialDataByStation[station.slug]} active={station.slug === selected} />}
      {section === "access" && <LocationAccess station={station} active={station.slug === selected} />}
    </div>)}
    <noscript><style>{`.ski-area-station-panel[hidden]{display:block!important}.ski-area-station-picker{display:none}`}</style></noscript>
  </div>;
}

export default function SkiAreaStationSections({ stations, initialDataByStation = {} }: {
  stations: SkiAreaStation[]; initialDataByStation?: Record<string, StationInitialData>;
}) {
  if (!stations.length) return <p>Météo et neige, webcams, accès et hébergement : aucune station active disponible pour ce domaine.</p>;
  return <div className="ski-area-station-sections">
    {sections.map(section => <StationSection key={section.value} stations={stations} section={section.value} label={section.label} initialDataByStation={initialDataByStation} />)}
    <StationV3Styles />
    <SkiAreaStationStyles />
  </div>;
}

export function SkiAreaStationStyles() { return <style jsx global>{`
      .ski-area-station-sections{display:grid;gap:24px;margin-top:24px;min-width:0}
      .ski-area-station-section{min-width:0}
      .ski-area-station-picker{padding:18px 20px;border:1px solid #d9e3eb;border-radius:18px 18px 0 0;background:#fff}
      .ski-area-station-picker label{display:block;margin-bottom:10px;color:#132b3e;font-weight:700}
      .ski-area-station-picker select{width:100%;max-width:420px;min-height:44px;padding:10px;border:1px solid #94a3b8;border-radius:9px;background:#fff;color:#132b3e;font:inherit}
      .ski-area-station-picker select:focus-visible{outline:3px solid #38bdf8;outline-offset:2px}
      .ski-area-station-picker p{margin:10px 0 0;color:#536b7d}
      .ski-area-station-section .v3-floor,.ski-area-station-section .v3-location{border-top-left-radius:0;border-top-right-radius:0}
    `}</style>; }
