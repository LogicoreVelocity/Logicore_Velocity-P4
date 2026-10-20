import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState("");
  const [email, setEmail] = useState("superadmin@logicore.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(tenantId, email, password);
      navigate("/", { replace: true });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-brandNavy2 border border-slate-800 rounded p-6">
        <div className="text-xl font-semibold text-brandGold">Logicore Velocity</div>
        <div className="text-sm text-slate-400 mb-6">Admin Portal — Phase 4</div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">Tenant ID</label>
            <input
              className="w-full rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="Paste tenant_id from seed output"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400">Email</label>
            <input
              className="w-full rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400">Password</label>
            <input
              className="w-full rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {err && <div className="text-sm text-red-400">{err}</div>}

          <button
            className="w-full rounded bg-brandGold text-brandNavy font-semibold px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50"
            disabled={busy}
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>

          <div className="text-xs text-slate-500">
            Tip: Run <code className="text-slate-300">npm run db:seed</code> to get the tenant_id and demo credentials.
          </div>
        </form>
      </div>
    </div>
  );
}
