import { useAuth } from "../state/auth";

export function useApi() {
  const { token, tenantIdOverride, user, logout } = useAuth();
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

  async function request(path: string, init?: RequestInit) {
    const headers: Record<string, string> = { ...(init?.headers as any || {}) };

    if (!(init?.body instanceof FormData)) headers["Content-Type"] = "application/json";

    if (token) headers["Authorization"] = `Bearer ${token}`;

    // Super Admin can act-as tenant
    if (tenantIdOverride && user?.role === "SUPER_ADMIN") {
      headers["X-Tenant-Id"] = tenantIdOverride;
    }

    const resp = await fetch(`${base}${path}`, { ...init, headers });
    const data = await resp.json().catch(() => ({}));
    if (resp.status === 401) logout();
    if (!resp.ok) throw new Error(data?.error || `Request failed: ${resp.status}`);
    return data;
  }

  async function download(path: string, filename: string) {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (tenantIdOverride && user?.role === "SUPER_ADMIN") headers["X-Tenant-Id"] = tenantIdOverride;

    const resp = await fetch(`${base}${path}`, { headers });
    if (resp.status === 401) logout();
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data?.error || `Download failed: ${resp.status}`);
    }
    const url = URL.createObjectURL(await resp.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return {
    request,
    getDashboardSummary: () => request("/dashboard/summary"),
    composeAiDraft: (prompt: string) => request("/ai/compose", { method: "POST", body: JSON.stringify({ prompt }) }),
    listEmployees: (search = "") => request(`/employees?search=${encodeURIComponent(search)}&limit=100&sort=updated_at:desc`),
    getEmployee: (employeeId: string) => request(`/employees/${employeeId}`),
    getEmployeeTimeline: (employeeId: string) => request(`/employees/${employeeId}/timeline`),
    listClients: (search = "") => request(`/clients?search=${encodeURIComponent(search)}`),
    createClient: (body: any) => request("/clients", { method: "POST", body: JSON.stringify(body) }),
    updateClient: (clientId: string, body: any) => request(`/clients/${clientId}`, { method: "PATCH", body: JSON.stringify(body) }),
    listClientProjects: () => request("/clients/projects"),
    listIntegrationsStatus: () => request("/integrations/sheets/status"),
    syncSheets: (notes: string) => request("/integrations/sheets/sync-now", { method: "POST", body: JSON.stringify({ notes }) }),
    requestFinesSalikImport: (notes: string) => request("/integrations/fines-salik/import", { method: "POST", body: JSON.stringify({ notes }) }),
    listVehicles: () => request("/assets/vehicles"),
    createVehicle: (body: any) => request("/assets/vehicles", { method: "POST", body: JSON.stringify(body) }),
    listAssignments: (status = "") => request(`/assignments${status ? `?status=${encodeURIComponent(status)}` : ""}`),
    createAssignment: (body: any) => request("/assignments", { method: "POST", body: JSON.stringify(body) }),
    endAssignment: (assignmentId: string, body: any) => request(`/assignments/${assignmentId}/end`, { method: "POST", body: JSON.stringify(body) }),
    listApprovals: (status = "PENDING") => request(`/approvals?status=${encodeURIComponent(status)}`),
    decideApproval: (approvalId: string, body: any) => request(`/approvals/${approvalId}/decide`, { method: "POST", body: JSON.stringify(body) }),
    listFinanceTransactions: () => request("/finance/transactions?limit=50&sort=effective_date:desc"),
    listFinanceCategories: (txType: string) => request(`/finance/categories?tx_type=${encodeURIComponent(txType)}`),
    listFinanceSubcategories: (categoryId: string) => request(`/finance/categories/${categoryId}/subcategories`),
    createFinanceTransaction: (body: any) => request("/finance/transactions", { method: "POST", body: JSON.stringify(body) }),
    previewOnboardingImport: (file: File, notes: string) => {
      const body = new FormData();
      body.append("file", file);
      body.append("data_type", "ONBOARDING");
      body.append("notes", notes);
      return request("/imports/preview", { method: "POST", body });
    },
    commitOnboardingImport: (jobId: string, notes: string) => request(`/imports/${jobId}/commit`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),
    listImportJobs: () => request("/imports/jobs"),
    downloadImportTemplate: (name: string) => download(`/imports/templates/${encodeURIComponent(name)}`, name),
  };
}
