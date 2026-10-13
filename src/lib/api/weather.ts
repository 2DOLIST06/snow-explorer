import type { StationWeatherResponse, WeatherForecastDay } from '@/types/weather';

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Same-origin frontend proxy uses the project's server backend configuration. */
export async function fetchStationWeather(slug: string, signal?: AbortSignal): Promise<StationWeatherResponse> {
  const response = await fetch(`/api/stations/${encodeURIComponent(slug)}/weather`, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Observations unavailable');
  const payload: unknown = await response.json();
  const data = record(payload);
  if (!['available', 'stale', 'unavailable'].includes(String(data.status))) throw new Error('Invalid observations');
  if (data.status !== 'unavailable' && (!data.observation || typeof data.observation !== 'object')) throw new Error('Missing observations');
  return payload as StationWeatherResponse;
}

/** Only daily forecasts: never request current conditions or modelled snow depth. */
export function normalizeForecast(payload: unknown): WeatherForecastDay[] {
  const data = record(payload);
  const daily = record(data.daily);
  const units = record(data.daily_units);
  const times = Array.isArray(daily.time) ? daily.time : [];
  const at = (field: string, index: number) => finite(Array.isArray(daily[field]) ? daily[field][index] : null);
  return times.flatMap((date: unknown, index: number): WeatherForecastDay[] => {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    return [{
      date,
      temperatureMinC: units.temperature_2m_min === '°C' ? at('temperature_2m_min', index) : null,
      temperatureMaxC: units.temperature_2m_max === '°C' ? at('temperature_2m_max', index) : null,
      snowfallCm: units.snowfall_sum === 'cm' ? at('snowfall_sum', index) : null,
      precipitation: typeof units.precipitation_sum === 'string' && units.precipitation_sum.trim() ? at('precipitation_sum', index) : null,
      precipitationUnit: typeof units.precipitation_sum === 'string' && units.precipitation_sum.trim() ? units.precipitation_sum : null,
      weatherCode: at('weather_code', index),
    }];
  }).slice(0, 7);
}

export async function fetchWeatherForecast(latitude: number, longitude: number, signal?: AbortSignal): Promise<WeatherForecastDay[]> {
  const params = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude),
    daily: 'temperature_2m_min,temperature_2m_max,snowfall_sum,precipitation_sum,weather_code',
    temperature_unit: 'celsius', precipitation_unit: 'mm', timezone: 'auto', forecast_days: '7', past_days: '0',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
  if (!response.ok) throw new Error('Forecast unavailable');
  const days = normalizeForecast(await response.json());
  if (!days.length) throw new Error('Forecast unavailable');
  return days;
}
