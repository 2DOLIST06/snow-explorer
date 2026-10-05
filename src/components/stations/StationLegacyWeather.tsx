import React, { useEffect, useState } from "react";

type HeadingLevel = "h2" | "h3";

const Card: React.FC<React.PropsWithChildren<{ title?: string; headingLevel?: HeadingLevel }>> = ({ title, headingLevel = "h2", children }) => {
  const Heading = headingLevel;
  return (
  <section style={{ border: "1px solid #cbd5e1", borderRadius: 12, background: "#fff", padding: 12 }}>
    {title ? <Heading style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#111827" }}>{title}</Heading> : null}
    <div>{children}</div>
  </section>
  );
};

const getWeatherIcon = (code: number | null | undefined) => {
  const c = typeof code === "number" ? code : 0;

  if (c === 0) {
    return { symbol: "☀️", label: "Ensoleillé", bg: "#fef3c7" };
  }
  if ([1, 2].includes(c)) {
    return { symbol: "🌤️", label: "Peu nuageux", bg: "#e0f2fe" };
  }
  if (c === 3) {
    return { symbol: "☁️", label: "Couvert", bg: "#cbd5e1" };
  }
  if ([45, 48].includes(c)) {
    return { symbol: "🌫️", label: "Brouillard", bg: "#cbd5e1" };
  }
  if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(c)) {
    return { symbol: "🌧️", label: "Pluie", bg: "#dbeafe" };
  }
  if ([71, 73, 75, 77, 85, 86].includes(c)) {
    return { symbol: "❄️", label: "Neige", bg: "#e0f2fe" };
  }
  if ([95, 96, 99].includes(c)) {
    return { symbol: "⛈️", label: "Orages", bg: "#fee2e2" };
  }
  return { symbol: "🌡️", label: "Météo", bg: "#f3f4f6" };
};

/* =========================
 * Météo Open-Meteo
 * =======================*/
type OpenMeteoDaily = {
  date: string;
  temp_min: number;
  temp_max: number;
  snow_cm: number;
  code: number;
};

export const MeteoblueSkiWidget: React.FC<{ lat?: number | null; lon?: number | null; height?: number; headingLevel?: HeadingLevel }> = ({
  lat,
  lon,
  headingLevel = "h2",
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [current, setCurrent] = useState<{ temp: number; wind_kmh: number; code: number | null } | null>(null);
  const [forecast, setForecast] = useState<OpenMeteoDaily[]>([]);

  const usedLat = Number(lat);
  const usedLon = Number(lon);

  useEffect(() => {
    if (!Number.isFinite(usedLat) || !Number.isFinite(usedLon)) {
      setErr("Coordonnées indisponibles.");
      setLoading(false);
      setCurrent(null);
      setForecast([]);
      return;
    }

    let aborted = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const params = new URLSearchParams({
          latitude: String(usedLat),
          longitude: String(usedLon),
          current_weather: "true",
          daily: "temperature_2m_max,temperature_2m_min,snowfall_sum,weathercode",
          timezone: "auto",
        });

        const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();

        if (aborted) return;

        const cw = j.current_weather || {};
        const dailyTimes: string[] = j.daily?.time || [];
        const tmin: number[] = j.daily?.temperature_2m_min || [];
        const tmax: number[] = j.daily?.temperature_2m_max || [];
        const snow: number[] = j.daily?.snowfall_sum || [];
        const codes: number[] = j.daily?.weathercode || [];

        const mappedForecast: OpenMeteoDaily[] = dailyTimes.map((d, idx) => ({
          date: d,
          temp_min: typeof tmin[idx] === "number" ? Math.round(tmin[idx]) : NaN,
          temp_max: typeof tmax[idx] === "number" ? Math.round(tmax[idx]) : NaN,
          snow_cm: typeof snow[idx] === "number" ? Math.round(snow[idx]) : 0,
          code: typeof codes[idx] === "number" ? codes[idx] : 0,
        }));

        setCurrent({
          temp: typeof cw.temperature === "number" ? Math.round(cw.temperature) : NaN,
          wind_kmh: typeof cw.windspeed === "number" ? Math.round(cw.windspeed) : 0,
          code: typeof cw.weathercode === "number" ? cw.weathercode : null,
        });
        setForecast(mappedForecast.slice(0, 4));
      } catch (e: any) {
        if (!aborted) setErr(e?.message || "Erreur météo");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [usedLat, usedLon]);

  if (!Number.isFinite(usedLat) || !Number.isFinite(usedLon)) {
    return (
      <Card title="Météo & neige" headingLevel={headingLevel}>
        <div style={{ fontSize: 13, color: "#4b5563" }}>Coordonnées indisponibles.</div>
      </Card>
    );
  }

  const currentIcon = getWeatherIcon(current?.code ?? null);

  return (
    <Card title="Météo & neige" headingLevel={headingLevel}>
      {loading && <div style={{ fontSize: 13, color: "#4b5563" }}>Chargement…</div>}
      {err && !loading && <div style={{ fontSize: 13, color: "#dc2626" }}>Erreur : {err}</div>}

      {!loading && !err && current && (
        <>
          {/* Bloc maintenant */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
              padding: 10,
              borderRadius: 12,
              background: currentIcon.bg,
            }}
          >
            <div>
              <div style={{ fontSize: 12, textTransform: "uppercase", color: "#4b5563" }}>Maintenant</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <div style={{ fontSize: 30, fontWeight: 800 }}>
                  {Number.isFinite(current.temp) ? `${current.temp}°C` : "—"}
                </div>
                <div style={{ fontSize: 22 }}>{currentIcon.symbol}</div>
              </div>
              <div style={{ fontSize: 13, color: "#374151" }}>
                {currentIcon.label} • vent {current.wind_kmh} km/h
              </div>
            </div>
          </div>

          {/* Prévisions neige + icônes */}
          {forecast.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  color: "#4b5563",
                  marginBottom: 6,
                }}
              >
                Prochains jours
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {forecast.map((d) => {
                  const icon = getWeatherIcon(d.code);
                  return (
                    <div
                      key={d.date}
                      style={{
                        borderRadius: 12,
                        border: "1px solid #cbd5e1",
                        padding: 8,
                        background: "#f3f6fa",
                        fontSize: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: 600 }}>
                          {new Date(d.date).toLocaleDateString("fr-FR", {
                            weekday: "short",
                            day: "2-digit",
                            month: "short",
                          })}
                        </div>
                        <div style={{ fontSize: 18 }}>{icon.symbol}</div>
                      </div>
                      <div style={{ color: "#4b5563" }}>
                        {Number.isFinite(d.temp_min) ? `${d.temp_min}°` : "—"} /{" "}
                        {Number.isFinite(d.temp_max) ? `${d.temp_max}°` : "—"}
                      </div>
                      <div
                        style={{
                          marginTop: 2,
                          padding: "3px 6px",
                          borderRadius: 9999,
                          background: d.snow_cm > 0 ? "#e0f2fe" : "#f3f4f6",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          alignSelf: "flex-start",
                        }}
                      >
                        <span style={{ fontSize: 13 }}>❄️</span>
                        <span style={{ fontSize: 12 }}>
                          {d.snow_cm > 0 ? `${d.snow_cm} cm de neige` : "Pas de neige prévue"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: 11, color: "#4b5563" }}>Source : Open-Meteo</div>
        </>
      )}
    </Card>
  );
};
