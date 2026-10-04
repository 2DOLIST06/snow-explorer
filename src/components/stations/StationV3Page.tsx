import Head from "next/head";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import type { StationWidgetsConfig } from "@/types/station";
import type { StationOption } from "@/types/skiArea";
import StationLegacyHero from "@/components/stations/StationLegacyHero";
import StationForfaitsBlock from "@/components/stations/StationForfaitsBlock";
import StationMeteoWidget from "@/components/stations/StationMeteoWidget";
import StationSnowWidget from "@/components/stations/StationSnowWidget";
import StationWebcamsBlock from "@/components/stations/StationWebcamsBlock";
import { MeteoblueSkiWidget } from "@/components/stations/StationLegacyWeather";
import { WebcamsAuto } from "@/components/stations/StationLegacyWebcams";
import { PlanPistesFigure } from "@/components/stations/StationPisteMap";
import StationMapCard from "@/components/maps/StationMapCard";
import SkiAreaPublicCard, { StationCards } from "@/components/stations/SkiAreaPublicCard";
import { getSkiPassBlocksVisibility } from "@/lib/skiPassVisibility";
import { getV2Content, getV2Section, SECTION_LABELS, stationLocation, type StationPageSection } from "@/lib/stationV2";
import { resolveStationPisteMap } from "@/lib/stationPisteMap";

const ORIGIN = "https://www.snow-explorer.com";
const DEFAULT_ORDER: StationPageSection[] = ["apercu", "meteo-neige", "webcams", "forfaits", "plan-des-pistes"];

const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : "";
const usefulNumber = (value: unknown) => Number.isFinite(Number(value)) && Number(value) > 0;
const formatNumber = (value: unknown) => Number(value).toLocaleString("fr-FR");
const editorial = (html: string) => html ? <div className="v3-editorial" dangerouslySetInnerHTML={{ __html: html }} /> : null;

function SectionHeading({ eyebrow, title, intro, id }: { eyebrow: string; title: string; intro?: string; id?: string }) {
  return <header className="v3-section-heading"><p>{eyebrow}</p><h2 id={id}>{title}</h2>{intro ? <span>{intro}</span> : null}</header>;
}

function Overview({ station, widgets }: { station: any; widgets: StationWidgetsConfig | null }) {
  const colors = station.pistes_colors ?? widgets?.pistes?.colors ?? {};
  const stats = [
    ["Altitude basse", station.altitude_base_m ?? station.altitude_min_m, "m"],
    ["Altitude haute", station.altitude_top_m ?? station.altitude_max_m, "m"],
    ["Dénivelé", station.elevation_drop_m ?? station.vertical_drop_m, "m"],
    ["Kilomètres skiables", station.ski_area_km, "km"],
    ["Pistes", station.pistes_count, ""],
    ["Remontées", station.lifts_count, ""],
    ["Snowparks", station.snowparks_count ?? widgets?.snowparks?.count, ""],
  ].filter(([, value]) => usefulNumber(value));
  const pistes = [["Vertes", colors.green, "green"], ["Bleues", colors.blue, "blue"], ["Rouges", colors.red, "red"], ["Noires", colors.black, "black"]]
    .filter(([, value]) => usefulNumber(value));
  const description = text(station.description_md);
  const hasSeason = text(station.season_open_date) || text(station.season_close_date);
  const date = (value: string) => new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return <section className="v3-floor v3-floor--overview" aria-labelledby="v3-overview-title">
    <SectionHeading id="v3-overview-title" eyebrow="La station" title={`Présentation de ${station.name}`} />
    <div className="v3-overview-grid">
      <div className="v3-story">
        {description ? <p>{description}</p> : null}
        {editorial(getV2Content(station, "apercu"))}
      </div>
      {hasSeason ? <aside className="v3-season"><strong>Saison</strong>{text(station.season_open_date) ? <span>Ouverture · {date(station.season_open_date)}</span> : null}{text(station.season_close_date) ? <span>Fermeture · {date(station.season_close_date)}</span> : null}</aside> : null}
    </div>
    {stats.length ? <dl className="v3-stat-grid">{stats.map(([label, value, unit]) => <div key={String(label)}><dt>{label}</dt><dd>{formatNumber(value)}{unit ? ` ${unit}` : ""}</dd></div>)}</dl> : null}
    {pistes.length ? <div className="v3-pistes"><h3>Pistes</h3><dl>{pistes.map(([label, value, color]) => <div key={String(label)} className={`v3-piste v3-piste--${color}`}><dt>{label}</dt><dd>{formatNumber(value)}</dd></div>)}</dl></div> : null}
  </section>;
}

