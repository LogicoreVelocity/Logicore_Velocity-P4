import React, { useEffect, useState } from "react";
import { useApi } from "../api/client";

export default function Dashboard() {
  const { getDashboardSummary } = useApi();
  const [kpi, setKpi] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const data = await getDashboardSummary();
        setKpi(data);
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Dashboard</h1>
      <div className="text-sm text-slate-400 mb-6">
        Same dashboard layout for everyone. Data and actions are permission gated.
      </div>

      {err && <div className="text-red-400 text-sm mb-3">{err}</div>}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded border border-slate-800 bg-brandNavy2 p-4">
          <div className="text-xs text-slate-400">Employees</div>
          <div className="text-3xl font-semibold text-brandGold mt-2">
            {kpi ? kpi.employees?.total || 0 : "..."}
          </div>
          <div className="text-sm text-slate-300 mt-1">Tenant roster</div>
        </div>

        <div className="rounded border border-slate-800 bg-brandNavy2 p-4">
          <div className="text-xs text-slate-400">Employees By Status</div>
          <div className="mt-2 space-y-1 text-sm">
            {(kpi?.employees?.by_status || []).map((row: any) => (
              <div key={row.status} className="flex justify-between">
                <span className="text-slate-300">{row.status}</span>
                <span className="text-brandGold font-semibold">{row.count}</span>
              </div>
            ))}
            {!kpi && <div className="text-slate-500">Loading...</div>}
          </div>
        </div>

        <div className="rounded border border-slate-800 bg-brandNavy2 p-4">
          <div className="text-xs text-slate-400">Pending Approvals</div>
          <div className="text-3xl font-semibold text-brandGold mt-2">
            {kpi ? kpi.approvals?.pending || 0 : "..."}
          </div>
          <div className="text-sm text-slate-300 mt-1">Finance edits and workflow requests</div>
        </div>
      </div>

      <div className="mt-6 grid md:grid-cols-4 gap-4">
        <div className="rounded border border-slate-800 bg-brandNavy2 p-4">
          <div className="text-xs text-slate-400">Clients</div>
          <div className="text-2xl font-semibold text-brandGold mt-2">{kpi?.clients?.total ?? "..."}</div>
          <div className="text-xs text-slate-500 mt-1">{kpi?.clients?.active_riders ?? 0} active riders</div>
        </div>
        <div className="rounded border border-slate-800 bg-brandNavy2 p-4">
          <div className="text-xs text-slate-400">Assignments</div>
          <div className="text-2xl font-semibold text-brandGold mt-2">{kpi?.assignments?.active ?? "..."}</div>
          <div className="text-xs text-slate-500 mt-1">{kpi?.assignments?.ended ?? 0} ended</div>
        </div>
        <div className="rounded border border-slate-800 bg-brandNavy2 p-4">
          <div className="text-xs text-slate-400">Vehicles</div>
          <div className="text-2xl font-semibold text-brandGold mt-2">{kpi?.vehicles?.total ?? "..."}</div>
          <div className="text-xs text-slate-500 mt-1">Tracked fleet assets</div>
        </div>
        <div className="rounded border border-slate-800 bg-brandNavy2 p-4">
          <div className="text-xs text-slate-400">Monthly Finance</div>
          <div className="text-sm text-slate-300 mt-2">Payables: {kpi?.finance?.month_payables ?? "..."}</div>
          <div className="text-sm text-slate-300">Receivables: {kpi?.finance?.month_receivables ?? "..."}</div>
        </div>
      </div>
    </div>
  );
}
