import type { StationWidgetsConfig } from "@/types/station";

export type StationPisteDetail = {
  label: "Vertes" | "Bleues" | "Rouges" | "Noires";
  value: unknown;
  color: "green" | "blue" | "red" | "black";
};

export function getStationPresentation(station?: Record<string, any>, widgets?: StationWidgetsConfig | null): string[];
export function getStationPisteDetails(station?: Record<string, any>, widgets?: StationWidgetsConfig | null): StationPisteDetail[];
