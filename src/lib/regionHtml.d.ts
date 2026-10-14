import type { RegionSummary } from './regions';
export function sanitizeRegionHtml(value: unknown): string;
export function absoluteRegionLink(value: string): string | null;
export function regionDescription(region: RegionSummary | null): string;
export function hasRegionContent(html: string): boolean;

export function normalizeRegionLink(value: string): string;
export function cleanRegionHtml(value: string): string;

export const REGION_STATIONS: string;
export function splitRegionDescription(value: unknown): { before: string; after: string; hasMarker: boolean };
export function regionEditorHtml(value: string): string;
