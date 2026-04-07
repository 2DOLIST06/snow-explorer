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

const collectHeaders = (rows: DisplayForfaitItem[]): string[] => {
  const headers: string[] = [];

  rows.forEach((row) => {
    row.columns.forEach((col) => {
      const label = text(col.label);
      if (!label) return;
      if (!headers.includes(label)) headers.push(label);
    });
  });

  return headers;
};

const StationForfaitsBlock: React.FC<{ items: ForfaitItem[]; enabled?: boolean }> = ({ items, enabled }) => {
  if (!enabled) return null;

  const rows = normalizeForfaits(items);
  const headers = collectHeaders(rows);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 text-lg font-semibold text-neutral-900">Forfaits</h2>

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-neutral-100 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                <th className="px-4 py-3">Type de forfait</th>
                {headers.map((header) => (
                  <th key={header} className="px-4 py-3">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, rowIndex) => {
                const valuesByLabel = new Map<string, string>();
                row.columns.forEach((col) => {
                  const label = text(col.label);
                  if (!label) return;
                  valuesByLabel.set(label, text(col.value));
                });

                return (
                  <tr
                    key={row.id}
                    className={rowIndex % 2 === 0 ? "bg-white" : "bg-neutral-50/50"}
                  >
                    <td className="whitespace-nowrap border-t border-neutral-200 px-4 py-3 font-semibold text-neutral-900">
                      {row.title}
                    </td>

                    {headers.map((header) => (
                      <td key={`${row.id}-${header}`} className="border-t border-neutral-200 px-4 py-3 text-neutral-700">
                        {valuesByLabel.get(header) || "—"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">Aucun forfait renseigné.</p>
      )}
    </section>
  );
};

export default StationForfaitsBlock;
