import Head from "next/head";
import Link from "next/link";
import type { StationWidgetsConfig } from "@/types/station";
import StationForfaitsBlock from "@/components/stations/StationForfaitsBlock";
import SkiAreaPublicCard from "@/components/stations/SkiAreaPublicCard";
import StationMeteoWidget from "@/components/stations/StationMeteoWidget";
import StationSnowWidget from "@/components/stations/StationSnowWidget";
import { MeteoblueSkiWidget } from "@/components/stations/StationLegacyWeather";
import { WebcamsAuto } from "@/components/stations/StationLegacyWebcams";
import StationWebcamsBlock from "@/components/stations/StationWebcamsBlock";
import StationLegacyHero from "@/components/stations/StationLegacyHero";
import { PlanPistesFigure } from "@/components/stations/StationPisteMap";
import { resolveStationPisteMap } from "@/lib/stationPisteMap";
import { getV2Content, getV2Section, hasV2SectionData, previewSectionHref, publishedV2Sections, sectionHref, SECTION_LABELS, stationLocation, STATION_V2_SECTIONS, type StationPageSection } from "@/lib/stationV2";

const ORIGIN = "https://www.snow-explorer.com";
const present = (value: unknown): value is string | number => value !== null && value !== undefined && value !== "" && Number.isFinite(typeof value === "number" ? value : Number(value));
const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : "";

function metadata(station: any, section: StationPageSection) {
  const name = station.name;
  const location = stationLocation(station);
  const titles: Record<StationPageSection, string> = {
    apercu: `Station de ski ${name} : pistes, météo et forfaits | Snow Explorer`,
    "meteo-neige": `Météo ${name} et enneigement | Snow Explorer`,
    forfaits: `Forfaits de ski ${name} : tarifs | Snow Explorer`,
    "plan-des-pistes": `Plan des pistes ${name} | Snow Explorer`,
    webcams: `Webcams ${name} | Snow Explorer`,
  };
  const descriptions: Record<StationPageSection, string> = {
    apercu: `Découvrez la station de ski ${name}${location ? ` en ${location}` : ""}, ses pistes et les informations pratiques disponibles.`,
    "meteo-neige": `Consultez la météo, les prévisions et les informations d’enneigement disponibles pour ${name}.`,
    forfaits: `Consultez les tarifs, périodes et catégories de forfaits de ski disponibles à ${name}.`,
    "plan-des-pistes": `Consultez le plan des pistes de ${name} et les informations disponibles sur ses pistes et remontées.`,
    webcams: `Consultez les webcams publiées pour la station de ski ${name}.`,
  };
  return { title: titles[section].length > 65 && section === "apercu" ? `${name}, station de ski : météo et pistes | Snow Explorer` : titles[section], description: descriptions[section] };
}

function Navigation({ station, active, preview }: { station: any; active: StationPageSection; preview: boolean }) {
  const sections: StationPageSection[] = ["apercu", ...STATION_V2_SECTIONS];
  return <nav className="v2-tabs" aria-label="Navigation de la station">{sections.map((section) => {
    const href = preview ? previewSectionHref(station.slug, section) : sectionHref(station.slug, section);
    return <Link key={section} href={href} aria-current={active === section ? "page" : undefined}>{SECTION_LABELS[section]}</Link>;
  })}</nav>;
}

function Breadcrumbs({ station, section, preview }: { station: any; section: StationPageSection; preview: boolean }) {
  const items = [{ name: "Accueil", href: "/" }, { name: "Stations", href: "/stations" }, { name: station.name, href: preview ? previewSectionHref(station.slug, "apercu") : sectionHref(station.slug, "apercu") }];
  const jsonItems = [...items, ...(section === "apercu" ? [] : [{ name: SECTION_LABELS[section], href: sectionHref(station.slug, section) }])];
  return <><nav className="v2-breadcrumb" aria-label="Fil d’Ariane">{items.map((item, index) => <span key={item.href}><Link href={item.href}>{item.name}</Link>{index < items.length - 1 || section !== "apercu" ? <b aria-hidden="true">›</b> : null}</span>)}{section !== "apercu" ? <span aria-current="page">{SECTION_LABELS[section]}</span> : null}</nav><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: jsonItems.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: `${ORIGIN}${item.href}` })) }) }} /></>;
}

const editorial = (html: string) => html ? <div className="v2-editorial" dangerouslySetInnerHTML={{ __html: html }} /> : null;

