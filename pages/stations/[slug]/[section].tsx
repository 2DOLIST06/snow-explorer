import type { GetServerSideProps, NextPage } from "next";
import StationV2Page from "@/components/stations/StationV2Page";
import { fetchStationWidgetsConfig } from "@/lib/api/stations";
import { getStationApiBase, isResortInactive, loadStationPageSources, resolveResortRegion } from "@/lib/api/stationPage";
import { loadPublicSkiPasses } from "@/lib/publicSkiPasses";
import { normalizeLegacyStationForfaits, normalizeStationSkiPass } from "@/lib/stationForfaits";
import { isStationV2, STATION_V2_SECTIONS, type StationV2Section } from "@/lib/stationV2";
import type { StationWidgetsConfig } from "@/types/station";

type Props = { station: any; widgets: StationWidgetsConfig | null; section: StationV2Section };

const StationSectionPage: NextPage<Props> = ({ station, widgets, section }) => <StationV2Page station={station} widgets={widgets} section={section} />;

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, res }) => {
  const slug = String(params?.slug || "");
  const section = String(params?.section || "") as StationV2Section;
  if (!STATION_V2_SECTIONS.includes(section)) return { notFound: true };

  const apiBase = getStationApiBase();
  const { stationResponse, widgets: widgetsResult } = await loadStationPageSources(slug, {
    apiBase,
    loadWidgets: fetchStationWidgetsConfig,
  });
  if (stationResponse.status === 404) return { notFound: true };
  if (!stationResponse.ok) throw new Error(`[stations/[slug]/[section]] station API returned HTTP ${stationResponse.status}`);
  const raw = await stationResponse.json();
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || typeof raw.name !== "string" || typeof raw.slug !== "string" || isResortInactive(raw)) return { notFound: true };

  const station = resolveResortRegion(raw);
  let widgets = widgetsResult.config as StationWidgetsConfig | null;
  if (widgetsResult.error) widgets = null;

  if (section === "forfaits") {
    const payload = await loadPublicSkiPasses(
      async () => {
        const response = await fetch(`${apiBase}/api/stations/${encodeURIComponent(slug)}/ski-passes`, {
          headers: { accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`[stations/[slug]/forfaits] ski-passes API returned HTTP ${response.status}`);
        return response.json();
      },
      async () => {
        if (widgetsResult.error) throw widgetsResult.error;
        return { forfaits: widgetsResult.config?.forfaits || null };
      },
    );
    const forfaits = normalizeLegacyStationForfaits(payload.legacy_forfaits);
    const normalizedForfaits = normalizeStationSkiPass(payload.ski_pass);
    widgets = {
      ...(widgets || { stationSlug: slug, pistes: { enabled: false }, meteo: { enabled: false }, description: { enabled: false }, forfaits: { enabled: false, columns: [], items: [] }, webcams: { enabled: false, items: [] }, snow: { enabled: false }, snowpark: { enabled: false } }),
      forfaits,
      ...(normalizedForfaits ? { normalizedForfaits } : {}),
    };
  }

  if (!isStationV2(station)) return { notFound: true };
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  return { props: { station: JSON.parse(JSON.stringify(station)), widgets: widgets ? JSON.parse(JSON.stringify(widgets)) : null, section } };
};

export default StationSectionPage;
