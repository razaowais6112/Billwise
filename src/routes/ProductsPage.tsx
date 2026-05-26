import { Boxes, RefreshCw, Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { NumberField } from "../components/common/NumberField";
import { PageHeader } from "../components/common/PageHeader";
import { money } from "../lib/formatters";
import { api } from "../lib/tauri";
import type { Product } from "../types";

const empty: Partial<Product> = { name: "", description: "", type: "product", unit: "pcs", price: 0, taxRate: 0 };

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<Partial<Product>>(empty);
  const [editingId, setEditingId] = useState<number>();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setProducts(await api.listProducts(query));
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!form.name?.trim()) return setMessage("Product/service name is required.");
    if ((form.price ?? 0) < 0) return setMessage("Price must be 0 or greater.");
    if ((form.taxRate ?? 0) < 0 || (form.taxRate ?? 0) > 100) return setMessage("Tax rate must be between 0 and 100.");
    if (editingId) await api.updateProduct({ id: editingId, input: form });
    else await api.createProduct(form);
    setForm(empty);
    setEditingId(undefined);
    await load();
  }

  return (
    <>
      <PageHeader title="Products & Services" description="Reusable billing items with prices, units, and tax rates." actions={<button className="btn" onClick={load}><RefreshCw size={16} /> Refresh</button>} />
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <form className="panel p-4" onSubmit={submit}>
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><Boxes size={18} /> {editingId ? "Edit item" : "Add item"}</h2>
          <label className="mb-3 block"><span className="label">name</span><input className="field mt-1" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="mb-3 block"><span className="label">type</span><select className="field mt-1" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Product["type"] })}><option value="product">Product</option><option value="service">Service</option></select></label>
          <div className="grid grid-cols-3 gap-2">
            <label className="mb-3 block"><span className="label">unit</span><input className="field mt-1" value={form.unit ?? ""} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label>
            <label className="mb-3 block"><span className="label">price</span><NumberField min={0} step={0.01} value={form.price ?? 0} onChange={(price) => setForm({ ...form, price })} /></label>
            <label className="mb-3 block"><span className="label">tax %</span><NumberField min={0} max={100} step={0.01} value={form.taxRate ?? 0} onChange={(taxRate) => setForm({ ...form, taxRate })} /></label>
          </div>
          <label className="mb-3 block"><span className="label">description</span><textarea className="field mt-1 min-h-20" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          {message ? <p className="mb-3 text-sm text-danger">{message}</p> : null}
          <button className="btn btn-primary" type="submit"><Save size={16} /> Save Item</button>
        </form>
        <section className="panel overflow-hidden">
          <div className="flex gap-2 border-b border-line p-3"><input className="field" placeholder="Search items" value={query} onChange={(e) => setQuery(e.target.value)} /><button className="btn" onClick={load}>Search</button></div>
          <table className="table w-full">
            <thead><tr><th>Name</th><th>Type</th><th>Unit</th><th>Price</th><th>Tax</th><th /></tr></thead>
            <tbody>{products.map((product) => <tr key={product.id} className={!product.isActive ? "opacity-50" : ""}><td>{product.name}</td><td>{product.type}</td><td>{product.unit}</td><td>{money(product.price)}</td><td>{product.taxRate}%</td><td className="text-right"><button className="btn mr-2" onClick={() => { setEditingId(product.id); setForm(product); }}>Edit</button><button className="btn" onClick={async () => { await api.deactivateProduct(product.id); await load(); }}>Deactivate</button></td></tr>)}</tbody>
          </table>
        </section>
      </div>
    </>
  );
}
