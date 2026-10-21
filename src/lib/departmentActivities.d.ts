import type { ActivitiesBlock } from "@/types/activities";
export type DepartmentReference = string | number | { code?: string | number | null; name?: string | null; id?: string | null } | null | undefined;
export type DepartmentActivityConfig = { name: string; locative: string; locationId: string | number | null };
export function departmentActivityConfig(department: DepartmentReference, mapping?: Record<string, DepartmentActivityConfig>): (DepartmentActivityConfig & { code: string }) | null;
export function resolveStationActivities(block: ActivitiesBlock | null | undefined, department: DepartmentReference, loaded: boolean, mapping?: Record<string, DepartmentActivityConfig>): ActivitiesBlock | null | undefined;
export function departmentActivityGaps(values: DepartmentReference[], mapping?: Record<string, DepartmentActivityConfig>): { department: DepartmentReference; code: string | null; reason: string | null }[];
