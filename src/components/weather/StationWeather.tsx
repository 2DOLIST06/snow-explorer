import { stationNameAt } from "@/lib/stationName";
import React, { useCallback } from 'react';
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, Thermometer } from 'lucide-react';
import { parseCoordinate } from '@/lib/stationAutomaticData';
import { fetchStationWeather, fetchWeatherForecast } from '@/lib/api/weather';
import type { StationWeatherResponse, WeatherForecastDay } from '@/types/weather';
import { useWeatherResource, type WeatherResource } from './useWeatherResource';
import styles from './StationWeather.module.css';

type HeadingLevel = 'h2' | 'h3';
export type StationWeatherProps = {
  slug: string;
  name: string;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  headingLevel?: HeadingLevel;
};

export function weatherValue(value: number | null | undefined, unit: string): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${unit}` : 'Non disponible';
}
export function observationDate(value: string | null | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Non disponible';
  return new Date(value).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Skeleton({ label }: { label: string }) {
  return <div role="status"><span className={styles.srOnly}>{label}</span><div className="skeleton-panel" aria-hidden="true"><div /><div /></div></div>;
}

function WeatherIcon({ code }: { code: number | null }) {
  let Icon = Thermometer;
  let label = 'Prévision indisponible';
  if (code === 0) { Icon = Sun; label = 'Ensoleillé'; }
  else if (code === 1 || code === 2) { Icon = CloudSun; label = 'Peu nuageux'; }
  else if (code === 3) { Icon = Cloud; label = 'Couvert'; }
  else if (code === 45 || code === 48) { Icon = CloudFog; label = 'Brouillard'; }
  else if (code !== null && [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) { Icon = CloudRain; label = 'Pluie'; }
  else if (code !== null && [71, 73, 75, 77, 85, 86].includes(code)) { Icon = CloudSnow; label = 'Neige'; }
  else if (code !== null && [95, 96, 99].includes(code)) { Icon = CloudLightning; label = 'Orages'; }
  return <span className={styles.weatherIcon}><Icon size={26} aria-hidden="true" /><span>{label}</span></span>;
}

export function ObservedConditions({ resource, headingLevel = 'h3' }: { resource: WeatherResource<StationWeatherResponse>; headingLevel?: HeadingLevel }) {
  const Heading = headingLevel;
  const SnowHeading = headingLevel === 'h2' ? 'h3' : 'h4';
  const data = resource.data;
  const observation = data?.status !== 'unavailable' ? data?.observation : null;
  const source = data?.source;
  return <section className={styles.panel} aria-live="polite" aria-busy={resource.loading}>
    <div className={styles.heading}><Heading>Conditions observées</Heading><span className="badge">Météo-France</span></div>
    {resource.loading ? <Skeleton label="Chargement des observations météo…" /> : resource.error ? <p className="notice">Observations temporairement indisponibles.</p> : !observation ? <p className="notice">Les observations Météo-France sont temporairement indisponibles.</p> : <>
      {data?.status === 'stale' && <p className="notice notice--warning"><strong>Relevé ancien</strong><span>{observationDate(observation.validity_time)} (heure de Paris)</span></p>}
      <dl className={styles.indicators}>
        <div className={styles.temperature}><dt>Température</dt><dd>{weatherValue(observation.temperature_c, '°C')}</dd></div>
        {observation.humidity_percent != null && <div><dt>Humidité</dt><dd>{weatherValue(observation.humidity_percent, '%')}</dd></div>}
        {observation.wind_direction_deg != null && <div><dt>Direction du vent</dt><dd>{weatherValue(observation.wind_direction_deg, '°')}</dd></div>}
        {observation.wind_speed != null && observation.wind_speed_unit?.trim() && <div><dt>Vitesse du vent</dt><dd>{weatherValue(observation.wind_speed, observation.wind_speed_unit)}</dd></div>}
        {observation.precipitation != null && observation.precipitation_unit?.trim() && <div><dt>Précipitations observées{observation.precipitation_period_minutes != null ? ` sur ${observation.precipitation_period_minutes} min` : ''}</dt><dd>{weatherValue(observation.precipitation, observation.precipitation_unit)}</dd></div>}
      </dl>
      <section className={styles.snow}>
        <SnowHeading>Enneigement observé</SnowHeading>
        <dl><div><dt>Hauteur de neige au poste</dt><dd>{weatherValue(observation.snow_depth_cm, 'cm')}</dd></div></dl>
        <p>Cette mesure correspond au poste Météo-France, à son altitude.</p>
      </section>
      <dl className={styles.metadata}>
        <div><dt>Poste</dt><dd>{source?.station_name || 'Non disponible'}</dd></div>
        <div><dt>Altitude du poste</dt><dd>{weatherValue(source?.station_altitude_m, 'm')}</dd></div>
        <div><dt>Distance de la station</dt><dd>{weatherValue(source?.distance_km, 'km')}</dd></div>
        <div><dt>Relevé</dt><dd>{observation.validity_time && Number.isFinite(Date.parse(observation.validity_time)) ? <time dateTime={observation.validity_time}>{observationDate(observation.validity_time)} (heure de Paris)</time> : 'Non disponible'}</dd></div>
      </dl>
    </>}
    <p className={styles.attribution}>Source : Météo-France</p>
  </section>;
}

export function ForecastConditions({ resource, headingLevel = 'h3' }: { resource: WeatherResource<WeatherForecastDay[]>; headingLevel?: HeadingLevel }) {
  const Heading = headingLevel;
  return <section className={styles.panel} aria-live="polite" aria-busy={resource.loading}>
    <div className={styles.heading}><Heading>Prévisions</Heading><span className="badge">Open-Meteo</span></div>
    {resource.loading ? <Skeleton label="Chargement des prévisions météo…" /> : resource.error || !resource.data?.length ? <p className="notice">Prévisions temporairement indisponibles.</p> : <>
      <p className={styles.description}>Aujourd’hui et les prochains jours. La neige prévue correspond aux chutes attendues dans la journée.</p>
      <div className={styles.forecasts} tabIndex={0} role="region" aria-label="Prévisions journalières, défilement horizontal">
        {resource.data.map((day) => <article className={styles.forecast} key={day.date}>
          <time dateTime={day.date}>{new Date(`${day.date}T12:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })}</time>
          <WeatherIcon code={day.weatherCode} />
          <dl>
            <div><dt>Température min.</dt><dd>{weatherValue(day.temperatureMinC, '°C')}</dd></div>
            <div><dt>Température max.</dt><dd>{weatherValue(day.temperatureMaxC, '°C')}</dd></div>
            <div className={styles.forecastSnow}><dt>Neige prévue</dt><dd>{weatherValue(day.snowfallCm, 'cm')}</dd></div>
            {day.precipitationUnit && <div><dt>Précipitations</dt><dd>{weatherValue(day.precipitation, day.precipitationUnit)}</dd></div>}
          </dl>
        </article>)}
      </div>
    </>}
    <p className={styles.attribution}>Source : Open-Meteo</p>
  </section>;
}

