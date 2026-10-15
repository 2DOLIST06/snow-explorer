import Head from "next/head";
import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, MapPin } from "lucide-react";
import type { Resort } from "@/lib/api/resorts";
import { matchesSearch, normalizeSearchText } from "@/lib/searchNormalization";
import { WebcamsAuto } from "@/components/stations/StationLegacyWebcams";

export type WebcamsDirectoryProps = { initialStations: Resort[]; station: Resort | null; unavailable?: boolean; seo?: { title: string; heading: string; description: string; introduction: string; canonical: string; content: React.ReactNode } };

export default function WebcamsDirectory({ initialStations, station, unavailable = false, seo }: WebcamsDirectoryProps) {
  const [query, setQuery] = useState("");
  const [mobilePickerOpen, setMobilePickerOpen] = useState(!station);
  const pickerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const filtered = useMemo(() => {
    const needle = normalizeSearchText(query);
    return initialStations.filter(item => !needle || matchesSearch(`${item.name} ${item.region?.name || ""} ${item.department?.name || ""}`, needle));
  }, [initialStations, query]);
  useEffect(() => {
    setMobilePickerOpen(!station);
    if (station && window.matchMedia("(max-width: 640px)").matches) {
      window.requestAnimationFrame(() => contentRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start",
      }));
    }
  }, [station?.slug]);
  function changeStation() {
    setMobilePickerOpen(true);
    window.requestAnimationFrame(() => pickerRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start",
    }));
  }
  const title = station ? `Webcams ${station.name}` : "Webcams des stations de ski";
  const canonical = `https://www.snow-explorer.com/webcams${station ? `/${encodeURIComponent(station.slug)}` : ""}`;
  return <>
    <Head>
      <title>{seo?.title ?? `${title} | Snow Explorer`}</title>
      <meta name="description" content={seo?.description ?? (station ? `Consultez les images des webcams identifiées pour ${station.name} sur Snow Explorer.` : "Recherchez une station de ski et consultez ses webcams disponibles sur Snow Explorer.")} />
      <link rel="canonical" href={seo?.canonical ?? canonical} />
      {(station || unavailable || !initialStations.length) && <meta name="robots" content="noindex,follow" />}
    </Head>
    <main className={`weather-page webcams-directory${seo ? " webcams-directory--seo" : ""}`}>
      <section className="weather-page__hero">
        <div><p className="eyebrow">En images</p><h1>{seo?.heading ?? title}</h1><p>{seo?.introduction ?? "Recherchez une station pour consulter ses webcams disponibles et agrandir les images."}</p></div>
      </section>
      <section className="weather-layout">
        <aside ref={pickerRef} className={`station-picker${station && !mobilePickerOpen ? " station-picker--collapsed" : ""}`} aria-label="Choisir une station">
          {station && <div className="station-picker__mobile-summary"><div className="station-picker__selected"><MapPin size={20} aria-hidden="true" /><div><span>Station sélectionnée</span><strong>{station.name}</strong></div></div><button type="button" onClick={changeStation} aria-expanded={mobilePickerOpen}><span>Changer</span><ChevronDown size={18} aria-hidden="true" /></button></div>}
          <div className="station-picker__controls">
            <div className="section-heading"><div><p className="eyebrow">Recherche</p><h2>Choisir une station</h2></div><span>{filtered.length} résultat(s)</span></div>
            <label className="field"><span>Station, région ou département</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nom, région, département…" type="search" /></label>
            <nav className="station-list" aria-label="Webcams par station">
              {filtered.map(item => <div className={station?.slug === item.slug ? "station-choice is-selected" : "station-choice"} key={item.id}>
                <Link href={`/webcams/${encodeURIComponent(item.slug)}`} prefetch={false} aria-current={station?.slug === item.slug ? "page" : undefined}><strong>{item.name}</strong><span>{item.region?.name || item.department?.name || "Station de ski"}</span></Link>
              </div>)}
              {!filtered.length && <div className="empty-state" role="status"><strong>{unavailable ? "Liste des stations indisponible" : "Aucune station trouvée"}</strong><span>{unavailable ? "Veuillez réessayer plus tard." : "Essayez un autre nom ou une région."}</span></div>}
            </nav>
          </div>
        </aside>
        <section ref={contentRef} className="weather-content" aria-label={station ? title : "Consulter les webcams"}>
          {station ? <>
            <div className="weather-content__station"><div><p className="eyebrow">Station sélectionnée</p><h2>{station.name}</h2></div><Link href={`/stations/${encodeURIComponent(station.slug)}`} className="btn btn--secondary">Voir la station de ski {station.name} <ArrowRight size={17} /></Link></div>
            <WebcamsAuto key={station.slug} name={station.name} lat={station.latitude} lon={station.longitude} headingLevel="h2" />
            <p><Link href="/webcams" className="btn btn--secondary">Retour à la liste des webcams</Link></p>
          </> : <div className="empty-state empty-state--hero"><strong>Choisissez une station</strong><span>Ouvrez une station dans la liste pour consulter ses webcams. Leur disponibilité est vérifiée à l’ouverture.</span></div>}
        </section>
      </section>
      {seo?.content}
    </main>
    <style jsx global>{`
      .webcams-directory--seo .weather-page__hero { grid-template-columns:minmax(0,1fr); margin-bottom:20px; }
      .webcams-directory--seo .weather-page__hero h1 { line-height:1.1; }
      .webcams-directory--seo .weather-page__hero p:not(.eyebrow) { max-width:80ch; }
      .webcams-directory .webcams-seo { max-width:75ch; margin:40px auto 0; line-height:1.7; overflow-wrap:break-word; }
      .webcams-directory .webcams-seo h2 { margin:32px 0 12px; color:var(--brand); line-height:1.3; }
      .webcams-directory .webcams-seo h3 { margin:24px 0 10px; color:var(--brand); line-height:1.3; }
      .webcams-directory .webcams-seo p { margin:0 0 16px; }
      .webcams-directory .webcams-seo a { color:var(--accent-2); text-decoration:underline; text-underline-offset:3px; }
      .webcams-directory .webcams-seo a:focus-visible { outline:3px solid var(--accent); outline-offset:3px; }
      .webcams-directory .station-choice a { display:block; border:1px solid var(--line); background:#fff; border-radius:14px; padding:12px; color:inherit; text-decoration:none; }
      .webcams-directory .station-choice a:hover, .webcams-directory .station-choice a[aria-current="page"] { border-color:var(--accent); background:#f0fbfd; }
      .webcams-directory .station-choice a:focus-visible { outline:3px solid var(--accent); outline-offset:2px; }
      .webcams-directory .weather-content__station .btn { white-space:normal; text-align:center; }
      .webcams-directory .weather-content > p { padding:12px; margin-top:16px; }
    `}</style>
  </>;
}
