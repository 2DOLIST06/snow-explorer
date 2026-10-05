import Head from "next/head";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import type { StationWidgetsConfig } from "@/types/station";
import type { StationOption } from "@/types/skiArea";
import StationLegacyHero from "@/components/stations/StationLegacyHero";
import StationForfaitsBlocks, { hasStationForfaits } from "@/components/stations/StationForfaitsBlocks";
import StationMeteoWidget from "@/components/stations/StationMeteoWidget";
import StationSnowWidget from "@/components/stations/StationSnowWidget";
import StationWebcamsBlock from "@/components/stations/StationWebcamsBlock";
import { MeteoblueSkiWidget } from "@/components/stations/StationLegacyWeather";
import { WebcamsAuto } from "@/components/stations/StationLegacyWebcams";
import { PlanPistesFigure } from "@/components/stations/StationPisteMap";
import StationMapCard from "@/components/maps/StationMapCard";
import SkiAreaPublicCard, { StationCards } from "@/components/stations/SkiAreaPublicCard";
import { getStationEditorialContent, getStationSectionData, SECTION_LABELS, stationLocation, type StationPageSection } from "@/lib/stationContent";
import { resolveStationPisteMap } from "@/lib/stationPisteMap";
import { getStationOverviewScope, getStationPresentation } from "@/lib/stationOverview";

const ORIGIN = "https://www.snow-explorer.com";
type StationV3Section = StationPageSection | "localisation-acces";

const DEFAULT_ORDER: StationV3Section[] = ["apercu", "meteo-neige", "webcams", "forfaits", "plan-des-pistes", "localisation-acces"];
const V3_SECTION_LABELS: Record<StationV3Section, string> = { ...SECTION_LABELS, "localisation-acces": "Localisation et accès" };

const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : "";
const usefulNumber = (value: unknown) => Number.isFinite(Number(value)) && Number(value) > 0;
const formatNumber = (value: unknown) => Number(value).toLocaleString("fr-FR");
const editorial = (html: string) => html ? <div className="v3-editorial" dangerouslySetInnerHTML={{ __html: html }} /> : null;

function SectionHeading({ eyebrow, title, intro, id }: { eyebrow: string; title: string; intro?: string; id?: string }) {
  return <header className="v3-section-heading"><p>{eyebrow}</p><h2 id={id}>{title}</h2>{intro ? <span>{intro}</span> : null}</header>;
}

function Overview({ station, widgets }: { station: any; widgets: StationWidgetsConfig | null }) {
  const skiAreas = Array.isArray(station.ski_areas) ? station.ski_areas.filter((area: any) => area?.status === "published") : [];
  const [selectedScope, setSelectedScope] = useState<"station" | number>("station");
  const selectedSkiArea = typeof selectedScope === "number" ? skiAreas.find((area: any) => area.id === selectedScope) || null : null;
  const scope = getStationOverviewScope(station, widgets, selectedSkiArea);
  const stats = [
    ["Altitude basse", scope.altitudeMin, "m"], ["Altitude haute", scope.altitudeMax, "m"],
    ["Dénivelé", scope.elevationDrop, "m"], ["Kilomètres skiables", scope.skiAreaKm, "km"],
    ["Pistes", scope.pistesCount, ""], ["Remontées", scope.liftsCount, ""], ["Snowparks", scope.snowparksCount, ""],
  ].filter(([, value]) => usefulNumber(value));
  const descriptionParagraphs = getStationPresentation(station, widgets);
  const hasSeason = text(scope.openDate) || text(scope.closeDate);
  const date = (value: string) => new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return <section className="v3-floor v3-floor--overview" aria-labelledby="v3-overview-title">
    <SectionHeading id="v3-overview-title" eyebrow="La station" title={`Présentation de ${station.name}`} />
    <div className="v3-overview-grid">
      <div className="v3-story">{descriptionParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}{editorial(getStationEditorialContent(station, "apercu"))}</div>
      {hasSeason ? <aside className="v3-season"><strong>Saison</strong>{text(scope.openDate) ? <span>Ouverture · {date(String(scope.openDate))}</span> : null}{text(scope.closeDate) ? <span>Fermeture · {date(String(scope.closeDate))}</span> : null}</aside> : null}
    </div>
    {skiAreas.length ? <div className="v3-scope" role="group" aria-label="Informations affichées"><button type="button" aria-pressed={selectedScope === "station"} onClick={() => setSelectedScope("station")}>Station</button>{skiAreas.map((area: any) => <button type="button" key={area.id} aria-pressed={selectedScope === area.id} onClick={() => setSelectedScope(area.id)}>{area.name}</button>)}</div> : null}
    {stats.length ? <dl className="v3-stat-grid">{stats.map(([label, value, unit]) => <div key={String(label)}><dt>{label}</dt><dd>{formatNumber(value)}{unit ? ` ${unit}` : ""}</dd></div>)}</dl> : null}
    {scope.pistes.length ? <div className="v3-pistes"><h3>Pistes par difficulté</h3><dl>{scope.pistes.map(({ label, value, color }) => <div key={label} className={`v3-piste v3-piste--${color}`}><dt>Pistes {label.toLowerCase()}</dt><dd>{formatNumber(value)}</dd></div>)}</dl></div> : null}
    {selectedSkiArea ? <Link className="v3-ski-area-link" href={`/domaines-skiables/${selectedSkiArea.slug}`}>Voir la fiche du domaine skiable</Link> : null}
  </section>;
}

