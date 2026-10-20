import React, { useEffect, useState } from "react";
import { useApi } from "../api/client";
import DataTable from "../components/DataTable";

export default function FinancePage() {
  const {
    createFinanceTransaction,
    listEmployees,
    listFinanceCategories,
    listFinanceSubcategories,
    listFinanceTransactions,
  } = useApi();

  const [txs, setTxs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [cats, setCats] = useState<any[]>([]);
  const [subcats, setSubcats] = useState<any[]>([]);

  const [form, setForm] = useState({
    driver_id: "",
    tx_type: "PAYABLE",
    category_id: "",
    subcategory_id: "",
    amount: 0,
    currency: "AED",
    effective_date: new Date().toISOString().slice(0, 10),
    external_ref: "",
    notes: "",
  });

  async function load() {
    try {
      setErr(null);
      const [transactions, employeeData] = await Promise.all([
        listFinanceTransactions(),
        listEmployees(""),
      ]);
      setTxs(transactions.data || []);
      setEmployees(employeeData.data || []);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function loadCats() {
    try {
      const data = await listFinanceCategories(form.tx_type);
      setCats(data.data || []);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function loadSubcats(categoryId: string) {
    try {
      if (!categoryId) {
        setSubcats([]);
        return;
      }
      const data = await listFinanceSubcategories(categoryId);
      setSubcats(data.data || []);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { loadCats(); }, [form.tx_type]);
  useEffect(() => { loadSubcats(form.category_id); }, [form.category_id]);

  async function submit() {
    try {
      setErr(null);
      await createFinanceTransaction({
        ...form,
        driver_id: form.driver_id || undefined,
        amount: Number(form.amount),
      });
      setForm((current) => ({ ...current, notes: "", external_ref: "" }));
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Finance</h1>
      <div className="text-sm text-slate-400 mb-4">
        Add payable and receivable transactions. Edits require approval; voiding is Super Admin only.
      </div>

      {err && <div className="text-red-400 text-sm mb-3">{err}</div>}

      <div className="rounded border border-slate-800 bg-brandNavy2 p-4 mb-6">
        <div className="text-sm font-semibold text-brandGold mb-3">Add Transaction</div>

        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-400">Type</label>
            <select
              className="w-full rounded bg-brandNavy border border-slate-700 px-2 py-2 text-sm"
              value={form.tx_type}
              onChange={(e) => setForm((current) => ({ ...current, tx_type: e.target.value, category_id: "", subcategory_id: "" }))}
            >
              <option value="PAYABLE">PAYABLE</option>
              <option value="RECEIVABLE">RECEIVABLE</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400">Category</label>
            <select
              className="w-full rounded bg-brandNavy border border-slate-700 px-2 py-2 text-sm"
              value={form.category_id}
              onChange={(e) => setForm((current) => ({ ...current, category_id: e.target.value, subcategory_id: "" }))}
            >
              <option value="">Select...</option>
              {cats.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400">Subcategory</label>
            <select
              className="w-full rounded bg-brandNavy border border-slate-700 px-2 py-2 text-sm"
              value={form.subcategory_id}
              onChange={(e) => setForm((current) => ({ ...current, subcategory_id: e.target.value }))}
            >
              <option value="">Select...</option>
              {subcats.map((subcat) => <option key={subcat.id} value={subcat.id}>{subcat.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400">Amount</label>
            <input
              className="w-full rounded bg-brandNavy border border-slate-700 px-2 py-2 text-sm"
              type="number"
              value={form.amount}
              onChange={(e) => setForm((current) => ({ ...current, amount: Number(e.target.value) }))}
            />
          </div>

          <div>
            <label className="text-xs text-slate-400">Employee (optional)</label>
            <select
              className="w-full rounded bg-brandNavy border border-slate-700 px-2 py-2 text-sm"
              value={form.driver_id}
              onChange={(e) => setForm((current) => ({ ...current, driver_id: e.target.value }))}
            >
              <option value="">No employee</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name} ({employee.employee_code})</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400">Date</label>
            <input
              className="w-full rounded bg-brandNavy border border-slate-700 px-2 py-2 text-sm"
              value={form.effective_date}
              onChange={(e) => setForm((current) => ({ ...current, effective_date: e.target.value }))}
              type="date"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400">External Ref</label>
            <input
              className="w-full rounded bg-brandNavy border border-slate-700 px-2 py-2 text-sm"
              value={form.external_ref}
              onChange={(e) => setForm((current) => ({ ...current, external_ref: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs text-slate-400">Notes</label>
            <input
              className="w-full rounded bg-brandNavy border border-slate-700 px-2 py-2 text-sm"
              value={form.notes}
              onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
              placeholder="Required"
            />
          </div>
        </div>

        <button
          className="mt-4 rounded bg-brandGold text-brandNavy font-semibold px-4 py-2 text-sm hover:opacity-90"
          onClick={submit}
          disabled={!form.notes || !form.category_id || !form.subcategory_id}
        >
          Add
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-brandGold">Latest Transactions</div>
        <button className="rounded bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm" onClick={load}>Refresh</button>
      </div>

      <DataTable
        rows={txs}
        columns={[
          { key: "effective_date", header: "Date" },
          { key: "tx_type", header: "Type" },
          { key: "amount", header: "Amount" },
          { key: "status", header: "Status" },
          { key: "driver_id", header: "Employee" },
          { key: "external_ref", header: "Ref" },
          { key: "notes", header: "Notes" },
        ]}
        emptyText="No transactions yet"
      />
    </div>
  );
}
