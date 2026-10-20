import React, { useEffect, useState } from "react";
import { useApi } from "../api/client";
import DataTable from "../components/DataTable";

export default function ApprovalsPage() {
  const { listApprovals, decideApproval } = useApi();
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [selectedId, setSelectedId] = useState("");
  const [decision, setDecision] = useState("APPROVED");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setErr(null);
      const data = await listApprovals(status);
      setRows(data.data || []);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function submitDecision() {
    try {
      setErr(null);
      await decideApproval(selectedId, { decision, notes });
      setSelectedId("");
      setNotes("");
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Approvals</h1>
      <div className="text-sm text-slate-400 mb-4">Review and decide workflow approval requests with required decision notes.</div>

      {err && <div className="text-red-400 text-sm mb-3">{err}</div>}

      <div className="rounded border border-slate-800 bg-brandNavy2 p-4 mb-6">
        <div className="text-sm font-semibold text-brandGold mb-3">Decision</div>
        <div className="grid md:grid-cols-4 gap-3">
          <input className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} placeholder="Approval ID" />
          <select className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={decision} onChange={(e) => setDecision(e.target.value)}>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <input className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm md:col-span-2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes are required" />
        </div>
        <button className="mt-3 rounded bg-brandGold text-brandNavy font-semibold px-4 py-2 text-sm" onClick={submitDecision} disabled={!selectedId || !notes}>
          Submit Decision
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <select className="rounded bg-brandNavy2 border border-slate-700 px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <button className="rounded bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm" onClick={load}>
          Refresh
        </button>
      </div>

      <DataTable
        rows={rows}
        columns={[
          { key: "id", header: "ID", render: (row) => <button className="text-brandGold" onClick={() => setSelectedId(row.id)}>{row.id}</button> },
          { key: "entity_type", header: "Entity" },
          { key: "action_type", header: "Action" },
          { key: "status", header: "Status" },
          { key: "requested_at", header: "Requested" },
          { key: "notes", header: "Notes" },
        ]}
        emptyText="No approvals found"
      />
    </div>
  );
}