function Weather({ station, widgets }: { station: any; widgets: StationWidgetsConfig | null }) {
  const data = getStationSectionData(station, "meteo-neige");
  const hasCoordinates = Number.isFinite(Number(station.latitude)) && Number.isFinite(Number(station.longitude));
  const updated = data.updated_at || data.observed_at;
  return <section className="v3-floor v3-floor--tint" aria-labelledby="v3-weather-title">
    <SectionHeading id="v3-weather-title" eyebrow="Conditions" title={`Météo et enneigement à ${station.name}`} intro="Prévisions et informations neige disponibles pour la station." />
    {editorial(getStationEditorialContent(station, "meteo-neige"))}
    {text(data.summary) ? <p className="v3-highlight">{data.summary}</p> : <p className="v3-highlight">Consultez les prévisions météo et les informations d’enneigement disponibles pour {station.name}.</p>}
    <div className="v3-widget-grid">{hasCoordinates ? <MeteoblueSkiWidget lat={station.latitude} lon={station.longitude} headingLevel="h3" /> : null}<StationMeteoWidget enabled={Boolean(widgets?.meteo?.enabled && widgets.meteo.iframeUrl)} iframeUrl={widgets?.meteo?.iframeUrl || undefined} /><StationSnowWidget enabled={Boolean(widgets?.snow?.enabled && widgets.snow.iframeUrl)} iframeUrl={widgets?.snow?.iframeUrl || undefined} /></div>
    {updated ? <p className="v3-updated">Mise à jour : <time dateTime={updated}>{new Date(updated).toLocaleString("fr-FR")}</time></p> : null}
  </section>;
}

function Webcams({ station, widgets }: { station: any; widgets: StationWidgetsConfig | null }) {
  const data = getStationSectionData(station, "webcams");
  const items = data.items ?? data.webcams ?? station.webcams ?? widgets?.webcams?.items ?? [];
  const hasCoordinates = Number.isFinite(Number(station.latitude)) && Number.isFinite(Number(station.longitude));
  return <section className="v3-floor" aria-labelledby="v3-webcams-title">
    <SectionHeading id="v3-webcams-title" eyebrow="En direct" title={`Webcams de ${station.name}`} />
    {editorial(getStationEditorialContent(station, "webcams"))}
    <p className="v3-highlight">Consultez les webcams disponibles pour {station.name}.</p>
    <div className="v3-media-stage">{Array.isArray(items) && items.length ? <StationWebcamsBlock enabled items={items} headingLevel="h3" /> : hasCoordinates ? <WebcamsAuto name={station.name} lat={station.latitude} lon={station.longitude} headingLevel="h3" /> : <p className="v3-empty">Webcam non disponible pour cette station.</p>}</div>
  </section>;
}

