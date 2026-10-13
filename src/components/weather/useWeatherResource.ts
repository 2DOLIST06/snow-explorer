import { useEffect, useState } from 'react';

export type WeatherResource<T> = { loading: boolean; data: T | null; error: boolean };

/** Each source owns its request and ignores late results, even if abort is ignored. */
export function useWeatherResource<T>(load: (signal: AbortSignal) => Promise<T>): WeatherResource<T> {
  const [state, setState] = useState<WeatherResource<T>>({ loading: true, data: null, error: false });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ loading: true, data: null, error: false });
    load(controller.signal).then(
      (data) => { if (active) setState({ loading: false, data, error: false }); },
      () => { if (active) setState({ loading: false, data: null, error: true }); },
    );
    return () => { active = false; controller.abort(); };
  }, [load]);
  return state;
}
