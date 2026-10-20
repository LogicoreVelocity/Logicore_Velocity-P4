import React, { useEffect, useState } from "react";
import { useApi } from "../api/client";
import DataTable from "../components/DataTable";

export default function ClientsPage() {
  const { listClients, createClient, updateClient } = useApi();
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", notes: "" });

  async function load() {
    try {
      setErr(null);
      const data = await listClients(search);
      setRows(data.data || []);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    try {
      setErr(null);
      setMsg(null);
      if (editingId) {
        await updateClient(editingId, form);
        setMsg("Client updated");
      } else {
        await createClient(form);
        setMsg("Client created");
      }
      setEditingId(null);
      setForm({ name: "", notes: "" });
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  function edit(row: any) {
    setEditingId(row.id);
    setForm({ name: row.name, notes: row.notes || "" });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Clients</h1>
          <div className="text-sm text-slate-400">Client cards with project counts and active rider totals.</div>
        </div>
        <button className="rounded bg-brandGold text-brandNavy font-semibold px-3 py-2 text-sm" onClick={load}>
          Refresh
        </button>
      </div>

      {err && <div className="text-red-400 text-sm mb-3">{err}</div>}
      {msg && <div className="text-green-400 text-sm mb-3">{msg}</div>}

      <div className="rounded border border-slate-800 bg-brandNavy2 p-4 mb-6">
        <div className="text-sm font-semibold text-brandGold mb-3">{editingId ? "Edit Client" : "Add Client"}</div>
        <div className="grid md:grid-cols-3 gap-3">
          <input
            className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Client name"
          />
          <input
            className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm md:col-span-2"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Notes are required"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button className="rounded bg-brandGold text-brandNavy font-semibold px-4 py-2 text-sm" onClick={save} disabled={!form.name || !form.notes}>
            {editingId ? "Save" : "Add"}
          </button>
          {editingId && (
            <button className="rounded bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm" onClick={() => { setEditingId(null); setForm({ name: "", notes: "" }); }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="flex-1 rounded bg-brandNavy2 border border-slate-700 px-3 py-2 text-sm"
        />
        <button className="rounded bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm" onClick={load}>
          Search
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {rows.map((client) => (
          <div key={client.id} className="rounded border border-slate-800 bg-brandNavy2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-brandGold">{client.name}</div>
                <div className="text-xs text-slate-500 mt-1">{client.notes || "No notes"}</div>
              </div>
              <button className="rounded bg-slate-700 hover:bg-slate-600 px-2 py-1 text-xs" onClick={() => edit(client)}>
                Edit
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
              <div>
                <div className="text-xs text-slate-400">Projects</div>
                <div className="text-xl font-semibold">{client.project_count}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Active Riders</div>
                <div className="text-xl font-semibold">{client.active_riders}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!rows.length && <DataTable rows={[]} columns={[{ key: "name", header: "Name" }]} emptyText="No clients found" />}
    </div>
  );
}
