import React, { useEffect, useState } from "react";
import { useApi } from "../api/client";
import DataTable from "../components/DataTable";

const vehicleStatuses = ["IN_STOCK", "ASSIGNED", "DAMAGED", "UNDER_REPAIR", "LOST", "REMOVED"];

export default function VehiclesPage() {
  const { listVehicles, createVehicle } = useApi();
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    plate_number: "",
    make_model: "",
    year: "",
    status: "IN_STOCK",
    notes: "",
  });

  async function load() {
    try {
      setErr(null);
      const data = await listVehicles();
      setRows(data.data || []);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    try {
      setErr(null);
      await createVehicle({
        ...form,
        year: form.year ? Number(form.year) : undefined,
      });
      setForm({ plate_number: "", make_model: "", year: "", status: "IN_STOCK", notes: "" });
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Vehicles</h1>
      <div className="text-sm text-slate-400 mb-4">Fleet list and vehicle creation with required notes and audit.</div>

      {err && <div className="text-red-400 text-sm mb-3">{err}</div>}

      <div className="rounded border border-slate-800 bg-brandNavy2 p-4 mb-6">
        <div className="text-sm font-semibold text-brandGold mb-3">Add Vehicle</div>
        <div className="grid md:grid-cols-5 gap-3">
          <input className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={form.plate_number} onChange={(e) => setForm((f) => ({ ...f, plate_number: e.target.value }))} placeholder="Plate number" />
          <input className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={form.make_model} onChange={(e) => setForm((f) => ({ ...f, make_model: e.target.value }))} placeholder="Make / model" />
          <input className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} placeholder="Year" type="number" />
          <select className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            {vehicleStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <input className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes are required" />
        </div>
        <button className="mt-3 rounded bg-brandGold text-brandNavy font-semibold px-4 py-2 text-sm" onClick={save} disabled={!form.plate_number || !form.notes}>
          Add
        </button>
      </div>

      <DataTable
        rows={rows}
        columns={[
          { key: "plate_number", header: "Plate" },
          { key: "make_model", header: "Make / Model" },
          { key: "year", header: "Year" },
          { key: "status", header: "Status" },
          { key: "advertisement_permit_expiry", header: "Permit Expiry" },
          { key: "updated_at", header: "Updated" },
        ]}
        emptyText="No vehicles found"
      />
    </div>
  );
}
