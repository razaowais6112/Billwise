import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "../components/common/PageHeader";
import { money, today } from "../lib/formatters";
import { api } from "../lib/tauri";
import type { PendingPayment, SalesReport } from "../types";

export function ReportsPage() {
  const [from, setFrom] = useState(today().slice(0, 8) + "01");
  const [to, setTo] = useState(today());
  const [report, setReport] = useState<SalesReport>();
  const [pending, setPending] = useState<PendingPayment[]>([]);

  async function load() {
    const [sales, pendingRows] = await Promise.all([api.getSalesReport({ from, to }), api.getPendingPaymentsReport()]);
    setReport(sales);
    setPending(pendingRows);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <PageHeader title="Reports" description="Sales totals, collections, and customer-wise billing." actions={<button className="btn" onClick={load}><RefreshCw size={16} /> Refresh</button>} />
      <div className="mb-5 flex gap-2">
        <input className="field max-w-48" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className="field max-w-48" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Sales", value: money(report?.totalSales) },
          { label: "Paid", value: money(report?.totalPaid) },
          { label: "Pending", value: money(report?.pendingAmount) },
          { label: "Invoices", value: String(report?.invoiceCount ?? 0) }
        ].map(({ label, value }) => (
          <div className="panel p-4" key={label}><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="panel overflow-hidden">
          <div className="border-b border-line p-4 font-semibold">Customer-wise sales</div>
          <table className="table w-full"><thead><tr><th>Customer</th><th>Invoices</th><th>Sales</th></tr></thead><tbody>{report?.customerWiseSales.map((row) => <tr key={row.customerName}><td>{row.customerName}</td><td>{row.invoiceCount}</td><td>{money(row.totalSales)}</td></tr>)}</tbody></table>
        </section>
        <section className="panel overflow-hidden">
          <div className="border-b border-line p-4 font-semibold">Pending payments</div>
          <table className="table w-full"><thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Balance</th></tr></thead><tbody>{pending.map((row) => <tr key={row.invoiceId}><td>{row.invoiceNumber}</td><td>{row.customerName}</td><td>{row.invoiceDate}</td><td>{money(row.balanceAmount)}</td></tr>)}</tbody></table>
        </section>
      </div>
    </>
  );
}
