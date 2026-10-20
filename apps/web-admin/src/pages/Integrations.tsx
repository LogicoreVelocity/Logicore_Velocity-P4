import React, { useEffect, useState } from "react";
import { useApi } from "../api/client";
import DataTable from "../components/DataTable";

export default function IntegrationsPage() {
  const { listIntegrationsStatus, syncSheets, requestFinesSalikImport } = useApi();
  const [rows, setRows] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [fineNotes, setFineNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    try {
      setErr(null);
      const data = await listIntegrationsStatus();
      setRows(data.data || []);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function runSync() {
    try {
      setErr(null);
      setMsg(null);
      const data = await syncSheets(notes);
      setMsg(data.message || "Sync triggered");
      setNotes("");
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function requestFineImport() {
    try {
      setErr(null);
      setMsg(null);
      const data = await requestFinesSalikImport(fineNotes);
      setMsg(data.message || "Import requested");
      setFineNotes("");
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Integrations</h1>
      <div className="text-sm text-slate-400 mb-4">Google Sheets status and controlled manual sync actions.</div>

      {err && <div className="text-red-400 text-sm mb-3">{err}</div>}
      {msg && <div className="text-green-400 text-sm mb-3">{msg}</div>}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="rounded border border-slate-800 bg-brandNavy2 p-4">
          <div className="text-sm font-semibold text-brandGold mb-3">Run Sheets Sync</div>
          <input
            className="w-full rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes are required"
          />
          <button className="mt-3 rounded bg-brandGold text-brandNavy font-semibold px-4 py-2 text-sm" onClick={runSync} disabled={!notes.trim()}>
            Sync Now
          </button>
        </div>

        <div className="rounded border border-slate-800 bg-brandNavy2 p-4">
          <div className="text-sm font-semibold text-brandGold mb-3">Fines and Salik Import</div>
          <input
            className="w-full rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm"
            value={fineNotes}
            onChange={(e) => setFineNotes(e.target.value)}
            placeholder="Notes are required"
          />
          <button className="mt-3 rounded bg-brandGold text-brandNavy font-semibold px-4 py-2 text-sm" onClick={requestFineImport} disabled={!fineNotes.trim()}>
            Request Import
          </button>
        </div>
      </div>

      <DataTable
        rows={rows}
        columns={[
          { key: "name", header: "Name" },
          { key: "enabled", header: "Enabled" },
          { key: "schedule_minutes", header: "Schedule" },
          { key: "last_sync_status", header: "Last Status" },
          { key: "last_sync_at", header: "Last Sync" },
          { key: "last_sync_error", header: "Error" },
        ]}
        emptyText="No sheet sources configured"
      />
    </div>
  );
}
