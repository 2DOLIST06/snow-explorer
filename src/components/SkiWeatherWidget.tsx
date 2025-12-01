// src/components/SkiWeatherWidget.tsx
import React, { useEffect, useState } from "react";

type Day = {
  date: string;
  tmin: number | null;
  tmax: number | null;
  weathercode: number | null;   // + icône météo (WMO)
  snowfall_cm: number | null;
  snow_depth_cm: number | null;
  precip_mm: number | null;
};

type Payload = {
  updatedAt: string;
  current: {
    temperature: number | null;
    windspeed: number | null;
    winddirection: number | null;
    weathercode: number | null;
  };
  today: Day & { date: string | null };
  nextDays: Day[];
};

type Props = {
  name: string;
  lat: number;    // peut être NaN → fallback par nom
  lon: number;    // peut être NaN → fallback par nom
  className?: string;
};

function wmoToLabel(code: number | null): string {
  const map: Record<number, string> = {
    0: "Ciel dégagé", 1: "Peu nuageux", 2: "Variable", 3: "Couvert",
    45: "Brouillard", 48: "Brouillard givrant",
    51: "Bruine légère", 53: "Bruine", 55: "Bruine forte",
    61: "Pluie faible", 63: "Pluie", 65: "Pluie forte",
    66: "Pluie verglaçante", 67: "Pluie verglaçante forte",
    71: "Neige faible", 73: "Neige", 75: "Neige forte",
    77: "Grains de neige", 80: "Averses faibles", 81: "Averses", 82: "Averses fortes",
    85: "Averses de neige", 86: "Averses de neige fortes",
    95: "Orages", 96: "Orages + grêle", 99: "Orages violents + grêle",
  };
  return code == null ? "-" : (map[code] || `Code ${code}`);
}

function WeatherIcon({ code, size=28 }: { code: number | null; size?: number }) {
  const common = { width: size, height: size };
  const sun = (
    <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="4" strokeWidth="1.5" />
      <g strokeWidth="1.5">
        <line x1="12" y1="1" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="23" />
        <line x1="1" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="23" y2="12" />
        <line x1="4.2" y1="4.2" x2="6.3" y2="6.3" /><line x1="17.7" y1="17.7" x2="19.8" y2="19.8" />
        <line x1="4.2" y1="19.8" x2="6.3" y2="17.7" /><line x1="17.7" y1="6.3" x2="19.8" y2="4.2" />
      </g>
    </svg>
  );
  const cloud = (
    <svg {...common} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 19h9a5 5 0 0 0 0-10 7 7 0 0 0-13 2 4 4 0 0 0 4 8Z" />
    </svg>
  );
  const rain = (
    <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M7 16h9a5 5 0 0 0 0-10 7 7 0 0 0-13 2 4 4 0 0 0 4 8Z" strokeWidth="1.5"/>
      <g strokeWidth="1.5"><line x1="8" y1="20" x2="8" y2="23"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="16" y1="20" x2="16" y2="23"/></g>
    </svg>
  );
  const snow = (
    <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <g strokeWidth="1.5" strokeLinecap="round">
        <line x1="12" y1="2" x2="12" y2="22"/><line x1="4" y1="7" x2="20" y2="17"/><line x1="20" y1="7" x2="4" y2="17"/>
      </g>
    </svg>
  );
  if (code == null) return cloud;
  if ([0,1].includes(code)) return sun;
  if ([2,3,45,48].includes(code)) return cloud;
  if ([51,53,55,61,63,65,66,67,80,81,82,95,96,99].includes(code)) return rain;
  if ([71,73,75,77,85,86].includes(code)) return snow;
  return cloud;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", border:"1px solid #e5e7eb",
      borderRadius:999, padding:"2px 8px", fontSize:12, color:"#374151", background:"#fff"
    }}>{children}</span>
  );
}

function Bar({ value, unit, max=50 }: { value: number | null; unit: string; max?: number }) {
  const v = value ?? 0;
  const pct = Math.max(0, Math.min(100, (v / max) * 100));
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 8, width: "100%", borderRadius: 6, background: "#f3f4f6" }}>
        <div style={{ height: 8, width: `${pct}%`, borderRadius: 6, background: "#3b82f6" }} />
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>{v} {unit}</div>
    </div>
  );
}

