import React, { useEffect, useState } from "react";
import { useApi } from "../api/client";
import { useAuth } from "../state/auth";
import DataTable from "../components/DataTable";

export default function SuperAdminControl() {
  const { user } = useAuth();
  const { request } = useApi();
  const [settings, setSettings] = useState<any[]>([]);
  const [sheets, setSheets] = useState<any[]>([]);
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [newSetting, setNewSetting] = useState({ key: "AI_BUDGET", value: { monthly: 0 }, notes: "Initial" });
  const [newSheet, setNewSheet] = useState({ name: "Client Sheet", url: "", mapping_json: { driver_identifier: "phone" }, schedule_minutes: 180, enabled: true, notes: "Add mapping" });

  async function load() {
    try {
      setErr(null);
      const s = await request("/superadmin/settings");
      setSettings(s.data || []);
      const sh = await request("/superadmin/sheet-sources");
      setSheets(sh.data || []);
      const at = await request("/superadmin/asset-item-types");
      setAssetTypes(at.data || []);
    } catch (e: any) { setErr(e.message); }
  }

  useEffect(() => { load(); }, []);

  if (user?.role !== "SUPER_ADMIN" && user?.role !== "DELEGATED_SUPER_ADMIN") {
    return (
      <div className="rounded border border-slate-800 bg-brandNavy2 p-4">
        <div className="text-red-400 text-sm">Access denied</div>
        <div className="text-slate-400 text-sm mt-1">Super Admin Control Panel is restricted.</div>
      </div>
    );
  }

  async function saveSetting() {
    try {
      setErr(null);
      await request("/superadmin/settings", { method: "PUT", body: JSON.stringify(newSetting) });
      await load();
    } catch (e: any) { setErr(e.message); }
  }

  async function addSheet() {
    try {
      setErr(null);
      await request("/superadmin/sheet-sources", { method: "POST", body: JSON.stringify(newSheet) });
      await load();
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Super Admin Control Panel</h1>
      <div className="text-sm text-slate-400 mb-4">
        All logical settings live here (security-first). Dashboard stays same for everyone.
      </div>

      {err && <div className="text-red-400 text-sm mb-3">{err}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded border border-slate-800 bg-brandNavy2 p-4">
          <div className="text-sm font-semibold text-brandGold mb-3">Settings</div>

          <div className="grid gap-2 mb-4">
            <input
              className="rounded bg-brandNavy border border-slate-700 px-2 py-2 text-sm"
              placeholder="key"
              value={newSetting.key}
              onChange={(e) => setNewSetting((x) => ({ ...x, key: e.target.value }))}
            />
            <textarea
              className="rounded bg-brandNavy border border-slate-700 px-2 py-2 text-sm"
              rows={3}
              value={JSON.stringify(newSetting.value, null, 2)}
              onChange={(e) => {
                try {
                  setNewSetting((x) => ({ ...x, value: JSON.parse(e.target.value) }));
                } catch {}
              }}
            />
            <input
              className="rounded bg-brandNavy border border-slate-700 px-2 py-2 text-sm"
              placeholder="notes (required)"
              value={newSetting.notes}
              onChange={(e) => setNewSetting((x) => ({ ...x, notes: e.target.value }))}
            />
            <button className="rounded bg-brandGold text-brandNavy font-semibold px-3 py-2 text-sm" onClick={saveSetting}>
              Save Setting
            </button>
          </div>

          <DataTable
            rows={settings}
            columns={[
              { key: "key", header: "Key" },
              { key: "value", header: "Value", render: (r) => <pre className="text-xs bg-black/20 p-2 rounded overflow-auto">{JSON.stringify(r.value, null, 2)}</pre> },
              { key: "updated_at", header: "Updated" },
            ]}
            emptyText="No settings"
          />
        </div>

        <div className="rounded border border-slate-800 bg-brandNavy2 p-4">
          <div className="text-sm font-semibold text-brandGold mb-3">Google Sheet Sources</div>

          <div className="grid gap-2 mb-4">
            <input
              className="rounded bg-brandNavy border border-slate-700 px-2 py-2 text-sm"
              placeholder="name"
              value={newSheet.name}
              onChange={(e) => setNewSheet((x) => ({ ...x, name: e.target.value }))}
            />
            <input
              className="rounded bg-brandNavy border border-slate-700 px-2 py-2 text-sm"
              placeholder="url"
              value={newSheet.url}
              onChange={(e) => setNewSheet((x) => ({ ...x, url: e.target.value }))}
            />
            <textarea
              className="rounded bg-brandNavy border border-slate-700 px-2 py-2 text-sm"
              rows={3}
              value={JSON.stringify(newSheet.mapping_json, null, 2)}
              onChange={(e) => {
                try { setNewSheet((x) => ({ ...x, mapping_json: JSON.parse(e.target.value) })); } catch {}
              }}
            />
            <input
              className="rounded bg-brandNavy border border-slate-700 px-2 py-2 text-sm"
              placeholder="notes (required)"
              value={newSheet.notes}
              onChange={(e) => setNewSheet((x) => ({ ...x, notes: e.target.value }))}
            />
            <button className="rounded bg-brandGold text-brandNavy font-semibold px-3 py-2 text-sm" onClick={addSheet}>
              Add Sheet Source
            </button>
            <div className="text-xs text-slate-500">
              Sync runs every 3 hours. Implement OAuth fetch in API to import performance automatically.
            </div>
          </div>

          <DataTable
            rows={sheets}
            columns={[
              { key: "name", header: "Name" },
              { key: "url", header: "URL" },
              { key: "enabled", header: "Enabled" },
              { key: "schedule_minutes", header: "Schedule (min)" },
              { key: "last_sync_status", header: "Last Sync" },
            ]}
            emptyText="No sheet sources"
          />
        </div>

        <div className="rounded border border-slate-800 bg-brandNavy2 p-4 md:col-span-2">
          <div className="text-sm font-semibold text-brandGold mb-3">Asset Item Types</div>
          <div className="text-xs text-slate-500 mb-2">
            This drives dashboard “in stock” boxes (Helmet / T-Shirt / etc). Add via API endpoint in production UI.
          </div>
          <DataTable
            rows={assetTypes}
            columns={[
              { key: "name", header: "Name" },
              { key: "enabled", header: "Enabled" },
              { key: "reorder_threshold", header: "Reorder Threshold" },
              { key: "notes", header: "Notes" },
            ]}
            emptyText="No asset item types"
          />
        </div>
      </div>
    </div>
  );
}
