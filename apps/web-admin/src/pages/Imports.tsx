import React, { useEffect, useState } from "react";
import { useApi } from "../api/client";
import { useAuth } from "../state/auth";
import DataTable from "../components/DataTable";

const templates = [
  "drivers_onboarding_template.csv",
  "payables_template.csv",
  "receivables_template.csv",
  "performance_template.csv",
  "vehicles_template.csv",
  "sims_template.csv",
  "assignments_template.csv",
  "fines_salik_template.csv",
];

export default function ImportsPage() {
  const {
    previewOnboardingImport,
    commitOnboardingImport,
    listImportJobs,
    downloadImportTemplate,
  } = useApi();
  const { user } = useAuth();
  const [notes, setNotes] = useState("");
  const [commitNotes, setCommitNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const canCommit = ["SUPER_ADMIN", "DELEGATED_SUPER_ADMIN", "ADMIN", "USER"].includes(user?.role || "");

  async function loadJobs() {
    try {
      const data = await listImportJobs();
      setJobs(data.data || []);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => { loadJobs(); }, []);

  async function createPreview() {
    setErr(null);
    setMsg(null);
    try {
      if (!file) throw new Error("Select an onboarding CSV or XLSX file");
      if (!notes.trim()) throw new Error("Notes are required");
      setBusy(true);
      const data = await previewOnboardingImport(file, notes);
      setJob(data.job);
      setPreview(data.preview);
      setCommitNotes(notes);
      setMsg(`Previewed ${data.preview.rows_total} rows. ${data.preview.rows_valid} are ready to commit.`);
      await loadJobs();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function commitPreview() {
    setErr(null);
    setMsg(null);
    try {
      if (!job?.id) throw new Error("Create a preview first");
      if (!commitNotes.trim()) throw new Error("Commit notes are required");
      setBusy(true);
      const data = await commitOnboardingImport(job.id, commitNotes);
      setMsg(`Committed ${data.inserted_count} employees. Skipped ${data.skipped_count}.`);
      setJob(null);
      setPreview(null);
      setFile(null);
      setNotes("");
      setCommitNotes("");
      await loadJobs();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadTemplate(name: string) {
    try {
      setErr(null);
      await downloadImportTemplate(name);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Imports</h1>
      <div className="text-sm text-slate-400 mb-4">
        Driver onboarding is enabled end to end: download the template, preview validation results, then commit approved rows.
        Other templates remain available for later workflows.
      </div>

      {err && <div className="text-red-400 text-sm mb-3">{err}</div>}
      {msg && <div className="text-green-400 text-sm mb-3">{msg}</div>}

      <div className="rounded border border-slate-800 bg-brandNavy2 p-4 mb-6">
        <div className="text-sm font-semibold text-brandGold mb-3">Templates</div>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          {templates.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => downloadTemplate(name)}
              className="text-left rounded bg-brandNavy border border-slate-800 px-3 py-2 hover:bg-brandNavy2"
            >
              {name}{name === "drivers_onboarding_template.csv" ? " (enabled)" : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded border border-slate-800 bg-brandNavy2 p-4 mb-6">
        <div className="text-sm font-semibold text-brandGold mb-3">1. Preview Driver Onboarding</div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400">Notes (required)</label>
            <input
              className="w-full rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Purpose and source of this import"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">CSV or XLSX file</label>
            <input
              className="w-full text-sm"
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <button
          className="mt-4 rounded bg-brandGold text-brandNavy font-semibold px-4 py-2 text-sm disabled:opacity-50"
          onClick={createPreview}
          disabled={busy || !file || !notes.trim()}
        >
          {busy ? "Processing..." : "Validate and Preview"}
        </button>
      </div>

      {preview && (
        <div className="rounded border border-slate-800 bg-brandNavy2 p-4 mb-6">
          <div className="text-sm font-semibold text-brandGold mb-3">2. Review and Commit</div>
          <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
            <div className="rounded bg-brandNavy p-3"><div className="text-slate-400">Total</div><div className="text-xl">{preview.rows_total}</div></div>
            <div className="rounded bg-brandNavy p-3"><div className="text-slate-400">Valid</div><div className="text-xl text-green-400">{preview.rows_valid}</div></div>
            <div className="rounded bg-brandNavy p-3"><div className="text-slate-400">Invalid</div><div className="text-xl text-red-400">{preview.rows_invalid}</div></div>
          </div>

          {preview.errors?.length > 0 && (
            <div className="mb-4 max-h-48 overflow-auto rounded bg-red-950/20 border border-red-900 p-3 text-xs">
              {preview.errors.map((item: any, index: number) => (
                <div key={`${item.row}-${item.field}-${index}`}>Row {item.row}, {item.field}: {item.message}</div>
              ))}
            </div>
          )}

          <DataTable
            rows={preview.rows || []}
            columns={[
              { key: "source_row", header: "Row" },
              { key: "full_name", header: "Name" },
              { key: "phone", header: "Phone" },
              { key: "email", header: "Email" },
              { key: "visa_type", header: "Visa" },
              { key: "joined_at", header: "Joined" },
            ]}
            emptyText="No valid rows to commit"
          />

          <div className="mt-4">
            <label className="text-xs text-slate-400">Commit notes (required)</label>
            <input
              className="w-full rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm"
              value={commitNotes}
              onChange={(e) => setCommitNotes(e.target.value)}
            />
          </div>
          <button
            className="mt-3 rounded bg-green-500 text-brandNavy font-semibold px-4 py-2 text-sm disabled:opacity-50"
            onClick={commitPreview}
            disabled={busy || !canCommit || preview.rows_valid === 0 || !commitNotes.trim()}
          >
            Commit {preview.rows_valid} Valid Employees
          </button>
          {!canCommit && <div className="text-xs text-slate-500 mt-2">Your role may preview imports but cannot commit onboarding records.</div>}
        </div>
      )}

      <div className="rounded border border-slate-800 bg-brandNavy2 p-4">
        <div className="text-sm font-semibold text-brandGold mb-3">Recent Import Jobs</div>
        <DataTable
          rows={jobs}
          columns={[
            { key: "source_ref", header: "File" },
            { key: "data_type", header: "Type" },
            { key: "stage", header: "Stage" },
            { key: "status", header: "Status" },
            { key: "rows_total", header: "Rows" },
            { key: "rows_success", header: "Success" },
            { key: "rows_failed", header: "Failed" },
            { key: "created_at", header: "Created" },
          ]}
          emptyText="No import jobs yet"
        />
      </div>
    </div>
  );
}
