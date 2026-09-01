import type { StationWidgetsConfig } from "@/types/station";
import type { SkiPassSeason } from "@/types/skiPass";

export type PublicSkiPassPayload = {
  ski_pass: SkiPassSeason | null;
  legacy_forfaits: Partial<StationWidgetsConfig["forfaits"]> | null;
  legacy_fallback: "embedded" | "widgets" | "not_required";
};

type CanonicalPayload = SkiPassSeason & {
  ski_pass?: SkiPassSeason | null;
  legacy_forfaits?: Partial<StationWidgetsConfig["forfaits"]> | null;
  legacy_required?: boolean;
};

export async function loadPublicSkiPasses(
  fetchCanonical: () => Promise<unknown>,
  fetchLegacy: () => Promise<unknown>,
): Promise<PublicSkiPassPayload> {
  const raw = await fetchCanonical() as CanonicalPayload | null;
  const skiPass = raw?.ski_pass !== undefined ? raw.ski_pass : raw;

  if (raw && Object.prototype.hasOwnProperty.call(raw, "legacy_forfaits")) {
    return { ski_pass: skiPass, legacy_forfaits: raw.legacy_forfaits || null, legacy_fallback: "embedded" };
  }
  if (raw?.legacy_required === false) {
    return { ski_pass: skiPass, legacy_forfaits: null, legacy_fallback: "not_required" };
  }

  // Until the canonical API explicitly certifies that legacy data is not needed,
  // retain every historical field rather than silently dropping visible prices.
  const widgets = await fetchLegacy() as { forfaits?: Partial<StationWidgetsConfig["forfaits"]>; widgets?: { forfaits?: Partial<StationWidgetsConfig["forfaits"]> } } | null;
  return {
    ski_pass: skiPass,
    legacy_forfaits: widgets?.forfaits || widgets?.widgets?.forfaits || null,
    legacy_fallback: "widgets",
  };
}
