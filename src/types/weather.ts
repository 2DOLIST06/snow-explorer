export type WeatherObservation = {
  temperature_c: number | null;
  humidity_percent: number | null;
  wind_direction_deg: number | null;
  wind_speed: number | null;
  wind_speed_unit: string | null;
  precipitation: number | null;
  precipitation_unit: string | null;
  precipitation_period_minutes: number | null;
  snow_depth_cm: number | null;
  ground_state: string | number | null;
  validity_time: string | null;
  reference_time: string | null;
  insert_time: string | null;
  age_minutes: number | null;
  fresh: boolean;
};

export type WeatherSource = {
  provider: string;
  station_id: string | null;
  station_name: string | null;
  station_altitude_m: number | null;
  distance_km: number | null;
  is_manual_override: boolean;
  endpoint: string | null;
  cache_fallback: boolean;
};

export type StationWeatherResponse = {
  station: { name: string; slug: string };
  status: 'available' | 'stale' | 'unavailable';
  observation: WeatherObservation | null;
  source: WeatherSource | null;
};

export type WeatherForecastDay = {
  date: string;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  snowfallCm: number | null;
  precipitation: number | null;
  precipitationUnit: string | null;
  weatherCode: number | null;
};