function Weather({ station, widgets }: { station: any; widgets: StationWidgetsConfig | null }) {
  const data = getV2Section(station, "meteo-neige");
  const hasCoordinates = Number.isFinite(Number(station.latitude)) && Number.isFinite(Number(station.longitude));
  const updated = data.updated_at || data.observed_at;
  return <section className="v3-floor v3-floor--tint" aria-labelledby="v3-weather-title">
    <SectionHeading id="v3-weather-title" eyebrow="Conditions" title={`Météo et enneigement à ${station.name}`} intro="Prévisions et informations neige disponibles pour la station." />
    {editorial(getV2Content(station, "meteo-neige"))}
    {text(data.summary) ? <p className="v3-highlight">{data.summary}</p> : null}
    <div className="v3-widget-grid">{hasCoordinates ? <MeteoblueSkiWidget lat={station.latitude} lon={station.longitude} /> : null}<StationMeteoWidget enabled={Boolean(widgets?.meteo?.enabled && widgets.meteo.iframeUrl)} iframeUrl={widgets?.meteo?.iframeUrl || undefined} /><StationSnowWidget enabled={Boolean(widgets?.snow?.enabled && widgets.snow.iframeUrl)} iframeUrl={widgets?.snow?.iframeUrl || undefined} /></div>
    {updated ? <p className="v3-updated">Mise à jour : <time dateTime={updated}>{new Date(updated).toLocaleString("fr-FR")}</time></p> : null}
  </section>;
}

function Webcams({ station, widgets }: { station: any; widgets: StationWidgetsConfig | null }) {
  const data = getV2Section(station, "webcams");
  const items = data.items ?? data.webcams ?? station.webcams ?? widgets?.webcams?.items ?? [];
  const hasCoordinates = Number.isFinite(Number(station.latitude)) && Number.isFinite(Number(station.longitude));
  return <section className="v3-floor" aria-labelledby="v3-webcams-title">
    <SectionHeading id="v3-webcams-title" eyebrow="En direct" title={`Webcams de ${station.name}`} />
    {editorial(getV2Content(station, "webcams"))}
    <div className="v3-media-stage">{Array.isArray(items) && items.length ? <StationWebcamsBlock enabled items={items} /> : hasCoordinates ? <WebcamsAuto name={station.name} lat={station.latitude} lon={station.longitude} /> : <p className="v3-empty">Webcam non disponible pour cette station.</p>}</div>
  </section>;
}

function SkiPasses({ station, widgets }: { station: any; widgets: StationWidgetsConfig | null }) {
  const visibility = getSkiPassBlocksVisibility(Boolean(widgets?.forfaits?.enabled), Boolean(widgets?.normalizedForfaits?.enabled));
  const data = getV2Section(station, "forfaits");
  return <section className="v3-floor v3-floor--tint" aria-labelledby="v3-forfaits-title">
    <SectionHeading id="v3-forfaits-title" eyebrow="Tarifs" title={`Forfaits de ski à ${station.name}`} intro="Saisons, périodes et catégories publiées par la station." />
    {editorial(getV2Content(station, "forfaits"))}
    <div className="v3-passes">{visibility.any ? <><StationForfaitsBlock enabled={visibility.legacy} columns={widgets?.forfaits?.columns || []} items={widgets?.forfaits?.items || []} periods={widgets?.forfaits?.periods || []} season={widgets?.forfaits?.season} source_url={widgets?.forfaits?.source_url} sourceUrl={widgets?.forfaits?.sourceUrl} stationPage /><StationForfaitsBlock enabled={visibility.normalized} periods={widgets?.normalizedForfaits?.periods || []} season={widgets?.normalizedForfaits?.season} source_url={widgets?.normalizedForfaits?.source_url} stationPage /></> : Array.isArray(data.items) && data.items.length ? <StationForfaitsBlock enabled items={data.items} periods={data.periods || []} season={data.season} source_url={data.source_url} stationPage /> : <p className="v3-empty">Forfaits non disponibles pour cette station.</p>}</div>
  </section>;
}

