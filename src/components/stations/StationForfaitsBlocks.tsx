import type { StationWidgetsConfig } from "@/types/station";
import { getSkiPassBlocksVisibility } from "@/lib/skiPassVisibility";
import StationForfaitsBlock from "@/components/stations/StationForfaitsBlock";

export function hasStationForfaits(widgets: StationWidgetsConfig | null) {
  return getSkiPassBlocksVisibility(
    Boolean(widgets?.forfaits?.enabled),
    Boolean(widgets?.normalizedForfaits?.enabled),
  ).any;
}

/** The single renderer shared by the V1 station page and the V3 preview. */
export default function StationForfaitsBlocks({ widgets }: { widgets: StationWidgetsConfig | null }) {
  const visibility = getSkiPassBlocksVisibility(
    Boolean(widgets?.forfaits?.enabled),
    Boolean(widgets?.normalizedForfaits?.enabled),
  );

  if (!visibility.any) return null;
  return <>
    <StationForfaitsBlock
      enabled={visibility.legacy}
      columns={widgets?.forfaits?.columns || []}
      items={widgets?.forfaits?.items || []}
      periods={widgets?.forfaits?.periods || []}
      season={widgets?.forfaits?.season}
      source_url={widgets?.forfaits?.source_url}
      sourceUrl={widgets?.forfaits?.sourceUrl}
      stationPage
    />
    <StationForfaitsBlock
      enabled={visibility.normalized}
      periods={widgets?.normalizedForfaits?.periods || []}
      season={widgets?.normalizedForfaits?.season}
      source_url={widgets?.normalizedForfaits?.source_url}
      stationPage
    />
  </>;
}
