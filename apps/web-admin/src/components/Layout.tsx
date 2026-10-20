import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth";
import { useApi } from "../api/client";
import logo from "../assets/logo.png";

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block rounded px-3 py-2 text-sm ${isActive ? "bg-brandNavy2 text-brandGold" : "text-slate-200 hover:bg-brandNavy2"}`
      }
    >
      {label}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout, tenantIdOverride, setTenantIdOverride } = useAuth();
  const { composeAiDraft } = useApi();
  const navigate = useNavigate();

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDraft, setAiDraft] = useState<any>(null);
  const [aiErr, setAiErr] = useState<string | null>(null);

  async function runAi() {
    setAiErr(null);
    setAiDraft(null);
    try {
      const data = await composeAiDraft(aiPrompt);
      setAiDraft(data);
    } catch (e: any) {
      setAiErr(e.message);
    }
  }

  const role = user?.role || "";
  const canUseIntegrations = ["SUPER_ADMIN", "DELEGATED_SUPER_ADMIN", "ADMIN"].includes(role);
  const canUseApprovals = ["SUPER_ADMIN", "DELEGATED_SUPER_ADMIN", "ADMIN", "ACCOUNTS"].includes(role);
  const canUseVehicles = role !== "ACCOUNTS";
  const canUseSuperAdmin = ["SUPER_ADMIN", "DELEGATED_SUPER_ADMIN"].includes(role);

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-brandNavy2 border-r border-slate-800 p-4">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <img src={logo} alt="Logicore Velocity" className="w-10 h-10 rounded" />
          <div>
            <div className="font-semibold leading-tight">Logicore Velocity</div>
            <div className="text-xs text-slate-400">Admin Portal</div>
          </div>
        </Link>

        <div className="space-y-1">
          <NavItem to="/" label="Dashboard" />
          <NavItem to="/employees" label="Employees" />
          <NavItem to="/clients" label="Clients" />
          {canUseVehicles && <NavItem to="/vehicles" label="Vehicles" />}
          <NavItem to="/assignments" label="Assignments" />
          {canUseApprovals && <NavItem to="/approvals" label="Approvals" />}
          <NavItem to="/finance" label="Finance" />
          {canUseIntegrations && <NavItem to="/integrations" label="Integrations" />}
          <NavItem to="/imports" label="Imports" />
          {canUseSuperAdmin && <NavItem to="/superadmin" label="Super Admin Control" />}
        </div>

        <div className="mt-6 text-xs text-slate-400">
          <div>Signed in as</div>
          <div className="text-slate-200">{user?.email}</div>
          <div className="text-slate-500">{user?.role}</div>
        </div>

        {user?.role === "SUPER_ADMIN" && (
          <div className="mt-4 p-3 rounded bg-brandNavy border border-slate-800">
            <div className="text-xs text-slate-400 mb-2">Act as Tenant (optional)</div>
            <input
              value={tenantIdOverride || ""}
              onChange={(e) => setTenantIdOverride(e.target.value || null)}
              placeholder="Tenant UUID"
              className="w-full rounded bg-brandNavy2 border border-slate-700 px-2 py-1 text-xs"
            />
            <div className="text-[11px] text-slate-500 mt-2">
              If empty, uses your tenant_id.
            </div>
          </div>
        )}

        <button
          className="mt-6 w-full rounded bg-red-600/80 hover:bg-red-600 text-sm px-3 py-2"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          Logout
        </button>
      </aside>

      <main className="flex-1">
        <header className="sticky top-0 z-10 bg-brandNavy border-b border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="AI: e.g. 'replace vehicle for driver Salman because breakdown, replace with plate ABC123'"
              className="flex-1 rounded bg-brandNavy2 border border-slate-700 px-3 py-2 text-sm"
            />
            <button
              className="rounded bg-brandGold text-brandNavy font-semibold px-4 py-2 text-sm hover:opacity-90"
              onClick={runAi}
              disabled={!aiPrompt.trim()}
            >
              Draft
            </button>
          </div>

          {aiErr && <div className="mt-2 text-sm text-red-400">{aiErr}</div>}
          {aiDraft && (
            <div className="mt-3 p-3 rounded bg-brandNavy2 border border-slate-800 text-sm">
              <div className="text-slate-300">
                <span className="text-brandGold font-semibold">AI Draft:</span>{" "}
                intent <span className="font-mono">{aiDraft.draft?.intent}</span>, confidence{" "}
                {aiDraft.draft?.confidence}
              </div>
              <pre className="mt-2 text-xs bg-black/20 p-2 rounded overflow-auto">
                {JSON.stringify(aiDraft.draft?.form, null, 2)}
              </pre>
              <div className="text-xs text-slate-500 mt-2">
                Draft only. User confirmation + approvals still apply.
              </div>
            </div>
          )}
        </header>

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
