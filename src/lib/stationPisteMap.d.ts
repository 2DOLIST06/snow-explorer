export type ResolvedStationPisteMap = {
  enabled: boolean;
  smallMapUrl: string | null;
  largeMapUrl: string | null;
  officialMapUrl: string | null;
  caption: string | null;
  hasPublishedImage: boolean;
};

export function nonEmptyString(value: unknown): string | null;
export function resolveStationPisteMap(
  station?: object,
  pistes?: object,
): ResolvedStationPisteMap;
