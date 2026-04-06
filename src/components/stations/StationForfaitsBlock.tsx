import React from "react";
import { ForfaitColumn, ForfaitItem } from "@/types/station";

type DisplayForfaitItem = {
  id: string;
  title: string;
  columns: ForfaitColumn[];
};

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const normalizeForfaits = (items: ForfaitItem[] | undefined): DisplayForfaitItem[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((rawItem, index) => {
      const rowId = text(rawItem?.id) || `forfait-${index + 1}`;
      const rowTitle = text(rawItem?.title) || `Forfait ${index + 1}`;

      const fromColumns = Array.isArray(rawItem?.columns)
        ? rawItem.columns
            .map((col, colIndex) => ({
              id: text(col?.id) || `${rowId}-col-${colIndex + 1}`,
              label: text(col?.label),
              value: text(col?.value),
            }))
            .filter((col) => col.label || col.value)
        : [];

      if (fromColumns.length > 0) {
        return { id: rowId, title: rowTitle, columns: fromColumns };
      }

      const legacyColumns: ForfaitColumn[] = [];

      if (text(rawItem?.price)) {
        legacyColumns.push({ id: `${rowId}-legacy-price`, label: "Prix", value: text(rawItem.price) });
      }

      if (text(rawItem?.url)) {
        legacyColumns.push({ id: `${rowId}-legacy-url`, label: "Lien", value: text(rawItem.url) });
      }

      if (text(rawItem?.note)) {
        legacyColumns.push({ id: `${rowId}-legacy-note`, label: "Note", value: text(rawItem.note) });
      }

      return {
        id: rowId,
        title: rowTitle,
        columns: legacyColumns,
      };
    })
    .filter((item) => item.columns.length > 0);
};

const StationForfaitsBlock: React.FC<{ items: ForfaitItem[]; enabled?: boolean }> = ({ items, enabled }) => {
  if (!enabled) return null;

  const rows = normalizeForfaits(items);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">Forfaits</h2>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
          {rows.length} ligne{rows.length > 1 ? "s" : ""}
        </span>
      </div>

      {rows.length > 0 ? (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 sm:p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-700">{row.title}</h3>

              <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-b border-neutral-200 bg-neutral-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-600 sm:px-4">
                  <span>Catégorie</span>
                  <span>Tarif</span>
                </div>

                {row.columns.map((col) => (
                  <div
                    key={col.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-b border-neutral-100 px-3 py-2.5 text-sm last:border-b-0 sm:px-4"
                  >
                    <span className="truncate text-neutral-700">{col.label || "—"}</span>
                    <span className="font-semibold text-neutral-900">{col.value || "—"}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">Aucun forfait renseigné.</p>
      )}
    </section>
  );
};

export default StationForfaitsBlock;