function SkiPasses({ station, widgets }: { station: any; widgets: StationWidgetsConfig | null }) {
  return <section className="v3-floor v3-floor--tint" aria-labelledby="v3-forfaits-title">
    <SectionHeading id="v3-forfaits-title" eyebrow="Tarifs" title={`Forfaits de ski à ${station.name}`} intro="Saisons, périodes et catégories publiées par la station." />
    {editorial(getStationEditorialContent(station, "forfaits"))}
    <div className="v3-passes">{hasStationForfaits(widgets) ? <StationForfaitsBlocks widgets={widgets} headingLevel="h3" /> : <p className="v3-empty">Forfaits non disponibles pour cette station.</p>}</div>
  </section>;
}

function PisteMap({ station, widgets }: { station: any; widgets: StationWidgetsConfig | null }) {
  const map = resolveStationPisteMap(station, widgets?.pistes || {});
  const available = map.smallMapUrl || map.largeMapUrl || map.officialMapUrl;
  const colors = station.pistes_colors ?? widgets?.pistes?.colors ?? {};
  const facts = [["Pistes", station.pistes_count], ["Remontées", station.lifts_count], ["Vertes", colors.green], ["Bleues", colors.blue], ["Rouges", colors.red], ["Noires", colors.black]].filter(([, value]) => usefulNumber(value));
  return <section className="v3-floor" aria-labelledby="v3-map-title">
    <SectionHeading id="v3-map-title" eyebrow="Le domaine" title={`Plan des pistes de ${station.name}`} />
    {editorial(getStationEditorialContent(station, "plan-des-pistes"))}
    <div className="v3-piste-map">{available ? <PlanPistesFigure name={station.name} small={map.smallMapUrl || map.largeMapUrl} large={map.largeMapUrl} officialUrl={map.officialMapUrl} caption={map.caption} headingLevel="h3" /> : <p className="v3-empty">Plan des pistes non disponible pour cette station.</p>}{facts.length ? <aside><h3>En un coup d’œil</h3><dl>{facts.map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{formatNumber(value)}</dd></div>)}</dl></aside> : null}</div>
  </section>;
}

function LocationAccess({ station }: { station: any }) {
  return <section className="v3-location" aria-labelledby="v3-location-title">
    <SectionHeading id="v3-location-title" eyebrow="Localisation" title={`Localisation et accès à ${station.name}`} />
    <StationMapCard headingLevel="h3" station={{ id: station.id || station.slug, name: station.name, slug: station.slug, latitude: station.latitude, longitude: station.longitude, logo: station.logo_url || null, department: typeof station.department === "string" ? station.department : station.department?.name || null, region: station.region?.name || null }} />
  </section>;
}