export function useStationWeatherResources({ slug, latitude, longitude }: StationWeatherProps) {
  const lat = parseCoordinate(latitude, 90);
  const lon = parseCoordinate(longitude, 180);
  const loadObservations = useCallback((signal: AbortSignal) => fetchStationWeather(slug, signal), [slug]);
  const loadForecast = useCallback((signal: AbortSignal) => lat === null || lon === null ? Promise.reject(new Error('Missing coordinates')) : fetchWeatherForecast(lat, lon, signal), [lat, lon]);
  const observations = useWeatherResource(loadObservations);
  const forecasts = useWeatherResource(loadForecast);
  return { observations, forecasts };
}

function StationWeatherContent({ name, headingLevel = 'h3', ...props }: StationWeatherProps) {
  const { observations, forecasts } = useStationWeatherResources({ name, ...props });
  return <div className={styles.weather} aria-label={`Météo ${stationNameAt(name)}`}>
    <ObservedConditions resource={observations} headingLevel={headingLevel} />
    <ForecastConditions resource={forecasts} headingLevel={headingLevel} />
  </div>;
}

export default function StationWeather(props: StationWeatherProps) {
  // Remount before painting a different station, so old values never flash.
  return <StationWeatherContent key={JSON.stringify([props.slug, props.latitude, props.longitude])} {...props} />;
}