function Overview({ station, widgets, preview }: { station: any; widgets: StationWidgetsConfig | null; preview: boolean }) {
  const colors = station.pistes_colors ?? widgets?.pistes?.colors ?? {};
  const stats = [
    ["Altitude basse", station.altitude_base_m ?? station.altitude_min_m, "m"], ["Altitude haute", station.altitude_top_m ?? station.altitude_max_m, "m"],
    ["Dénivelé", station.elevation_drop_m ?? station.vertical_drop_m, "m"], ["Pistes", station.pistes_count, ""], ["Kilomètres skiables", station.ski_area_km, "km"],
    ["Pistes vertes", colors.green, ""], ["Pistes bleues", colors.blue, ""], ["Pistes rouges", colors.red, ""], ["Pistes noires", colors.black, ""],
    ["Remontées", station.lifts_count, ""], ["Snowparks", station.snowparks_count ?? widgets?.snowparks?.count, ""],
  ].filter(([, value]) => present(value));
  const sections = STATION_V2_SECTIONS;
  return <>
    {text(station.description_md) ? <div className="v2-editorial"><p>{station.description_md}</p></div> : null}
    {editorial(getV2Content(station, "apercu"))}
    {stats.length ? <section><h2>La station en chiffres</h2><div className="v2-stats">{stats.map(([label, value, unit]) => <div key={String(label)}><strong>{String(value)}{unit ? ` ${unit}` : ""}</strong><span>{label}</span></div>)}</div></section> : null}
    {(station.season_open_date || station.season_close_date) ? <section><h2>Saison</h2><p>{station.season_open_date ? `Ouverture : ${new Date(station.season_open_date).toLocaleDateString("fr-FR")}. ` : ""}{station.season_close_date ? `Fermeture : ${new Date(station.season_close_date).toLocaleDateString("fr-FR")}.` : ""}</p></section> : null}
    <section><h2>Préparer votre séjour</h2><div className="v2-cards">{sections.map((section) => <article key={section}><h3>{SECTION_LABELS[section]}</h3><p>{section === "meteo-neige" ? "Retrouvez les prévisions et les données d’enneigement publiées." : section === "forfaits" ? "Consultez les périodes, catégories et tarifs disponibles." : section === "plan-des-pistes" ? "Visualisez le plan et les principales données du domaine." : "Découvrez les vues disponibles depuis la station."}</p><Link href={preview ? previewSectionHref(station.slug, section) : sectionHref(station.slug, section)}>Voir {section === "forfaits" ? "les forfaits" : section === "webcams" ? "les webcams" : section === "plan-des-pistes" ? "le plan des pistes" : "la météo et l’enneigement"}</Link></article>)}</div></section>
    {Array.isArray(station.ski_areas) ? station.ski_areas.filter((area: any) => area?.status === "published").map((area: any) => <SkiAreaPublicCard key={area.id} area={area} />) : null}
  </>;
}

function Detail({ station, widgets, section }: { station: any; widgets: StationWidgetsConfig | null; section: Exclude<StationPageSection, "apercu"> }) {
  const data = getV2Section(station, section);
  const unavailable = <p className="v2-callout">Cette information n&apos;est pas disponible pour cette station.</p>;
  if (section === "forfaits") return <>{editorial(getV2Content(station, section))}{hasV2SectionData(station, section, widgets) ? <div className="v2-table"><StationForfaitsBlock enabled={Boolean(widgets?.forfaits?.enabled)} columns={widgets?.forfaits?.columns || []} items={widgets?.forfaits?.items || []} periods={widgets?.forfaits?.periods || []} season={widgets?.forfaits?.season} source_url={widgets?.forfaits?.source_url} stationPage /><StationForfaitsBlock enabled={Boolean(widgets?.normalizedForfaits?.enabled)} periods={widgets?.normalizedForfaits?.periods || []} season={widgets?.normalizedForfaits?.season} source_url={widgets?.normalizedForfaits?.source_url} stationPage /></div> : unavailable}{text(data.conditions) ? <p>{data.conditions}</p> : null}</>;
  if (section === "plan-des-pistes") {
    const map = resolveStationPisteMap(station, widgets?.pistes || {});
    const available = map.smallMapUrl || map.largeMapUrl || map.officialMapUrl;
    return <>{editorial(getV2Content(station, section))}{available ? <PlanPistesFigure name={station.name} small={map.smallMapUrl || map.largeMapUrl} large={map.largeMapUrl} officialUrl={map.officialMapUrl} caption={map.caption} /> : unavailable}</>;
  }
  if (section === "webcams") {
    const items = data.items ?? data.webcams ?? station.webcams ?? widgets?.webcams?.items ?? [];
    const hasCoordinates = Number.isFinite(Number(station.latitude)) && Number.isFinite(Number(station.longitude));
    return <>{editorial(getV2Content(station, section))}{items.length ? <StationWebcamsBlock enabled items={items} /> : hasCoordinates ? <WebcamsAuto name={station.name} lat={station.latitude} lon={station.longitude} /> : unavailable}</>;
  }
  const updated = data.updated_at || data.observed_at;
  return <>{editorial(getV2Content(station, section))}{text(data.summary) ? <p className="v2-callout">{data.summary}</p> : null}{hasV2SectionData(station, section, widgets) ? <div className="v2-weather">{Number.isFinite(Number(station.latitude)) && Number.isFinite(Number(station.longitude)) ? <MeteoblueSkiWidget lat={station.latitude} lon={station.longitude} /> : null}<StationMeteoWidget enabled={Boolean(widgets?.meteo?.enabled && widgets.meteo.iframeUrl)} iframeUrl={widgets?.meteo?.iframeUrl || undefined} /><StationSnowWidget enabled={Boolean(widgets?.snow?.enabled && widgets.snow.iframeUrl)} iframeUrl={widgets?.snow?.iframeUrl || undefined} /></div> : unavailable}{updated ? <p className="v2-updated">Mise à jour : <time dateTime={updated}>{new Date(updated).toLocaleString("fr-FR")}</time></p> : null}</>;
}