export default function StationV3Page({ station, widgets, departmentStations = [] }: { station: any; widgets: StationWidgetsConfig | null; departmentStations?: StationOption[] }) {
  const [order, setOrder] = useState(DEFAULT_ORDER);
  const [selected, setSelected] = useState<StationV3Section>("apercu");
  const navigationRef = useRef<HTMLElement>(null);
  const location = stationLocation(station);
  const canonical = `${ORIGIN}/stations/${encodeURIComponent(station.slug)}`;
  const sections: Record<StationV3Section, ReactNode> = {
    apercu: <Overview station={station} widgets={widgets} />, "meteo-neige": <Weather station={station} widgets={widgets} />,
    webcams: <Webcams station={station} widgets={widgets} />, forfaits: <SkiPasses station={station} widgets={widgets} />,
    "plan-des-pistes": <PisteMap station={station} widgets={widgets} />,
    "localisation-acces": <LocationAccess station={station} />,
  };
  const select = (section: StationV3Section) => {
    setSelected(section);
    setOrder([section, ...DEFAULT_ORDER.filter((item) => item !== section)]);
    window.requestAnimationFrame(() => navigationRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  };

  const title = text(station.meta_title) || `${station.name}, station de ski : météo, forfaits et pistes | Snow Explorer`;
  const description = text(station.meta_description) || `Découvrez ${station.name}${location ? `, ${location}` : ""} : pistes, météo, webcams, forfaits et plan des pistes sur une seule page.`;
  const coverImage = text(station.cover_image_url);
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: `${ORIGIN}/` },
      { "@type": "ListItem", position: 2, name: "Stations", item: `${ORIGIN}/stations` },
      { "@type": "ListItem", position: 3, name: station.name, item: canonical },
    ],
  };

  return <><Head><title>{title}</title><meta name="description" content={description} /><link rel="canonical" href={canonical} /><meta name="robots" content="index, follow" />
    <meta property="og:title" content={title} /><meta property="og:description" content={description} /><meta property="og:url" content={canonical} /><meta property="og:type" content="website" />{coverImage ? <meta property="og:image" content={coverImage} /> : null}
    {coverImage ? <meta name="twitter:card" content="summary_large_image" /> : null}<meta name="twitter:title" content={title} /><meta name="twitter:description" content={description} />{coverImage ? <meta name="twitter:image" content={coverImage} /> : null}
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
  </Head>
    <StationLegacyHero station={station} />
    <nav id="station-conditions" ref={navigationRef} className="v3-navigation" aria-label="Rubriques de la fiche station">{DEFAULT_ORDER.map((section) => <button key={section} type="button" aria-pressed={selected === section} onClick={() => select(section)}>{V3_SECTION_LABELS[section]}</button>)}</nav>
    <main className="v3-page"><nav className="v3-breadcrumb" aria-label="Fil d’Ariane"><Link href="/">Accueil</Link><span aria-hidden="true">›</span><Link href="/stations">Stations</Link><span aria-hidden="true">›</span><span aria-current="page">{station.name}</span></nav>
      <div className="v3-floors">{order.map((section) => <div key={section} className="v3-floor-slot">{sections[section]}</div>)}</div>
      <div className="v3-complementary">{Array.isArray(station.ski_areas) ? station.ski_areas.filter((area: any) => area?.status === "published").map((area: any) => <SkiAreaPublicCard key={area.id} area={area} compact />) : null}
        {!station.ski_areas?.length && departmentStations.length ? <section className="ski-area-public-card"><header><p className="eyebrow">À proximité</p><h2>Autres stations du même département</h2></header><StationCards stations={departmentStations} /></section> : null}
      </div>
    </main>
    <style jsx global>{`.v3-navigation{position:sticky;top:0;z-index:20;display:flex;gap:7px;overflow-x:auto;scrollbar-width:thin;padding:11px max(16px,calc((100vw - 1180px)/2));background:rgba(255,255,255,.96);border-bottom:1px solid var(--line,#d8e1e8);backdrop-filter:blur(12px);scroll-margin-top:0}.v3-navigation button{flex:0 0 auto;padding:10px 16px;border:1px solid transparent;border-radius:999px;background:transparent;color:var(--brand,#12314b);font:inherit;font-weight:800;cursor:pointer}.v3-navigation button[aria-pressed=true]{border-color:#0b6c9e;background:#0b6c9e;color:#fff}.v3-navigation button:focus-visible{outline:3px solid #38bdf8;outline-offset:2px}.v3-page{max-width:1180px;margin:auto;padding:22px 20px 70px;color:#132b3e}.v3-breadcrumb{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px;color:#536b7d;font-size:.88rem}.v3-floors,.v3-complementary{display:grid;gap:24px}.v3-floor-slot{display:block}.v3-floor{padding:clamp(20px,4vw,42px);overflow:hidden;border:1px solid #d9e3eb;border-radius:22px;background:#fff;box-shadow:0 12px 30px rgba(18,49,75,.06)}.v3-floor--tint{background:#f3f7fa}.v3-section-heading{max-width:780px;margin-bottom:24px}.v3-section-heading>p{margin:0 0 7px;color:#0b6c9e;font-size:.76rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.v3-section-heading h2{margin:0;color:#132b3e;font-size:clamp(1.55rem,3vw,2.35rem);line-height:1.15}.v3-section-heading>span{display:block;margin-top:9px;color:#536b7d;line-height:1.6}.v3-overview-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(230px,1fr);gap:18px;align-items:start}.v3-story{font-size:1.06rem;line-height:1.75}.v3-story>p:first-child{margin-top:0}.v3-editorial{max-width:880px;line-height:1.75}.v3-editorial>:first-child{margin-top:0}.v3-editorial>:last-child{margin-bottom:0}.v3-season{display:grid;gap:7px;padding:18px;border-radius:15px;background:#e5eef4}.v3-season strong{color:#0b6c9e;text-transform:uppercase;letter-spacing:.08em}.v3-scope{display:flex;width:max-content;max-width:100%;overflow-x:auto;margin-top:25px;padding:4px;border:1px solid #cbd9e3;border-radius:12px;background:#eef3f7}.v3-scope button{flex:0 0 auto;padding:9px 14px;border:0;border-radius:9px;background:transparent;color:#29465d;font:inherit;font-weight:800;cursor:pointer}.v3-scope button[aria-pressed=true]{background:#0b6c9e;color:#fff;box-shadow:0 2px 7px rgba(11,108,158,.22)}.v3-scope button:focus-visible{outline:3px solid #38bdf8;outline-offset:1px}.v3-ski-area-link{display:inline-block;margin-top:20px;color:#0b6c9e;font-weight:800}.v3-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin:25px 0 0}.v3-stat-grid div{display:flex;min-height:105px;flex-direction:column;justify-content:flex-end;padding:16px;border:1px solid #d9e3eb;border-radius:15px;background:#fff}.v3-stat-grid dt{order:2;color:#536b7d;font-size:.82rem}.v3-stat-grid dd{margin:0 0 4px;color:#132b3e;font-size:1.65rem;font-weight:900}.v3-pistes{margin-top:25px}.v3-pistes h3{margin-bottom:12px}.v3-pistes dl{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0}.v3-piste{padding:15px;border-left:7px solid #64748b;border-radius:12px;background:#f5f7f9}.v3-piste--green{border-color:#299447}.v3-piste--blue{border-color:#2477c8}.v3-piste--red{border-color:#d43b3b}.v3-piste--black{border-color:#202b35}.v3-piste dt{color:#536b7d}.v3-piste dd{margin:3px 0 0;font-size:1.4rem;font-weight:900}.v3-highlight,.v3-empty{padding:18px;border:1px solid #d9e3eb;border-radius:14px;background:#fff;color:#536b7d}.v3-widget-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:20px}.v3-widget-grid>*:first-child:last-child{grid-column:1/-1}.v3-updated{color:#536b7d;font-size:.86rem}.v3-media-stage{display:grid;gap:16px}.v3-media-stage iframe{width:100%;min-height:360px;border:0;border-radius:14px}.v3-passes{display:grid;gap:18px;overflow-x:auto;margin-top:20px}.v3-piste-map{display:grid;grid-template-columns:minmax(0,2fr) minmax(220px,1fr);gap:20px;align-items:start}.v3-piste-map>figure{margin:0}.v3-piste-map aside{padding:20px;border-radius:16px;background:#eef3f7}.v3-piste-map aside h3{margin-top:0}.v3-piste-map aside dl{display:grid;gap:3px;margin:0}.v3-piste-map aside dl div{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #d1dce4}.v3-piste-map aside dd{margin:0;font-weight:900}.v3-complementary{margin-top:24px}.v3-location{padding:clamp(20px,4vw,36px);border-radius:22px;background:#eaf1f5}.v3-location .station-map-card{height:430px}.v3-location .station-map-card>h3{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}@media(max-width:760px){.v3-page{padding:16px 12px 50px}.v3-floor{padding:22px 16px;border-radius:17px}.v3-overview-grid,.v3-widget-grid,.v3-piste-map{grid-template-columns:1fr}.v3-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.v3-pistes dl{grid-template-columns:repeat(2,1fr)}.v3-media-stage iframe{min-height:280px}.v3-location{padding:16px}.v3-location .station-map-card{height:380px}}@media(max-width:420px){.v3-stat-grid{grid-template-columns:1fr 1fr}.v3-stat-grid div{min-height:90px;padding:12px}.v3-stat-grid dd{font-size:1.35rem}}@media(prefers-reduced-motion:reduce){.v3-navigation{scroll-behavior:auto}}`}</style>
  </>;
}