export default function SkiWeatherWidget({ name, lat, lon, className }: Props) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErr(null);
      try {
        let usedLat = lat;
        let usedLon = lon;

        if (!usedLat || !usedLon) {
          try {
            const g = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}`);
            const gdata = await g.json();
            if (gdata.length > 0) {
              usedLat = parseFloat(gdata[0].lat);
              usedLon = parseFloat(gdata[0].lon);
            }
          } catch {}
        }

        const url = `/api/ski-weather?lat=${usedLat}&lon=${usedLon}`;
        const r = await fetch(url, { headers: { accept: "application/json" } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j: Payload = await r.json();
        setData(j);
      } catch (e: any) {
        setErr(e?.message || "Erreur");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [lat, lon, name]);

  return (
    <div style={{
      width:"100%", maxWidth: "100%", border:"1px solid #e5e7eb", borderRadius: 16,
      padding: 16, background:"#fff", boxShadow:"0 1px 2px rgba(0,0,0,0.04)"
    }}>
      <div style={{ marginBottom: 12, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, display: "flex", alignItems:"center", gap: 8 }}>
          <WeatherIcon code={data?.current?.weathercode ?? null} />
          Météo {name}
        </h3>
        <div style={{ display:"flex", alignItems:"center", gap: 8 }}>
          {data?.today?.date ? <Badge>{new Date(data.today.date).toLocaleDateString()}</Badge> : null}
          {data?.updatedAt ? <span style={{ fontSize:12, color:"#6b7280" }}>Maj {new Date(data.updatedAt).toLocaleString()}</span> : null}
        </div>
      </div>

      {loading && <div>Chargement…</div>}
      {err && !loading && <div style={{ color:"#dc2626" }}>Erreur : {err}</div>}

      {!loading && !err && data && (
        <>
          {/* Météo complète sur une seule ligne */}
          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(5,1fr)",
            gap:12,
            alignItems:"stretch"
          }}>
            {/* Bloc actuel */}
            <div style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:12, background:"linear-gradient(180deg,#fff,#f9fafb)" }}>
              <div style={{ fontSize: 12, color:"#6b7280" }}>Actuel</div>
              <div style={{ marginTop: 4, display:"flex", alignItems:"flex-end", gap: 12 }}>
                <div style={{ fontSize: 32, fontWeight: 800 }}>
                  {data.current.temperature != null ? `${Math.round(data.current.temperature)}°C` : "-"}
                </div>
                <Badge>{wmoToLabel(data.current.weathercode)}</Badge>
              </div>
              <div style={{ marginTop: 8, fontSize: 14, color:"#4b5563" }}>
                Vent {data.current.windspeed != null ? `${Math.round(data.current.windspeed)} km/h` : "-"}
              </div>
            </div>

            {/* Bloc neige */}
            <div style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:12, background:"linear-gradient(180deg,#fff,#f9fafb)" }}>
              <div style={{ fontSize: 12, color:"#6b7280" }}>Neige (aujourd’hui)</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color:"#6b7280" }}>Fraîche</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>
                    {data.today.snowfall_cm != null ? `${data.today.snowfall_cm} cm` : "-"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color:"#6b7280" }}>Au sol</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>
                    {data.today.snow_depth_cm != null ? `${data.today.snow_depth_cm} cm` : "-"}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 14, color:"#4b5563" }}>
                Tmin / Tmax : {data.today.tmin != null ? Math.round(data.today.tmin) : "-"}° / {data.today.tmax != null ? Math.round(data.today.tmax) : "-"}°
              </div>
            </div>

            {/* 3 blocs prévisions */}
            {data.nextDays.slice(0,3).map((d) => (
              <div key={d.date} style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:12, background:"#fff" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {new Date(d.date).toLocaleDateString(undefined, { weekday: "short", day: "2-digit" })}
                  </div>
                  <WeatherIcon code={d.weathercode ?? null} size={22} />
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color:"#4b5563" }}>
                  {wmoToLabel(d.weathercode)}
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color:"#4b5563" }}>
                  Tmin / Tmax : {d.tmin != null ? Math.round(d.tmin) : "-"}° / {d.tmax != null ? Math.round(d.tmax) : "-"}°
                </div>
              </div>
            ))}
          </div>
                 
        </>
      )}
    </div>
  );
}
