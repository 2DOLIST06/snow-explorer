import React from "react";
import { ForfaitColumn, ForfaitItem } from "@/types/station";

type Props = {
  enabled?: boolean;
  items?: ForfaitItem[];
};

type DisplayColumn = {
  id: string;
  label: string;
};

type DisplayRow = {
  id: string;
  title: string;
  values: Record<string, string>;
};

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const normalizeForfaits = (
  items: ForfaitItem[] | undefined
): { columns: DisplayColumn[]; rows: DisplayRow[] } => {
  if (!Array.isArray(items) || items.length === 0) {
    return { columns: [], rows: [] };
  }

  const columnMap = new Map<string, DisplayColumn>();

  const rows: DisplayRow[] = items.map((rawItem, index) => {
    const rowId = text((rawItem as any)?.id) || `forfait-${index + 1}`;
    const rowTitle = text((rawItem as any)?.title) || `Forfait ${index + 1}`;

    const rawColumns = Array.isArray((rawItem as any)?.columns)
      ? ((rawItem as any).columns as ForfaitColumn[])
      : [];

    const values: Record<string, string> = {};

    rawColumns.forEach((col, colIndex) => {
      const colId = text((col as any)?.id) || `${rowId}-col-${colIndex + 1}`;
      const label = text((col as any)?.label) || `Colonne ${colIndex + 1}`;
      const value = text((col as any)?.value);

      if (!columnMap.has(colId)) {
        columnMap.set(colId, {
          id: colId,
          label,
        });
      }

      values[colId] = value || "—";
    });

    return {
      id: rowId,
      title: rowTitle,
      values,
    };
  });

  const columns = Array.from(columnMap.values());

  return { columns, rows };
};

export default function StationForfaitsBlock({ enabled, items }: Props) {
  if (!enabled) return null;

  const { columns, rows } = normalizeForfaits(items);

  if (rows.length === 0 || columns.length === 0) {
    return (
      <section
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: 16,
          background: "#fff",
          padding: 16,
        }}
      >
        <h2
          style={{
            margin: "0 0 12px",
            fontSize: 20,
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          Forfaits
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: "#4b5563" }}>
          Aucun forfait disponible pour le moment.
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        border: "1px solid #cbd5e1",
        borderRadius: 16,
        background: "#fff",
        padding: 16,
      }}
    >
      <h2
        style={{
          margin: "0 0 12px",
          fontSize: 20,
          fontWeight: 800,
          color: "#0f172a",
        }}
      >
        Forfaits
      </h2>

      <div
        style={{
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          border: "1px solid #d1d9e6",
          borderRadius: 12,
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: 720,
            borderCollapse: "separate",
            borderSpacing: 0,
            background: "#fff",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 2,
                  textAlign: "left",
                  padding: "14px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#0f172a",
                  background: "#e8eef6",
                  borderBottom: "1px solid #cbd5e1",
                  whiteSpace: "nowrap",
                }}
              >
                Forfait
              </th>

              {columns.map((column) => (
                <th
                  key={column.id}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#0f172a",
                    background: "#e8eef6",
                    borderBottom: "1px solid #cbd5e1",
                    whiteSpace: "nowrap",
                  }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.id}>
                <th
                  scope="row"
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                    textAlign: "left",
                    padding: "14px 16px",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#0f172a",
                    background: rowIndex % 2 === 0 ? "#ffffff" : "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.title}
                </th>

                {columns.map((column) => (
                  <td
                    key={`${row.id}-${column.id}`}
                    style={{
                      padding: "14px 16px",
                      fontSize: 14,
                      color: "#334155",
                      background: rowIndex % 2 === 0 ? "#ffffff" : "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.values[column.id] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