export default function StationV2Page({ station, widgets, section = "apercu", preview = false }: { station: any; widgets: StationWidgetsConfig | null; section?: StationPageSection; preview?: boolean }) {
  const seo = metadata(station, section); const canonical = `${ORIGIN}${sectionHref(station.slug, section)}`;
  const h1 = section === "apercu" ? station.name : section === "meteo-neige" ? `Météo et enneigement à ${station.name}` : section === "forfaits" ? `Forfaits de ski à ${station.name}` : section === "plan-des-pistes" ? `Plan des pistes de ${station.name}` : `Webcams de ${station.name}`;
  return <><Head><title>{seo.title}</title><meta name="description" content={seo.description} /><link rel="canonical" href={canonical} /><meta name="robots" content={preview ? "noindex, nofollow" : "index, follow"} /></Head>
    <StationLegacyHero station={station} />
    <Navigation station={station} active={section} preview={preview} />
    <main id="station-conditions" className="v2-page"><Breadcrumbs station={station} section={section} preview={preview} />{section !== "apercu" ? <h1 className="v2-section-title">{h1}</h1> : null}{section === "apercu" ? <Overview station={station} widgets={widgets} preview={preview} /> : <Detail station={station} widgets={widgets} section={section} />}<nav className="v2-related" aria-label="Autres informations sur la station"><Link href={preview ? previewSectionHref(station.slug, "apercu") : sectionHref(station.slug, "apercu")}>Retour à l’aperçu de {station.name}</Link>{publishedV2Sections(station, widgets).filter((item) => item !== section).map((item) => <Link key={item} href={preview ? previewSectionHref(station.slug, item) : sectionHref(station.slug, item)}>{SECTION_LABELS[item]} de {station.name}</Link>)}</nav></main>
    <style jsx global>{`.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.v2-tabs>span{white-space:nowrap;padding:10px 15px;border-radius:9px;font-weight:700}.v2-tabs .is-disabled,.v2-cards .is-disabled{color:#6b7c89;background:#f1f4f6}.v2-hero{min-height:260px;background:#12314b center/cover;display:flex;align-items:flex-end;color:#fff;padding:42px max(20px,calc((100vw - 1180px)/2))}.v2-hero>div{max-width:900px}.v2-hero img{width:78px;height:78px;object-fit:contain;background:#fff;border-radius:14px;padding:7px}.v2-hero p{font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:12px 0 5px}.v2-hero h1{font-size:clamp(2rem,5vw,3.8rem);line-height:1.02;margin:0 0 8px}.v2-tabs{position:sticky;top:0;z-index:12;display:flex;overflow-x:auto;gap:4px;padding:9px max(16px,calc((100vw - 1180px)/2));background:#fff;border-bottom:1px solid #dbe4ec}.v2-tabs a{white-space:nowrap;padding:10px 15px;border-radius:9px;color:#24445d;text-decoration:none;font-weight:700}.v2-tabs a[aria-current=page]{background:#0b6c9e;color:#fff}.v2-page{max-width:1180px;margin:auto;padding:22px 20px 60px;color:#132b3e}.v2-breadcrumb{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;font-size:14px}.v2-breadcrumb span{display:flex;gap:8px}.v2-editorial{font-size:1.08rem;line-height:1.75;max-width:850px}.v2-stats,.v2-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}.v2-stats div,.v2-cards article,.v2-callout{border:1px solid #d9e3eb;border-radius:14px;background:#fff;padding:18px}.v2-stats strong{display:block;font-size:1.55rem}.v2-stats span{color:#536b7d}.v2-cards h3,.v2-cards h2{margin-top:0}.v2-cards iframe{border:0;width:100%;min-height:260px}.v2-cards img{max-width:100%;height:auto}.v2-map img{display:block;max-width:100%;max-height:75vh;margin:auto}.v2-table{overflow-x:auto}.v2-related{display:flex;flex-wrap:wrap;gap:12px;border-top:1px solid #d9e3eb;margin-top:36px;padding-top:22px}.v2-related a{font-weight:700}.v2-weather{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}.v2-updated{color:#536b7d}@media(max-width:600px){.v2-hero{min-height:200px;padding-block:25px}.v2-hero img{width:58px;height:58px}.v2-page{padding-inline:14px}.v2-cards,.v2-stats{grid-template-columns:1fr}}`}</style></>;
}
