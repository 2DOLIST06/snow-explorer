export type ActivityItem = { id: string; enabled: boolean } & (
  { type: "image"; src: string; alt: string; href: string; newTab: boolean } |
  { type: "rich"; html: string } |
  { type: "embed"; html: string; origins: string[] }
);
export type ActivitiesBlock = { enabled: boolean; title: string; items: ActivityItem[] };
export type ActivitiesSnapshot = { block: ActivitiesBlock; revision: number; has_block: boolean };
export type ActivityTemplate = { id: string; name: string; revision: number; block: ActivitiesBlock };
export const emptyActivities = (): ActivitiesBlock => ({ enabled: false, title: "Activités à faire", items: [] });
