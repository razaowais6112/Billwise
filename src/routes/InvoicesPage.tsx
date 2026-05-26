import { Plus, Printer, RefreshCw, Save, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { NumberField } from "../components/common/NumberField";
import { PageHeader } from "../components/common/PageHeader";
import { StatusBadge } from "../components/common/StatusBadge";
import { money, today } from "../lib/formatters";
import { api } from "../lib/tauri";
import type { CreateInvoiceItemInput, Customer, InvoiceListItem, PaymentMode, Product } from "../types";

const blankItem: CreateInvoiceItemInput = {
  itemName: "",
  quantity: 1,
  unit: "pcs",
  unitPrice: 0,
  discountAmount: 0,
  taxRate: 0
};

export function InvoicesPage({ mode = "list" }: { mode?: "list" | "create" }) {
  if (mode === "create") return <CreateInvoicePage />;
  return <InvoiceListPage />;
}

function InvoiceListPage() {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    setInvoices(await api.listInvoices({ query, status }));
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Search invoices, review balances, print, and cancel when needed."
        actions={
          <>
            <button className="btn" onClick={load}><RefreshCw size={16} /> Refresh</button>
            <Link className="btn btn-primary" to="/invoices/new"><Plus size={16} /> New Invoice</Link>
          </>
        }
      />
      <section className="panel overflow-hidden">
        <div className="grid gap-2 border-b border-line p-3 md:grid-cols-[1fr_180px_auto]">
          <input className="field" placeholder="Search invoice or customer" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="btn" onClick={load}>Search</button>
        </div>
        <table className="table w-full">
          <thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Total</th><th>Balance</th><th>Status</th><th /></tr></thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td><Link className="font-semibold text-brand" to={`/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link></td>
                <td>{invoice.customerNameSnapshot}</td>
                <td>{invoice.invoiceDate}</td>
                <td>{money(invoice.totalAmount)}</td>
                <td>{money(invoice.balanceAmount)}</td>
                <td><StatusBadge status={invoice.status} /></td>
                <td className="text-right"><Link className="btn" to={`/invoices/${invoice.id}`}><Printer size={16} /> View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function CreateInvoicePage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<CreateInvoiceItemInput[]>([{ ...blankItem }]);
  const [initialPayment, setInitialPayment] = useState(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void Promise.all([api.listCustomers(), api.listProducts()]).then(([customerRows, productRows]) => {
      setCustomers(customerRows.filter((row) => row.isActive));
      setProducts(productRows.filter((row) => row.isActive));
    });
  }, []);

  const totals = useMemo(() => {
    return items.reduce(
      (sum, item) => {
        const base = item.quantity * item.unitPrice;
        const taxable = Math.max(base - item.discountAmount, 0);
        const tax = taxable * item.taxRate / 100;
        return {
          subtotal: sum.subtotal + base,
          discount: sum.discount + item.discountAmount,
          tax: sum.tax + tax,
          total: sum.total + taxable + tax
        };
      },
      { subtotal: 0, discount: 0, tax: 0, total: 0 }
    );
  }, [items]);

  function selectCustomer(id: string) {
    setCustomerId(id);
    const customer = customers.find((row) => row.id === Number(id));
    if (customer) {
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone ?? "");
      setCustomerAddress(customer.address ?? "");
    }
  }

  function selectProduct(index: number, id: string) {
    const product = products.find((row) => row.id === Number(id));
    if (!product) return;
    const next = [...items];
    next[index] = {
      ...next[index],
      productId: product.id,
      itemName: product.name,
      description: product.description,
      unit: product.unit,
      unitPrice: product.price,
      taxRate: product.taxRate
    };
    setItems(next);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, itemIndex) => itemIndex !== index));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!customerName.trim()) return setMessage("Customer name is required.");
    if (!items.length || items.some((item) => !item.itemName.trim() || item.quantity <= 0)) return setMessage("Every item needs a name and quantity.");
    if (initialPayment > totals.total) return setMessage("Advance payment cannot exceed invoice total.");
    const invoice = await api.createInvoice({
      customerId: customerId ? Number(customerId) : undefined,
      customerName,
      customerPhone,
      customerAddress,
      invoiceDate,
      notes,
      items,
      initialPayment: initialPayment > 0 ? { amount: initialPayment, paymentMode, paymentDate: invoiceDate } : undefined
    });
    navigate(`/invoices/${invoice.id}`);
  }

  return (
    <>
      <PageHeader title="Create Invoice" description="Create a bill with customer snapshots, item snapshots, and backend-calculated totals." />
      <form className="grid gap-5 xl:grid-cols-[1fr_320px]" onSubmit={submit}>
        <div className="space-y-5">
          <section className="panel p-4">
            <h2 className="mb-3 font-semibold">Customer</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label><span className="label">existing customer</span><select className="field mt-1" value={customerId} onChange={(e) => selectCustomer(e.target.value)}><option value="">Walk-in customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
              <label><span className="label">invoice date</span><input className="field mt-1" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></label>
              <label><span className="label">customer name</span><input className="field mt-1" value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></label>
              <label><span className="label">phone</span><input className="field mt-1" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></label>
            </div>
            <label className="mt-3 block"><span className="label">address</span><textarea className="field mt-1 min-h-20" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} /></label>
          </section>
          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-line p-4">
              <h2 className="font-semibold">Items</h2>
              <button type="button" className="btn" onClick={() => setItems([...items, { ...blankItem }])}><Plus size={16} /> Add Row</button>
            </div>
            <div className="space-y-3 p-4">
              <div className="hidden gap-2 px-3 text-xs font-semibold uppercase text-muted md:grid md:grid-cols-[1.2fr_1fr_80px_90px_90px_80px_40px]">
                <span>Product</span>
                <span>Item</span>
                <span>Qty</span>
                <span>Rate</span>
                <span>Discount</span>
                <span>Tax %</span>
                <span />
              </div>
              {items.map((item, index) => (
                <div className="grid gap-2 rounded-md border border-line p-3 md:grid-cols-[1.2fr_1fr_80px_90px_90px_80px_40px]" key={index}>
                  <label><span className="label md:hidden">product</span><select className="field mt-1 md:mt-0" onChange={(e) => selectProduct(index, e.target.value)} defaultValue=""><option value="">Manual item</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
                  <label><span className="label md:hidden">item</span><input className="field mt-1 md:mt-0" placeholder="Item name" value={item.itemName} onChange={(e) => setItems(items.map((row, i) => i === index ? { ...row, itemName: e.target.value } : row))} /></label>
                  <label><span className="label md:hidden">qty</span><NumberField className="field mt-1 md:mt-0" min={0.01} step={0.01} value={item.quantity} onChange={(quantity) => setItems(items.map((row, i) => i === index ? { ...row, quantity } : row))} /></label>
                  <label><span className="label md:hidden">rate</span><NumberField className="field mt-1 md:mt-0" min={0} step={0.01} value={item.unitPrice} onChange={(unitPrice) => setItems(items.map((row, i) => i === index ? { ...row, unitPrice } : row))} /></label>
                  <label><span className="label md:hidden">discount</span><NumberField className="field mt-1 md:mt-0" min={0} step={0.01} value={item.discountAmount} onChange={(discountAmount) => setItems(items.map((row, i) => i === index ? { ...row, discountAmount } : row))} /></label>
                  <label><span className="label md:hidden">tax %</span><NumberField className="field mt-1 md:mt-0" min={0} max={100} step={0.01} value={item.taxRate} onChange={(taxRate) => setItems(items.map((row, i) => i === index ? { ...row, taxRate } : row))} /></label>
                  <button
                    type="button"
                    className="btn h-10 px-0 text-danger disabled:text-muted"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                    title={items.length <= 1 ? "At least one item is required" : "Delete row"}
                    aria-label="Delete item row"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="panel h-fit p-4">
          <h2 className="mb-3 font-semibold">Totals</h2>
          <div className="space-y-2 text-sm"><Row label="Subtotal" value={money(totals.subtotal)} /><Row label="Discount" value={money(totals.discount)} /><Row label="Tax" value={money(totals.tax)} /><Row label="Total" value={money(totals.total)} strong /></div>
          <label className="mt-4 block"><span className="label">advance payment</span><NumberField min={0} step={0.01} value={initialPayment} onChange={setInitialPayment} /></label>
          <div className="mt-3 space-y-2 text-sm"><Row label="Balance after advance" value={money(Math.max(totals.total - initialPayment, 0))} strong /></div>
          <label className="mt-3 block"><span className="label">mode</span><select className="field mt-1" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="cheque">Cheque</option><option value="other">Other</option></select></label>
          <label className="mt-3 block"><span className="label">notes</span><textarea className="field mt-1 min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          {message ? <p className="mt-3 text-sm text-danger">{message}</p> : null}
          <button className="btn btn-primary mt-4 w-full" type="submit"><Save size={16} /> Save Invoice</button>
        </aside>
      </form>
    </>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between ${strong ? "border-t border-line pt-2 text-base font-bold" : ""}`}><span>{label}</span><span>{value}</span></div>;
}
