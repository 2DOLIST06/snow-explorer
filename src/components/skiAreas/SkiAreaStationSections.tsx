import { useId, useState } from "react";
import { Weather, Webcams, LocationAccess, StationV3Styles } from "@/components/stations/StationV3Page";
import type { SkiAreaStation } from "@/lib/api/skiAreaStations";
import type { StationInitialData } from "@/lib/api/stationInitialData";

type Section = "weather" | "webcams" | "access";
const sections: { value: Section; label: string }[] = [
  { value: "weather", label: "Météo et enneigement" },
  { value: "webcams", label: "Webcams" },
  { value: "access", label: "Accès et hébergement" },
];

function StationSection({ stations, section, label, initialData }: {
  stations: SkiAreaStation[]; section: Section; label: string; initialData?: StationInitialData | null;
}) {
  const [slug, setSlug] = useState(stations[0].slug);
  const station = stations.find(item => item.slug === slug) || stations[0];
  const id = useId();
  // Initial resources belong only to the first station. Remounting also clears
  // map, webcam and lodging state before showing a different destination.
  const resources = station.slug === stations[0].slug ? initialData ?? undefined : undefined;
  return <div className="ski-area-station-section">
    <div className="ski-area-station-picker">
      <label htmlFor={id}>{label} — choisir une station</label>
      <select id={id} value={station.slug} onChange={event => setSlug(event.target.value)}>
        {stations.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}
      </select>
      <p>Informations pour {station.name}.</p>
    </div>
    <div key={station.slug}>
      {section === "weather" && <Weather station={station} initialData={resources} />}
      {section === "webcams" && <Webcams station={station} initialData={resources} />}
      {section === "access" && <LocationAccess station={station} />}
    </div>
  </div>;
}

export default function SkiAreaStationSections({ stations, initialData }: {
  stations: SkiAreaStation[]; initialData?: StationInitialData | null;
}) {
  if (!stations.length) return <p>Météo et neige, webcams, accès et hébergement : aucune station active disponible pour ce domaine.</p>;
  return <div className="ski-area-station-sections">
    {sections.map(section => <StationSection key={section.value} stations={stations} section={section.value} label={section.label} initialData={initialData} />)}
    <StationV3Styles />
    <style jsx global>{`
      .ski-area-station-sections{display:grid;gap:24px;margin-top:24px;min-width:0}
      .ski-area-station-section{min-width:0}
      .ski-area-station-picker{padding:18px 20px;border:1px solid #d9e3eb;border-radius:18px 18px 0 0;background:#fff}
      .ski-area-station-picker label{display:block;margin-bottom:10px;color:#132b3e;font-weight:700}
      .ski-area-station-picker select{width:100%;max-width:420px;min-height:44px;padding:10px;border:1px solid #94a3b8;border-radius:9px;background:#fff;color:#132b3e;font:inherit}
      .ski-area-station-picker select:focus-visible{outline:3px solid #38bdf8;outline-offset:2px}
      .ski-area-station-picker p{margin:10px 0 0;color:#536b7d}
      .ski-area-station-section .v3-floor,.ski-area-station-section .v3-location{border-top-left-radius:0;border-top-right-radius:0}
    `}</style>
  </div>;
}
