import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../api/client";
import DataTable from "../components/DataTable";

export default function EmployeesPage() {
  const { listEmployees } = useApi();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setErr(null);
      const data = await listEmployees(search);
      setRows(data.data || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Employees</h1>
          <div className="text-sm text-slate-400">Search, filter, and view employee lifecycle timelines.</div>
        </div>
        <button className="rounded bg-brandGold text-brandNavy font-semibold px-3 py-2 text-sm" onClick={load}>
          Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, employee code..."
          className="flex-1 rounded bg-brandNavy2 border border-slate-700 px-3 py-2 text-sm"
        />
        <button className="rounded bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm" onClick={load}>
          Search
        </button>
      </div>

      {err && <div className="text-red-400 text-sm mb-3">{err}</div>}

      <DataTable
        rows={rows}
        columns={[
          { key: "full_name", header: "Name", render: (r) => <Link className="text-brandGold" to={`/employees/${r.id}`}>{r.full_name}</Link> },
          { key: "phone", header: "Phone" },
          { key: "employee_code", header: "Code" },
          { key: "visa_type", header: "Visa" },
          { key: "status", header: "Status" },
          { key: "updated_at", header: "Updated" },
        ]}
        emptyText="No employees found"
      />

      <div className="text-xs text-slate-500 mt-3">Total: {total}</div>
    </div>
  );
}
