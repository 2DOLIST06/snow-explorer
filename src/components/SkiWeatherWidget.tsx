import React, { useEffect, useState } from "react";

type Day = { date: string; tmin: number | null; tmax: number | null; weathercode: number | null; snowfall_cm: number | null; snow_depth_cm: number | null; precip_mm: number | null };
type Payload = { updatedAt: string; current: { temperature: number | null; windspeed: number | null; winddirection: number | null; weathercode: number | null }; today: Day & { date: string | null }; nextDays: Day[] };
type Props = { name: string; lat: number; lon: number; className?: string };

function wmoToLabel(code: number | null): string {
  const map: Record<number, string> = {0:"Ciel dégagé",1:"Peu nuageux",2:"Variable",3:"Couvert",45:"Brouillard",48:"Brouillard givrant",51:"Bruine légère",53:"Bruine",55:"Bruine forte",61:"Pluie faible",63:"Pluie",65:"Pluie forte",66:"Pluie verglaçante",67:"Pluie verglaçante forte",71:"Neige faible",73:"Neige",75:"Neige forte",77:"Grains de neige",80:"Averses faibles",81:"Averses",82:"Averses fortes",85:"Averses de neige",86:"Averses de neige fortes",95:"Orages",96:"Orages + grêle",99:"Orages violents + grêle"};
  return code == null ? "-" : (map[code] || `Code ${code}`);
}

function WeatherIcon({ code, size = 28 }: { code: number | null; size?: number }) {
  const common = { width: size, height: size };
  if (code != null && [0, 1].includes(code)) return <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="4" strokeWidth="1.5"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" strokeWidth="1.5"/></svg>;
  if (code != null && [51,53,55,61,63,65,66,67,80,81,82,95,96,99].includes(code)) return <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M7 16h9a5 5 0 0 0 0-10 7 7 0 0 0-13 2 4 4 0 0 0 4 8Z" strokeWidth="1.5"/><path d="M8 20v3M12 20v3M16 20v3" strokeWidth="1.5"/></svg>;
  if (code != null && [71,73,75,77,85,86].includes(code)) return <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v20M4 7l16 10M20 7 4 17" strokeWidth="1.5" strokeLinecap="round"/></svg>;
  return <svg {...common} viewBox="0 0 24 24" fill="currentColor"><path d="M7 19h9a5 5 0 0 0 0-10 7 7 0 0 0-13 2 4 4 0 0 0 4 8Z"/></svg>;
}

function Badge({ children }: { children: React.ReactNode }) { return <span className="badge">{children}</span>; }
function Bar({ value, unit, max = 50 }: { value: number | null; unit: string; max?: number }) { const v = value ?? 0; const pct = Math.max(0, Math.min(100, (v / max) * 100)); return <div style={{ marginTop: 8 }}><div style={{ height: 7, borderRadius: 999, background: "#e8eef5" }}><div style={{ height: 7, width: `${pct}%`, borderRadius: 999, background: "#0ea5b7" }} /></div><div style={{ marginTop: 4, fontSize: 12, color: "#617186" }}>{v} {unit}</div></div>; }

export default function SkiWeatherWidget({ name, lat, lon, className }: Props) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true); setErr(null);
      try {
        let usedLat = lat; let usedLon = lon;
        if (!usedLat || !usedLon) {
          const g = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}`);
          const gdata = await g.json();
          if (gdata.length > 0) { usedLat = parseFloat(gdata[0].lat); usedLon = parseFloat(gdata[0].lon); }
        }
        const r = await fetch(`/api/ski-weather?lat=${usedLat}&lon=${usedLon}`, { headers: { accept: "application/json" } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setData(await r.json());
      } catch (e: any) { setErr(e?.message || "Erreur"); }
      finally { setLoading(false); }
    };
    run();
  }, [lat, lon, name]);

  const forecast = data?.nextDays || [];
  return <section className={`weather-widget ${className || ""}`} aria-live="polite">
    <div className="weather-widget__head"><div><p className="eyebrow">Bulletin station</p><h3><WeatherIcon code={data?.current?.weathercode ?? null} /> Météo {name}</h3></div><div className="weather-meta">{data?.today?.date ? <Badge>{new Date(data.today.date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })}</Badge> : null}{data?.updatedAt ? <span>Maj {new Date(data.updatedAt).toLocaleString("fr-FR")}</span> : null}</div></div>
    {loading && <div className="skeleton-panel"><div /><div /><div /></div>}
    {err && !loading && <div className="notice notice--danger"><strong>Données temporairement indisponibles</strong><span>Erreur : {err}. Réessayez dans quelques instants.</span></div>}
    {!loading && !err && data && <><div className="weather-hero-card"><div className="weather-hero-card__main"><span className="weather-icon-lg"><WeatherIcon code={data.current.weathercode ?? null} size={54} /></span><div><p>{wmoToLabel(data.current.weathercode)}</p><strong>{data.current.temperature != null ? `${Math.round(data.current.temperature)}°C` : "-"}</strong><span>Ressenti proche de la température mesurée</span></div></div><dl className="weather-kpis"><div><dt>Min / max</dt><dd>{data.today.tmin != null ? Math.round(data.today.tmin) : "-"}° / {data.today.tmax != null ? Math.round(data.today.tmax) : "-"}°</dd></div><div><dt>Vent</dt><dd>{data.current.windspeed != null ? `${Math.round(data.current.windspeed)} km/h` : "-"}</dd></div><div><dt>Neige fraîche</dt><dd>{data.today.snowfall_cm != null ? `${data.today.snowfall_cm} cm` : "-"}</dd></div><div><dt>Neige au sol</dt><dd>{data.today.snow_depth_cm != null ? `${data.today.snow_depth_cm} cm` : "-"}</dd></div></dl></div><div className="altitude-strip" aria-label="Comparaison par altitude">{["Bas station", "Milieu domaine", "Sommet"].map((label, index) => <div key={label}><span>{label}</span><strong>{data.current.temperature != null ? `${Math.round(data.current.temperature - index * 3)}°C` : "-"}</strong><small>{index === 0 ? "Accès" : index === 1 ? "Pistes" : "Altitude"}</small></div>)}</div><section className="forecast-section"><div className="section-heading"><div><p className="eyebrow">Prochains jours</p><h4>Prévisions neige et températures</h4></div><span>Défilement horizontal sur mobile</span></div><div className="daily-forecast">{forecast.slice(0, 7).map((d) => <article key={d.date} className="forecast-card"><div><strong>{new Date(d.date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit" })}</strong><WeatherIcon code={d.weathercode ?? null} size={24} /></div><p>{wmoToLabel(d.weathercode)}</p><dl><div><dt>Temp.</dt><dd>{d.tmin != null ? Math.round(d.tmin) : "-"}° / {d.tmax != null ? Math.round(d.tmax) : "-"}°</dd></div><div><dt>Neige</dt><dd>{d.snowfall_cm != null ? `${d.snowfall_cm} cm` : "-"}</dd></div><div><dt>Pluie</dt><dd>{d.precip_mm != null ? `${d.precip_mm} mm` : "-"}</dd></div></dl><Bar value={d.snowfall_cm} unit="cm" max={30} /></article>)}</div></section></>}
  </section>;
}
