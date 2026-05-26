import { FilePlus, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { StatusBadge } from "../components/common/StatusBadge";
import { money } from "../lib/formatters";
import { api } from "../lib/tauri";
import type { DashboardSummary } from "../types";

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>();
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      setSummary(await api.getDashboardSummary());
    } catch (err) {
      setError(String(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A quick view of sales, pending payments, and recent invoices."
        actions={
          <>
            <button className="btn" onClick={load}>
              <RefreshCw size={16} /> Refresh
            </button>
            <Link className="btn btn-primary" to="/invoices/new">
              <FilePlus size={16} /> New Invoice
            </Link>
          </>
        }
      />
      {error ? <div className="panel mb-4 p-4 text-sm text-danger">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Today", value: money(summary?.todaysSales) },
          { label: "This Month", value: money(summary?.monthSales) },
          { label: "Pending", value: money(summary?.pendingAmount) },
          { label: "Invoices", value: String(summary?.totalInvoices ?? 0) }
        ].map(({ label, value }) => (
          <div className="panel p-4" key={label}>
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <section className="panel mt-5 overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-semibold">Recent invoices</h2>
        </div>
        <table className="table w-full">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(summary?.recentInvoices ?? []).map((invoice) => (
              <tr key={invoice.id}>
                <td>
                  <Link className="font-semibold text-brand" to={`/invoices/${invoice.id}`}>
                    {invoice.invoiceNumber}
                  </Link>
                </td>
                <td>{invoice.customerNameSnapshot}</td>
                <td>{invoice.invoiceDate}</td>
                <td>{money(invoice.totalAmount)}</td>
                <td>
                  <StatusBadge status={invoice.status} />
                </td>
              </tr>
            ))}
            {!summary?.recentInvoices?.length ? (
              <tr>
                <td colSpan={5} className="text-center text-muted">
                  No invoices yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
