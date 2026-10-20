import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useApi } from "../api/client";
import DataTable from "../components/DataTable";

export default function EmployeeProfile() {
  const { employeeId } = useParams();
  const { getEmployee, getEmployeeTimeline } = useApi();
  const [employee, setEmployee] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!employeeId) return;
      try {
        setErr(null);
        const [profile, history] = await Promise.all([
          getEmployee(employeeId),
          getEmployeeTimeline(employeeId),
        ]);
        setEmployee(profile);
        setTimeline(history);
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, [employeeId]);

  if (err) return <div className="text-red-400 text-sm">{err}</div>;
  if (!employee) return <div className="text-slate-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">{employee.full_name}</h1>
          <div className="text-sm text-slate-400">{employee.phone} | {employee.employee_code} | {employee.status}</div>
          <div className="text-xs text-slate-500 mt-2">Visa: {employee.visa_type} | License: {employee.license_no || "N/A"}</div>
        </div>
        <div className="text-right text-xs text-slate-500">
          Updated: {employee.updated_at}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded border border-slate-800 bg-brandNavy2 p-4">
          <div className="text-sm font-semibold text-brandGold mb-2">Lifecycle Roadmap</div>
          <DataTable
            rows={timeline?.status_history || []}
            columns={[
              { key: "effective_at", header: "When" },
              { key: "from_status", header: "From" },
              { key: "to_status", header: "To" },
              { key: "reason", header: "Reason" },
            ]}
            emptyText="No status history yet"
          />
        </div>

        <div className="rounded border border-slate-800 bg-brandNavy2 p-4">
          <div className="text-sm font-semibold text-brandGold mb-2">Assignments</div>
          <DataTable
            rows={timeline?.assignments || []}
            columns={[
              { key: "project_name", header: "Project" },
              { key: "salary_mode", header: "Salary Mode" },
              { key: "start_date", header: "Start" },
              { key: "end_date", header: "End" },
              { key: "status", header: "Status" },
            ]}
            emptyText="No assignments yet"
          />
        </div>

        <div className="rounded border border-slate-800 bg-brandNavy2 p-4">
          <div className="text-sm font-semibold text-brandGold mb-2">Assets</div>
          <DataTable
            rows={timeline?.asset_assignments || []}
            columns={[
              { key: "asset_type", header: "Type" },
              { key: "asset_id", header: "Asset Id" },
              { key: "status", header: "Status" },
              { key: "assigned_at", header: "Assigned" },
              { key: "unassigned_at", header: "Unassigned" },
            ]}
            emptyText="No assets assigned yet"
          />
        </div>

        <div className="rounded border border-slate-800 bg-brandNavy2 p-4">
          <div className="text-sm font-semibold text-brandGold mb-2">Transactions</div>
          <DataTable
            rows={timeline?.transactions || []}
            columns={[
              { key: "effective_date", header: "Date" },
              { key: "tx_type", header: "Type" },
              { key: "amount", header: "Amount" },
              { key: "status", header: "Status" },
              { key: "external_ref", header: "Ref" },
            ]}
            emptyText="No transactions yet"
          />
        </div>
      </div>
    </div>
  );
}