function PisteMap({ station, widgets }: { station: any; widgets: StationWidgetsConfig | null }) {
  const map = resolveStationPisteMap(station, widgets?.pistes || {});
  const available = map.smallMapUrl || map.largeMapUrl || map.officialMapUrl;
  const colors = station.pistes_colors ?? widgets?.pistes?.colors ?? {};
  const facts = [["Pistes", station.pistes_count], ["Remontées", station.lifts_count], ["Vertes", colors.green], ["Bleues", colors.blue], ["Rouges", colors.red], ["Noires", colors.black]].filter(([, value]) => usefulNumber(value));
  return <section className="v3-floor" aria-labelledby="v3-map-title">
    <SectionHeading id="v3-map-title" eyebrow="Le domaine" title={`Plan des pistes de ${station.name}`} />
    {editorial(getV2Content(station, "plan-des-pistes"))}
    <div className="v3-piste-map">{available ? <PlanPistesFigure name={station.name} small={map.smallMapUrl || map.largeMapUrl} large={map.largeMapUrl} officialUrl={map.officialMapUrl} caption={map.caption} /> : <p className="v3-empty">Plan des pistes non disponible pour cette station.</p>}{facts.length ? <aside><h3>En un coup d’œil</h3><dl>{facts.map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{formatNumber(value)}</dd></div>)}</dl></aside> : null}</div>
  </section>;
}

