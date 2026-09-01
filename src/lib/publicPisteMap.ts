export type PublicPisteMap = {
  enabled?: boolean;
  smallMapUrl?: string | null;
  largeMapUrl?: string | null;
  officialMapUrl?: string | null;
  caption?: string | null;
};

function first(object: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (object[key] !== undefined && object[key] !== null && object[key] !== "") return object[key];
  }
  return null;
}

function firstAcross(objects: Record<string, unknown>[], keys: string[]): unknown {
  for (const object of objects) {
    const value = first(object, keys);
    if (value !== null) return value;
  }
  return null;
}

function safeMapUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Normalise both current widgets and every map spelling historically returned by the API. */
export function getPistes(payload: unknown): PublicPisteMap {
  const source = (payload && typeof payload === "object" ? payload : {}) as Record<string, any>;
  const nested = source.pistes || source.widgets?.pistes;
  const pistes = (nested && typeof nested === "object" ? nested : {}) as Record<string, unknown>;
  const sources = [pistes, source];
  const genericMap = firstAcross(sources, ["pistes_map_url", "piste_map_url"]);
  const caption = firstAcross(sources, ["caption", "pistes_map_caption", "piste_map_caption", "pistes_caption"]);

  return {
    enabled: pistes.enabled !== false,
    smallMapUrl: safeMapUrl(firstAcross(sources, ["smallMapUrl", "small_map_url", "pistes_small_map_url", "piste_small_map_url"])),
    largeMapUrl: safeMapUrl(firstAcross(sources, ["largeMapUrl", "large_map_url", "pistes_large_map_url", "piste_large_map_url"]) || genericMap),
    officialMapUrl: safeMapUrl(firstAcross(sources, ["officialMapUrl", "official_map_url", "pistes_official_map_url", "piste_official_map_url"])),
    caption: typeof caption === "string" ? caption : null,
  };
}

/**
 * Null means the directory has no usable plan and requires the legacy endpoint.
 *
 * The directory currently serialises projection columns even when they are null.
 * Field presence therefore cannot prove that a station has been migrated (nor that
 * it deliberately has no map). Once the API exposes an explicit migration marker,
 * that marker can be handled here without treating nullable columns as one.
 */
export function getDirectoryPistes(resort: unknown): PublicPisteMap | null {
  if (!resort || typeof resort !== "object") return null;
  const pistes = getPistes(resort);
  return pistes.smallMapUrl || pistes.largeMapUrl || pistes.officialMapUrl ? pistes : null;
}
