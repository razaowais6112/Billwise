import { RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { money } from "../lib/formatters";
import { api } from "../lib/tauri";
import type { Payment } from "../types";

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [mode, setMode] = useState("");

  async function load() {
    setPayments(await api.listPayments({ mode }));
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <PageHeader title="Payments" description="Review received payments and remove mistaken entries." actions={<button className="btn" onClick={load}><RefreshCw size={16} /> Refresh</button>} />
      <section className="panel overflow-hidden">
        <div className="flex gap-2 border-b border-line p-3">
          <select className="field max-w-56" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="">All modes</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </select>
          <button className="btn" onClick={load}>Filter</button>
        </div>
        <table className="table w-full">
          <thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Mode</th><th>Amount</th><th /></tr></thead>
          <tbody>{payments.map((payment) => <tr key={payment.id}><td>{payment.paymentDate}</td><td>{payment.invoiceId ? <Link className="text-brand font-semibold" to={`/invoices/${payment.invoiceId}`}>{payment.invoiceNumber}</Link> : null}</td><td>{payment.customerName}</td><td>{payment.paymentMode}</td><td>{money(payment.amount)}</td><td className="text-right"><button className="btn" onClick={async () => { await api.deletePayment(payment.id); await load(); }}><Trash2 size={16} /> Delete</button></td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}
