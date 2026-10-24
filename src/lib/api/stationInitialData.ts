import { getStationApiBase } from './stationPage';
import { fetchWeatherForecast } from './weather';
import { parseCoordinate } from '../stationAutomaticData';
import { mapWebcam, nearbyWebcams } from '../stationWebcams';
import type { StationWeatherResponse, WeatherForecastDay } from '@/types/weather';
import type { Webcam } from '@/components/stations/StationLegacyWebcams';

export type StationInitialData = {
  observations: StationWeatherResponse | null;
  forecasts: WeatherForecastDay[];
  webcams: Webcam[] | null;
};

// Short, bounded per-process cache. No secrets, disk persistence or stale fallback.
const cache = new Map<string, { expires: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();
async function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const running = pending.get(key);
  if (running) return running as Promise<T>;
  const request = load().then(value => {
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(key, { value, expires: Date.now() + ttl });
    return value;
  }).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

export async function loadStationInitialData(station: {
  slug: string; name: string; latitude?: number | null; longitude?: number | null;
}): Promise<StationInitialData> {
  const lat = parseCoordinate(station.latitude, 90);
  const lon = parseCoordinate(station.longitude, 180);
  const unavailable: StationWeatherResponse = {
    station: { slug: station.slug, name: station.name }, status: 'unavailable', observation: null, source: null,
  };
  // The backend already caches provider observations and recalculates their age.
  // Do not cache its freshness flag in the frontend server.
  const observations = (async () => {
    const response = await fetch(`${getStationApiBase()}/api/stations/${encodeURIComponent(station.slug)}/weather`, {
      headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) throw new Error('Observations unavailable');
    const data = await response.json() as StationWeatherResponse;
    if (!['available', 'stale', 'unavailable'].includes(data?.status) || data.station?.slug !== station.slug) throw new Error('Invalid observation');
    if (data.status !== 'unavailable' && (!data.observation?.validity_time || !Number.isFinite(Date.parse(data.observation.validity_time)))) throw new Error('Undated observation');
    return data;
  })().catch(() => unavailable);

  const forecasts = lat === null || lon === null ? Promise.resolve([]) :
    cached(`forecast:${lat}:${lon}`, 5 * 60_000, () => fetchWeatherForecast(lat, lon, AbortSignal.timeout(2500))).catch(() => []);

  const webcams = lat === null || lon === null || !process.env.WEBCAMS_API_KEY ? Promise.resolve(null) :
    cached(`webcams:${lat}:${lon}`, 60_000, async () => {
      const params = new URLSearchParams({ nearby: `${lat},${lon},30`, include: 'images,location,player,urls', lang: 'fr', limit: '50' });
      const response = await fetch(`https://api.windy.com/webcams/api/v3/webcams?${params}`, {
        headers: { 'X-WINDY-API-KEY': process.env.WEBCAMS_API_KEY!, accept: 'application/json' },
        cache: 'no-store', signal: AbortSignal.timeout(2500),
      });
      if (!response.ok) throw new Error('Webcams unavailable');
      const payload = await response.json();
      return nearbyWebcams((Array.isArray(payload.webcams) ? payload.webcams : []).map(mapWebcam), lat, lon).map((cam: Webcam) => ({
        id: cam.id, title: cam.title, preview: cam.preview, location: cam.location || '', capturedAt: cam.capturedAt,
        link: cam.link && /^https?:\/\//i.test(cam.link) ? cam.link : null,
      })) as Webcam[];
    }).catch(() => null);

  const [observationData, forecastData, webcamData] = await Promise.all([observations, forecasts, webcams]);
  return { observations: observationData, forecasts: forecastData, webcams: webcamData };
}
