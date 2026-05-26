import { Ban, CreditCard, Printer } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { NumberField } from "../components/common/NumberField";
import { PageHeader } from "../components/common/PageHeader";
import { StatusBadge } from "../components/common/StatusBadge";
import { money, today } from "../lib/formatters";
import { api } from "../lib/tauri";
import type { InvoiceDetail, PaymentMode, Settings } from "../types";

export function InvoicePreviewPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<InvoiceDetail>();
  const [settings, setSettings] = useState<Settings>();
  const [amount, setAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [message, setMessage] = useState("");
  const logoUrl = useMemo(() => api.logoUrl(settings?.logoPath), [settings?.logoPath]);
  const showDiscount = invoice?.items.some((item) => item.discountAmount > 0) ?? false;
  const showTax = invoice?.items.some((item) => item.taxAmount > 0 || item.taxRate > 0) ?? false;
  const taggedAdvancePayment = invoice?.payments
    .filter((payment) => payment.notes === "Advance payment")
    .reduce((sum, payment) => sum + payment.amount, 0) ?? 0;
  const advancePayment = taggedAdvancePayment || invoice?.payments[0]?.amount || 0;
  const otherPayments = Math.max((invoice?.paidAmount ?? 0) - advancePayment, 0);
  const showPaidLine = invoice ? invoice.paidAmount > 0 && advancePayment === 0 && otherPayments === 0 : false;
  const watermarkText = settings?.businessName?.trim() || "Billwise";
  const showWatermark = settings?.watermarkEnabled ?? false;
  const useLogoWatermark = showWatermark && settings?.watermarkType === "business_logo" && Boolean(logoUrl);

  async function load() {
    if (!id) return;
    const [invoiceRow, settingsRow] = await Promise.all([api.getInvoice(Number(id)), api.getSettings()]);
    setInvoice(invoiceRow);
    setSettings(settingsRow);
    setAmount(Math.max(invoiceRow.balanceAmount, 0));
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function recordPayment(event: FormEvent) {
    event.preventDefault();
    if (!invoice) return;
    setMessage("");
    if (amount <= 0 || amount > invoice.balanceAmount) return setMessage("Payment amount cannot be greater than invoice balance.");
    setInvoice(await api.recordPayment({ invoiceId: invoice.id, amount, paymentMode, paymentDate: today() }));
  }

  if (!invoice) return <div className="panel p-4">Loading invoice...</div>;

  return (
    <>
      <PageHeader
        title={invoice.invoiceNumber}
        description="Printable invoice preview with payment controls."
        actions={
          <>
            <button className="btn" onClick={() => window.print()}><Printer size={16} /> Print / Save PDF</button>
            {invoice.status !== "cancelled" ? <button className="btn btn-danger" onClick={async () => { await api.cancelInvoice(invoice.id); await load(); }}><Ban size={16} /> Cancel</button> : null}
          </>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="invoice-print panel overflow-hidden bg-white">
          <div className="invoice-document">
            {showWatermark ? (
              <div className={`invoice-watermark ${useLogoWatermark ? "invoice-watermark-logo" : "invoice-watermark-text"}`} aria-hidden>
                {useLogoWatermark ? <img src={logoUrl} alt="" /> : watermarkText}
              </div>
            ) : null}
            <div className="invoice-brand-row">
              <div className="invoice-brand">
                {logoUrl ? (
                  <img className="invoice-logo" src={logoUrl} alt={`${settings?.businessName || "Business"} logo`} />
                ) : (
                  <div className="invoice-logo-fallback">{(settings?.businessName || "Billwise").slice(0, 2).toUpperCase()}</div>
                )}
                <div>
                  <h2>{settings?.businessName || "Billwise"}</h2>
                  <p className="whitespace-pre-line">{settings?.businessAddress}</p>
                  <p>{[settings?.businessPhone, settings?.businessEmail].filter(Boolean).join(" | ")}</p>
                  {settings?.businessGstin ? <p>GSTIN: {settings.businessGstin}</p> : null}
                </div>
              </div>
              <div className="invoice-title-block">
                <p>{showTax ? "Tax Invoice" : "Invoice"}</p>
                <h1>{invoice.invoiceNumber}</h1>
                <StatusBadge status={invoice.status} />
              </div>
            </div>

            <div className="invoice-info-grid">
              <div>
                <p className="invoice-eyebrow">Bill to</p>
                <h3>{invoice.customerNameSnapshot}</h3>
                <p className="whitespace-pre-line">{invoice.customerAddressSnapshot}</p>
                <p>{invoice.customerPhoneSnapshot}</p>
                {invoice.customerGstinSnapshot ? <p>GSTIN: {invoice.customerGstinSnapshot}</p> : null}
              </div>
              <div className="invoice-meta">
                <Meta label="Invoice date" value={invoice.invoiceDate} />
                <Meta label="Invoice number" value={invoice.invoiceNumber} />
                <Meta label="Payment status" value={invoice.status.replace("_", " ")} />
                <Meta label="Balance due" value={money(invoice.balanceAmount)} strong />
              </div>
            </div>

            <table className="invoice-table">
              <thead><tr><th>Item</th><th>Qty</th><th>Rate</th>{showDiscount ? <th>Discount</th> : null}{showTax ? <th>Tax</th> : null}<th>Total</th></tr></thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.itemName}</strong>
                      {item.description ? <span>{item.description}</span> : null}
                    </td>
                    <td>{item.quantity} {item.unit}</td>
                    <td>{money(item.unitPrice)}</td>
                    {showDiscount ? <td>{money(item.discountAmount)}</td> : null}
                    {showTax ? <td>{money(item.taxAmount)}</td> : null}
                    <td>{money(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="invoice-bottom-grid">
              <div className="invoice-notes">
                <p className="invoice-eyebrow">Notes</p>
                <p>{invoice.notes || settings?.defaultInvoiceNotes || "Thank you for your business."}</p>
              </div>
              <div className="invoice-total-card">
                <Line label="Subtotal" value={money(invoice.subtotal)} />
                {showDiscount ? <Line label="Discount" value={money(invoice.discountAmount)} /> : null}
                {showTax ? <Line label="Tax" value={money(invoice.taxAmount)} /> : null}
                <Line label="Total" value={money(invoice.totalAmount)} strong />
                {advancePayment > 0 ? <Line label="Advance Payment" value={money(advancePayment)} /> : null}
                {otherPayments > 0 ? <Line label="Other Payments" value={money(otherPayments)} /> : null}
                {showPaidLine ? <Line label="Paid" value={money(invoice.paidAmount)} /> : null}
                <Line label="Balance Due" value={money(invoice.balanceAmount)} strong />
              </div>
            </div>

            <div className="invoice-footer">
              <span>{settings?.businessName || "Billwise"}</span>
              <span>{settings?.businessEmail || settings?.businessPhone || "Generated with Billwise"}</span>
            </div>
          </div>
        </section>
        <aside className="no-print space-y-5">
          <form className="panel p-4" onSubmit={recordPayment}>
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><CreditCard size={18} /> Add payment</h2>
            <label className="block"><span className="label">amount</span><NumberField min={0} step={0.01} value={amount} onChange={setAmount} /></label>
            <label className="mt-3 block"><span className="label">mode</span><select className="field mt-1" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="cheque">Cheque</option><option value="other">Other</option></select></label>
            {message ? <p className="mt-3 text-sm text-danger">{message}</p> : null}
            <button className="btn btn-primary mt-4 w-full" disabled={invoice.status === "paid" || invoice.status === "cancelled"} type="submit">Record Payment</button>
          </form>
          <section className="panel p-4">
            <h2 className="mb-3 font-semibold">Payments</h2>
            <div className="space-y-2">{invoice.payments.map((payment) => <div className="rounded-md border border-line p-2 text-sm" key={payment.id}><div className="flex justify-between"><span>{payment.paymentDate}</span><strong>{money(payment.amount)}</strong></div><p className="text-muted">{payment.paymentMode}</p></div>)}</div>
          </section>
        </aside>
      </div>
    </>
  );
}

function Meta({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div><span>{label}</span><strong className={strong ? "text-brand" : ""}>{value}</strong></div>;
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-6 ${strong ? "border-t border-line pt-2 text-base font-bold" : ""}`}><span>{label}</span><span>{value}</span></div>;
}
