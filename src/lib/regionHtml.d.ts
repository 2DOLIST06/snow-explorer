import type { RegionSummary } from "./regions";
export const REGION_ORIGIN: string;
export function getRegionDescription(region?: RegionSummary | null): string;
export function normalizeRegionLink(value: string): string;
export function cleanRegionHtml(html: string): string;