export default function StationV3Page({ station, widgets, departmentStations = [], preview = false }: { station: any; widgets: StationWidgetsConfig | null; departmentStations?: StationOption[]; preview?: boolean }) {
  const [order, setOrder] = useState(DEFAULT_ORDER);
  const [selected, setSelected] = useState<StationPageSection>("apercu");
  const navigationRef = useRef<HTMLElement>(null);
  const location = stationLocation(station);
  const canonical = `${ORIGIN}/stations/${encodeURIComponent(station.slug)}`;
  const sections: Record<StationPageSection, ReactNode> = {
    apercu: <Overview station={station} widgets={widgets} />, "meteo-neige": <Weather station={station} widgets={widgets} />,
    webcams: <Webcams station={station} widgets={widgets} />, forfaits: <SkiPasses station={station} widgets={widgets} />,
    "plan-des-pistes": <PisteMap station={station} widgets={widgets} />,
  };
  const select = (section: StationPageSection) => {
    setSelected(section);
    setOrder([section, ...DEFAULT_ORDER.filter((item) => item !== section)]);
    window.requestAnimationFrame(() => navigationRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  };

  return <><Head><title>{`${station.name}, station de ski : météo, forfaits et pistes | Snow Explorer`}</title><meta name="description" content={`Découvrez ${station.name}${location ? `, ${location}` : ""} : pistes, météo, webcams, forfaits et plan des pistes sur une seule page.`} /><link rel="canonical" href={canonical} /><meta name="robots" content={preview ? "noindex, nofollow" : "index, follow"} /></Head>
    <StationLegacyHero station={station} />
    <nav id="station-conditions" ref={navigationRef} className="v3-navigation" aria-label="Rubriques de la fiche station">{DEFAULT_ORDER.map((section) => <button key={section} type="button" aria-pressed={selected === section} onClick={() => select(section)}>{SECTION_LABELS[section]}</button>)}</nav>
    <main className="v3-page"><nav className="v3-breadcrumb" aria-label="Fil d’Ariane"><Link href="/">Accueil</Link><span aria-hidden="true">›</span><Link href="/stations">Stations</Link><span aria-hidden="true">›</span><span aria-current="page">{station.name}</span></nav>
      <div className="v3-floors">{order.map((section) => <div key={section} className="v3-floor-slot">{sections[section]}</div>)}</div>
      <div className="v3-complementary">{Array.isArray(station.ski_areas) ? station.ski_areas.filter((area: any) => area?.status === "published").map((area: any) => <SkiAreaPublicCard key={area.id} area={area} compact />) : null}
        <section className="v3-location"><SectionHeading eyebrow="Localisation" title={`Situer ${station.name}`} /><StationMapCard station={{ id: station.id || station.slug, name: station.name, slug: station.slug, latitude: station.latitude, longitude: station.longitude, logo: station.logo_url || null, department: typeof station.department === "string" ? station.department : station.department?.name || null, region: station.region?.name || null }} /></section>
        {!station.ski_areas?.length && departmentStations.length ? <section className="ski-area-public-card"><header><p className="eyebrow">À proximité</p><h2>Autres stations du même département</h2></header><StationCards stations={departmentStations} /></section> : null}
      </div>
    </main>
    <style jsx global>{`.v3-navigation{position:sticky;top:0;z-index:20;display:flex;gap:7px;overflow-x:auto;scrollbar-width:thin;padding:11px max(16px,calc((100vw - 1180px)/2));background:rgba(255,255,255,.96);border-bottom:1px solid var(--line,#d8e1e8);backdrop-filter:blur(12px);scroll-margin-top:0}.v3-navigation button{flex:0 0 auto;padding:10px 16px;border:1px solid transparent;border-radius:999px;background:transparent;color:var(--brand,#12314b);font:inherit;font-weight:800;cursor:pointer}.v3-navigation button[aria-pressed=true]{border-color:#0b6c9e;background:#0b6c9e;color:#fff}.v3-navigation button:focus-visible{outline:3px solid #38bdf8;outline-offset:2px}.v3-page{max-width:1180px;margin:auto;padding:22px 20px 70px;color:#132b3e}.v3-breadcrumb{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px;color:#536b7d;font-size:.88rem}.v3-floors,.v3-complementary{display:grid;gap:24px}.v3-floor-slot{display:block}.v3-floor{padding:clamp(20px,4vw,42px);overflow:hidden;border:1px solid #d9e3eb;border-radius:22px;background:#fff;box-shadow:0 12px 30px rgba(18,49,75,.06)}.v3-floor--tint{background:#f3f7fa}.v3-section-heading{max-width:780px;margin-bottom:24px}.v3-section-heading>p{margin:0 0 7px;color:#0b6c9e;font-size:.76rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.v3-section-heading h2{margin:0;color:#132b3e;font-size:clamp(1.55rem,3vw,2.35rem);line-height:1.15}.v3-section-heading>span{display:block;margin-top:9px;color:#536b7d;line-height:1.6}.v3-overview-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(230px,1fr);gap:18px;align-items:start}.v3-story{font-size:1.06rem;line-height:1.75}.v3-story>p:first-child{margin-top:0}.v3-editorial{max-width:880px;line-height:1.75}.v3-editorial>:first-child{margin-top:0}.v3-editorial>:last-child{margin-bottom:0}.v3-season{display:grid;gap:7px;padding:18px;border-radius:15px;background:#e5eef4}.v3-season strong{color:#0b6c9e;text-transform:uppercase;letter-spacing:.08em}.v3-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin:25px 0 0}.v3-stat-grid div{display:flex;min-height:105px;flex-direction:column;justify-content:flex-end;padding:16px;border:1px solid #d9e3eb;border-radius:15px;background:#fff}.v3-stat-grid dt{order:2;color:#536b7d;font-size:.82rem}.v3-stat-grid dd{margin:0 0 4px;color:#132b3e;font-size:1.65rem;font-weight:900}.v3-pistes{margin-top:25px}.v3-pistes h3{margin-bottom:12px}.v3-pistes dl{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0}.v3-piste{padding:15px;border-left:7px solid #64748b;border-radius:12px;background:#f5f7f9}.v3-piste--green{border-color:#299447}.v3-piste--blue{border-color:#2477c8}.v3-piste--red{border-color:#d43b3b}.v3-piste--black{border-color:#202b35}.v3-piste dt{color:#536b7d}.v3-piste dd{margin:3px 0 0;font-size:1.4rem;font-weight:900}.v3-highlight,.v3-empty{padding:18px;border:1px solid #d9e3eb;border-radius:14px;background:#fff;color:#536b7d}.v3-widget-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:20px}.v3-widget-grid>*:first-child:last-child{grid-column:1/-1}.v3-updated{color:#536b7d;font-size:.86rem}.v3-media-stage{display:grid;gap:16px}.v3-media-stage iframe{width:100%;min-height:360px;border:0;border-radius:14px}.v3-passes{display:grid;gap:18px;overflow-x:auto;margin-top:20px}.v3-piste-map{display:grid;grid-template-columns:minmax(0,2fr) minmax(220px,1fr);gap:20px;align-items:start}.v3-piste-map>figure{margin:0}.v3-piste-map aside{padding:20px;border-radius:16px;background:#eef3f7}.v3-piste-map aside h3{margin-top:0}.v3-piste-map aside dl{display:grid;gap:3px;margin:0}.v3-piste-map aside dl div{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #d1dce4}.v3-piste-map aside dd{margin:0;font-weight:900}.v3-complementary{margin-top:24px}.v3-location{padding:clamp(20px,4vw,36px);border-radius:22px;background:#eaf1f5}.v3-location .station-map-card{height:430px}.v3-location .station-map-card>h2{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}@media(max-width:760px){.v3-page{padding:16px 12px 50px}.v3-floor{padding:22px 16px;border-radius:17px}.v3-overview-grid,.v3-widget-grid,.v3-piste-map{grid-template-columns:1fr}.v3-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.v3-pistes dl{grid-template-columns:repeat(2,1fr)}.v3-media-stage iframe{min-height:280px}.v3-location{padding:16px}.v3-location .station-map-card{height:380px}}@media(max-width:420px){.v3-stat-grid{grid-template-columns:1fr 1fr}.v3-stat-grid div{min-height:90px;padding:12px}.v3-stat-grid dd{font-size:1.35rem}}@media(prefers-reduced-motion:reduce){.v3-navigation{scroll-behavior:auto}}`}</style>
  </>;
}
