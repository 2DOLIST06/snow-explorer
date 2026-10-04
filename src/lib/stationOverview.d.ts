import type { StationWidgetsConfig } from "@/types/station";

export type StationPisteDetail = {
  label: "Vertes" | "Bleues" | "Rouges" | "Noires";
  value: unknown;
  color: "green" | "blue" | "red" | "black";
};

export function getStationPresentation(station?: Record<string, any>, widgets?: StationWidgetsConfig | null): string[];
export function getStationPisteDetails(station?: Record<string, any>, widgets?: StationWidgetsConfig | null): StationPisteDetail[];
export type StationOverviewScope = { altitudeMin: any; altitudeMax: any; elevationDrop: any; skiAreaKm: any; pistesCount: any; liftsCount: any; snowparksCount: any; openDate: any; closeDate: any; pistes: StationPisteDetail[] };
export function getStationOverviewScope(station?: Record<string, any>, widgets?: StationWidgetsConfig | null, skiArea?: Record<string, any> | null): StationOverviewScope;
