import {
  ArchiveRestore,
  BarChart3,
  Boxes,
  CreditCard,
  FileText,
  Gauge,
  PlusCircle,
  Settings,
  Users
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const items = [
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/backup", label: "Backup & Restore", icon: ArchiveRestore }
];

export function Sidebar() {
  const location = useLocation();
  const invoicePath = location.pathname.startsWith("/invoices");
  const invoiceListActive = location.pathname === "/invoices" || (/^\/invoices\/\d+$/.test(location.pathname));
  const createInvoiceActive = location.pathname === "/invoices/new";

  return (
    <aside className="app-sidebar flex min-h-screen w-64 shrink-0 flex-col border-r border-line bg-white">
      <div className="border-b border-line px-5 py-5">
        <p className="text-xl font-bold text-ink">Billwise</p>
        <p className="text-xs text-muted">Streamlined desktop invoicing</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold ${
              isActive ? "bg-brand text-white" : "text-ink hover:bg-surface"
            }`
          }
        >
          <Gauge size={18} aria-hidden />
          Dashboard
        </NavLink>
        <NavLink
          to="/customers"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold ${
              isActive ? "bg-brand text-white" : "text-ink hover:bg-surface"
            }`
          }
        >
          <Users size={18} aria-hidden />
          Customers
        </NavLink>
        <NavLink
          to="/products"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold ${
              isActive ? "bg-brand text-white" : "text-ink hover:bg-surface"
            }`
          }
        >
          <Boxes size={18} aria-hidden />
          Products & Services
        </NavLink>
        <div className={invoicePath ? "rounded-md bg-surface/70 p-1" : "p-1"}>
          <NavLink
            to="/invoices"
            className={() =>
              `flex items-center gap-3 rounded-md px-2 py-2 text-sm font-semibold ${
                invoiceListActive ? "bg-brand text-white" : "text-ink hover:bg-white"
              }`
            }
          >
            <FileText size={18} aria-hidden />
            Invoices
          </NavLink>
          <NavLink
            to="/invoices/new"
            className={() =>
              `mt-1 flex items-center gap-2 rounded-md py-2 pl-9 pr-2 text-sm font-semibold ${
                createInvoiceActive ? "bg-brand text-white" : "text-muted hover:bg-white hover:text-ink"
              }`
            }
          >
            <PlusCircle size={16} aria-hidden />
            Create Invoice
          </NavLink>
        </div>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold ${
                isActive ? "bg-brand text-white" : "text-ink hover:bg-surface"
              }`
            }
          >
            <item.icon size={18} aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
