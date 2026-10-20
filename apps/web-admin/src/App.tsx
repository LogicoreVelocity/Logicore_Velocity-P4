import React from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useAuth } from "./state/auth";
import LoginPage from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EmployeesPage from "./pages/Employees";
import EmployeeProfile from "./pages/EmployeeProfile";
import ClientsPage from "./pages/Clients";
import IntegrationsPage from "./pages/Integrations";
import VehiclesPage from "./pages/Vehicles";
import AssignmentsPage from "./pages/Assignments";
import ApprovalsPage from "./pages/Approvals";
import FinancePage from "./pages/Finance";
import SuperAdminControl from "./pages/SuperAdminControl";
import ImportsPage from "./pages/Imports";
import Layout from "./components/Layout";

function Protected({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function DriverProfileRedirect() {
  const { driverId } = useParams();
  return <Navigate to={`/employees/${driverId || ""}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />

      <Route
        path="/*"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="employees/:employeeId" element={<EmployeeProfile />} />
        <Route path="drivers" element={<Navigate to="/employees" replace />} />
        <Route path="drivers/:driverId" element={<DriverProfileRedirect />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="imports" element={<ImportsPage />} />
        <Route path="superadmin" element={<SuperAdminControl />} />
      </Route>
    </Routes>
  );
}
