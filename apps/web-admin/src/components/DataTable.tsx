import React from "react";

type Column<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
};

export default function DataTable<T extends { [k: string]: any }>(props: {
  columns: Column<T>[];
  rows: T[];
  emptyText?: string;
}) {
  const { columns, rows, emptyText } = props;

  if (!rows.length) {
    return <div className="text-slate-400 text-sm">{emptyText || "No data"}</div>;
  }

  return (
    <div className="overflow-auto rounded border border-slate-800">
      <table className="min-w-full text-sm">
        <thead className="bg-brandNavy2 text-slate-200">
          <tr>
            {columns.map((c) => (
              <th key={String(c.key)} className="text-left px-3 py-2 font-semibold border-b border-slate-800">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="odd:bg-black/10">
              {columns.map((c) => (
                <td key={String(c.key)} className="px-3 py-2 border-b border-slate-900 align-top">
                  {c.render ? c.render(r) : String(r[c.key as string] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
