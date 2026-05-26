import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { BackupPage } from "./routes/BackupPage";
import { CustomersPage } from "./routes/CustomersPage";
import { DashboardPage } from "./routes/DashboardPage";
import { InvoicePreviewPage } from "./routes/InvoicePreviewPage";
import { InvoicesPage } from "./routes/InvoicesPage";
import { PaymentsPage } from "./routes/PaymentsPage";
import { ProductsPage } from "./routes/ProductsPage";
import { ReportsPage } from "./routes/ReportsPage";
import { SettingsPage } from "./routes/SettingsPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/new" element={<InvoicesPage mode="create" />} />
        <Route path="/invoices/:id" element={<InvoicePreviewPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/backup" element={<BackupPage />} />
      </Routes>
    </AppShell>
  );
}
