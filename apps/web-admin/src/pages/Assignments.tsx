import React, { useEffect, useState } from "react";
import { useApi } from "../api/client";
import DataTable from "../components/DataTable";

export default function AssignmentsPage() {
  const { listAssignments, createAssignment, endAssignment, listEmployees, listClientProjects } = useApi();
  const [rows, setRows] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    driver_id: "",
    project_id: "",
    client_project_id: "",
    salary_mode: "FIXED",
    fixed_basic: "",
    per_order_rate: "",
    rental_receivable_default: "",
    start_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [endForm, setEndForm] = useState({
    assignment_id: "",
    end_date: new Date().toISOString().slice(0, 10),
    reason: "",
    notes: "",
  });

  async function load() {
    try {
      setErr(null);
      const [assignmentData, employeeData, projectData] = await Promise.all([
        listAssignments(status),
        listEmployees(""),
        listClientProjects(),
      ]);
      setRows(assignmentData.data || []);
      setEmployees(employeeData.data || []);
      setProjects(projectData.data || []);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    try {
      setErr(null);
      await createAssignment({
        ...form,
        client_project_id: form.client_project_id || undefined,
        fixed_basic: form.fixed_basic || undefined,
        per_order_rate: form.per_order_rate || undefined,
        rental_receivable_default: form.rental_receivable_default || undefined,
      });
      setForm((current) => ({ ...current, driver_id: "", project_id: "", client_project_id: "", notes: "" }));
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function endSelected() {
    try {
      setErr(null);
      await endAssignment(endForm.assignment_id, {
        end_date: endForm.end_date,
        reason: endForm.reason,
        notes: endForm.notes,
      });
      setEndForm((current) => ({ ...current, assignment_id: "", reason: "", notes: "" }));
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Assignments</h1>
      <div className="text-sm text-slate-400 mb-4">Employee to client project assignment workflow with status history and audit.</div>

      {err && <div className="text-red-400 text-sm mb-3">{err}</div>}

      <div className="rounded border border-slate-800 bg-brandNavy2 p-4 mb-6">
        <div className="text-sm font-semibold text-brandGold mb-3">Create Assignment</div>
        <div className="grid md:grid-cols-4 gap-3">
          <select className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={form.driver_id} onChange={(e) => setForm((current) => ({ ...current, driver_id: e.target.value }))}>
            <option value="">Employee...</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name} ({employee.employee_code})</option>)}
          </select>
          <select className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={form.project_id} onChange={(e) => setForm((current) => ({ ...current, project_id: e.target.value }))}>
            <option value="">Project...</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.client_name || "No client"} / {project.name}</option>)}
          </select>
          <input className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={form.client_project_id} onChange={(e) => setForm((current) => ({ ...current, client_project_id: e.target.value }))} placeholder="Client project ID" />
          <select className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={form.salary_mode} onChange={(e) => setForm((current) => ({ ...current, salary_mode: e.target.value }))}>
            <option value="FIXED">FIXED</option>
            <option value="PER_ORDER">PER_ORDER</option>
          </select>
          <input className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={form.fixed_basic} onChange={(e) => setForm((current) => ({ ...current, fixed_basic: e.target.value }))} placeholder="Fixed basic" type="number" />
          <input className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={form.per_order_rate} onChange={(e) => setForm((current) => ({ ...current, per_order_rate: e.target.value }))} placeholder="Per order rate" type="number" />
          <input className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={form.rental_receivable_default} onChange={(e) => setForm((current) => ({ ...current, rental_receivable_default: e.target.value }))} placeholder="Rental receivable" type="number" />
          <input className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={form.start_date} onChange={(e) => setForm((current) => ({ ...current, start_date: e.target.value }))} type="date" />
          <input className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm md:col-span-4" value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Notes are required" />
        </div>
        <button className="mt-3 rounded bg-brandGold text-brandNavy font-semibold px-4 py-2 text-sm" onClick={save} disabled={!form.driver_id || !form.project_id || !form.notes}>
          Assign
        </button>
      </div>

      <div className="rounded border border-slate-800 bg-brandNavy2 p-4 mb-6">
        <div className="text-sm font-semibold text-brandGold mb-3">End Assignment</div>
        <div className="grid md:grid-cols-4 gap-3">
          <input className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={endForm.assignment_id} onChange={(e) => setEndForm((current) => ({ ...current, assignment_id: e.target.value }))} placeholder="Assignment ID" />
          <input className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={endForm.end_date} onChange={(e) => setEndForm((current) => ({ ...current, end_date: e.target.value }))} type="date" />
          <input className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={endForm.reason} onChange={(e) => setEndForm((current) => ({ ...current, reason: e.target.value }))} placeholder="Reason" />
          <input className="rounded bg-brandNavy border border-slate-700 px-3 py-2 text-sm" value={endForm.notes} onChange={(e) => setEndForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Notes are required" />
        </div>
        <button className="mt-3 rounded bg-brandGold text-brandNavy font-semibold px-4 py-2 text-sm" onClick={endSelected} disabled={!endForm.assignment_id || !endForm.reason || !endForm.notes}>
          End
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <select className="rounded bg-brandNavy2 border border-slate-700 px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="ENDED">ENDED</option>
        </select>
        <button className="rounded bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm" onClick={load}>
          Refresh
        </button>
      </div>

      <DataTable
        rows={rows}
        columns={[
          { key: "id", header: "ID", render: (row) => <button className="text-brandGold" onClick={() => setEndForm((current) => ({ ...current, assignment_id: row.id }))}>{row.id}</button> },
          { key: "employee_name", header: "Employee" },
          { key: "client_name", header: "Client" },
          { key: "project_name", header: "Project" },
          { key: "salary_mode", header: "Salary" },
          { key: "start_date", header: "Start" },
          { key: "end_date", header: "End" },
          { key: "status", header: "Status" },
        ]}
        emptyText="No assignments found"
      />
    </div>
  );
}
