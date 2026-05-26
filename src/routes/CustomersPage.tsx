import { RefreshCw, Save, UserPlus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "../components/common/PageHeader";
import { api } from "../lib/tauri";
import type { Customer } from "../types";

const empty = { name: "", phone: "", email: "", address: "", gstin: "" };

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<Partial<Customer>>(empty);
  const [editingId, setEditingId] = useState<number>();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setCustomers(await api.listCustomers(query));
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!form.name?.trim()) {
      setMessage("Customer name is required.");
      return;
    }
    if (editingId) await api.updateCustomer({ id: editingId, input: form });
    else await api.createCustomer(form);
    setForm(empty);
    setEditingId(undefined);
    await load();
  }

  return (
    <>
      <PageHeader
        title="Customers"
        description="Create customer records and keep billing details handy."
        actions={<button className="btn" onClick={load}><RefreshCw size={16} /> Refresh</button>}
      />
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <form className="panel p-4" onSubmit={submit}>
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <UserPlus size={18} /> {editingId ? "Edit customer" : "Add customer"}
          </h2>
          {["name", "phone", "email", "gstin"].map((key) => (
            <label className="mb-3 block" key={key}>
              <span className="label">{key}</span>
              <input className="field mt-1" value={String(form[key as keyof Customer] ?? "")} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            </label>
          ))}
          <label className="mb-3 block">
            <span className="label">address</span>
            <textarea className="field mt-1 min-h-24" value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          {message ? <p className="mb-3 text-sm text-danger">{message}</p> : null}
          <button className="btn btn-primary" type="submit">
            <Save size={16} /> Save Customer
          </button>
        </form>
        <section className="panel overflow-hidden">
          <div className="flex gap-2 border-b border-line p-3">
            <input className="field" placeholder="Search customers" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="btn" onClick={load}>Search</button>
          </div>
          <table className="table w-full">
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>GSTIN</th><th /></tr></thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className={!customer.isActive ? "opacity-50" : ""}>
                  <td>{customer.name}</td><td>{customer.phone}</td><td>{customer.email}</td><td>{customer.gstin}</td>
                  <td className="text-right">
                    <button className="btn mr-2" onClick={() => { setEditingId(customer.id); setForm(customer); }}>Edit</button>
                    <button className="btn" onClick={async () => { await api.deactivateCustomer(customer.id); await load(); }}>Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
