import type { StationWidgetsConfig } from "@/types/station";
import type { SkiPassSeason } from "@/types/skiPass";

export function normalizeLegacyStationForfaits(
  forfaits?: Partial<StationWidgetsConfig["forfaits"]> | null,
): StationWidgetsConfig["forfaits"] {
  return {
    enabled: Boolean(forfaits?.enabled),
    ...forfaits,
    columns: forfaits?.columns || [],
    items: forfaits?.items || [],
    periods: forfaits?.periods || (
      typeof forfaits?.season === "object"
        ? forfaits.season?.periods || forfaits.season?.pricing_periods
        : undefined
    ) || [],
  };
}

export function normalizeStationSkiPass(
  skiPass?: SkiPassSeason | null,
): StationWidgetsConfig["normalizedForfaits"] | undefined {
  if (skiPass?.is_active !== true) return undefined;

  const periods = [...(skiPass.periods || [])]
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((period) => ({
      ...period,
      passes: (skiPass.passes || []).map((pass) => ({
        ...pass,
        prices: (pass.prices || []).filter(
          (price) => String(price.period_id) === String(period.id),
        ),
      })),
    }));

  return {
    enabled: true,
    columns: [],
    items: [],
    periods: periods as NonNullable<StationWidgetsConfig["normalizedForfaits"]>["periods"],
    season: skiPass.season,
    source_url: skiPass.source_url || null,
  };
}
