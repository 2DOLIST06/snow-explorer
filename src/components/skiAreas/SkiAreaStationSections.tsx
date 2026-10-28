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

export function StationSection({ stations, section, label, domainName, initialDataByStation = {} }: {
  stations: SkiAreaStation[]; section: Section; label: string; domainName: string; initialDataByStation?: Record<string, StationInitialData>;
}) {
  const [slug, setSlug] = useState(stations[0]?.slug || "");
  const selected = stations.some(item => item.slug === slug) ? slug : stations[0]?.slug;
  const id = useId();
  const eyebrow = section === "weather" ? "Conditions" : section === "webcams" ? "En images" : "Localisation";
  return <section className={`v3-floor ski-area-station-section${section === "weather" ? " v3-floor--tint" : ""}`} aria-labelledby={`${id}-title`}>
    <header className="v3-section-heading">
      <p>{eyebrow}</p>
      <h2 id={`${id}-title`}>{label} — {domainName}</h2>
    </header>
    {stations.length ? <>
      <div className="v3-scope ski-area-station-switch" role="group" aria-label={`${label} : choisir une station du domaine ${domainName}`}>
        {stations.map(station => <button type="button" key={station.slug} aria-pressed={selected === station.slug} aria-controls={`${id}-${station.slug}`} onClick={() => setSlug(station.slug)}>{station.name}</button>)}
      </div>
      {stations.map(station => <div className="ski-area-station-panel" id={`${id}-${station.slug}`} key={station.slug} hidden={station.slug !== selected} aria-label={`${label} : ${station.name}`}>
        <p className="ski-area-station-attribution">Informations pour {station.name}.</p>
        {section === "weather" && <Weather embedded station={station} initialData={initialDataByStation[station.slug]} active={station.slug === selected} />}
        {section === "webcams" && <Webcams embedded station={station} initialData={initialDataByStation[station.slug]} active={station.slug === selected} />}
        {section === "access" && <LocationAccess embedded station={station} active={station.slug === selected} />}
      </div>)}
    </> : <p>Aucune station active disponible pour ce domaine.</p>}
    <noscript><style>{`.ski-area-station-panel[hidden]{display:block!important}.ski-area-station-switch{display:none!important}`}</style></noscript>
  </section>;
}

export default function SkiAreaStationSections({ stations, domainName, initialDataByStation = {} }: {
  stations: SkiAreaStation[]; domainName: string; initialDataByStation?: Record<string, StationInitialData>;
}) {
  if (!stations.length) return <p>Météo et neige, webcams, accès et hébergement : aucune station active disponible pour ce domaine.</p>;
  return <div className="ski-area-station-sections">
    {sections.map(section => <StationSection domainName={domainName} key={section.value} stations={stations} section={section.value} label={section.label} initialDataByStation={initialDataByStation} />)}
    <StationV3Styles />
    <SkiAreaStationStyles />
  </div>;
}

export function SkiAreaStationStyles() { return <style jsx global>{`
  .ski-area-station-sections{display:grid;gap:24px;margin-top:24px;min-width:0}
  .ski-area-station-section{min-width:0}
  .ski-area-station-section>.v3-section-heading{margin-bottom:20px}
  .ski-area-station-section .ski-area-station-switch{display:flex;flex-wrap:wrap;gap:5px;width:fit-content;max-width:100%;box-sizing:border-box;overflow:visible;margin:0 0 24px;padding:5px;border:0;border-radius:12px;background:#eef2f7}
  .ski-area-station-switch button{min-height:44px;max-width:100%;white-space:normal;text-align:left}
  .ski-area-station-panel>.v3-floor,.ski-area-station-panel>.v3-location{padding:0;border:0;border-radius:0;box-shadow:none;background:transparent}
  .ski-area-station-attribution,.ski-area-station-panel .v3-highlight{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  .ski-area-station-panel[hidden]{display:none!important}
`}</style>; }
