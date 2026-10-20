import type { ActivitiesBlock, ActivityItem } from "@/types/activities";
export function cleanActivityHtml(html: string): string;
export function activeActivityItems(block: ActivitiesBlock | null | undefined): ActivityItem[];
export function widgetDocument(item: Extract<ActivityItem, { type: "embed" }>, nonce: string, token: string): string;

export function activityEmbedLinksHtml(html: string): string;
export function visibleActivityItems(block: ActivitiesBlock | null | undefined, widgetsAllowed: boolean): ActivityItem[];
