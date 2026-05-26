import { Image, Save, Upload, X } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { NumberField } from "../components/common/NumberField";
import { PageHeader } from "../components/common/PageHeader";
import { api } from "../lib/tauri";
import type { Settings } from "../types";

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings>();
  const [message, setMessage] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void api.getSettings().then(setSettings);
  }, []);

  const logoUrl = useMemo(() => api.logoUrl(settings?.logoPath), [settings?.logoPath]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setSettings(await api.updateSettings(settings));
    setMessage("Settings saved.");
  }

  function chooseLogo() {
    setMessage("");
    logoInputRef.current?.click();
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setMessage("");
    try {
      const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
      setSettings(await api.saveBusinessLogo(file.name, bytes));
      setMessage("Logo saved.");
    } catch (error) {
      setMessage(String(error));
    }
  }

  async function removeLogo() {
    setMessage("");
    try {
      setSettings(await api.removeBusinessLogo());
      setMessage("Logo removed.");
    } catch (error) {
      setMessage(String(error));
    }
  }

  if (!settings) return <div className="panel p-4">Loading settings...</div>;

  return (
    <>
      <PageHeader title="Settings" description="Business profile, invoice numbering, currency, tax, and default notes." />
      <form className="grid max-w-6xl gap-5 xl:grid-cols-[1fr_320px]" onSubmit={submit}>
        <section className="panel p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="business name" value={settings.businessName} onChange={(businessName) => setSettings({ ...settings, businessName })} />
            <Input label="phone" value={settings.businessPhone} onChange={(businessPhone) => setSettings({ ...settings, businessPhone })} />
            <Input label="email" value={settings.businessEmail} onChange={(businessEmail) => setSettings({ ...settings, businessEmail })} />
            <Input label="GSTIN" value={settings.businessGstin} onChange={(businessGstin) => setSettings({ ...settings, businessGstin })} />
            <Input label="invoice prefix" value={settings.invoicePrefix} onChange={(invoicePrefix) => setSettings({ ...settings, invoicePrefix })} />
            <Input label="currency" value={settings.currency} onChange={(currency) => setSettings({ ...settings, currency })} />
            <label><span className="label">next invoice number</span><NumberField min={1} step={1} value={settings.nextInvoiceNumber} onChange={(nextInvoiceNumber) => setSettings({ ...settings, nextInvoiceNumber })} /></label>
            <label><span className="label">default tax rate</span><NumberField min={0} max={100} step={0.01} value={settings.defaultTaxRate} onChange={(defaultTaxRate) => setSettings({ ...settings, defaultTaxRate })} /></label>
          </div>
          <label className="mt-3 block"><span className="label">business address</span><textarea className="field mt-1 min-h-24" value={settings.businessAddress ?? ""} onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })} /></label>
          <label className="mt-3 block"><span className="label">default invoice notes</span><textarea className="field mt-1 min-h-24" value={settings.defaultInvoiceNotes ?? ""} onChange={(e) => setSettings({ ...settings, defaultInvoiceNotes: e.target.value })} /></label>
          <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.taxEnabled} onChange={(e) => setSettings({ ...settings, taxEnabled: e.target.checked })} /> Enable tax by default</label>
        </section>
        <aside className="panel h-fit p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Image size={18} /> Business logo</h2>
          <input
            ref={logoInputRef}
            className="hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={uploadLogo}
          />
          <div className="flex h-36 items-center justify-center rounded-md border border-dashed border-line bg-surface">
            {logoUrl ? (
              <img className="max-h-28 max-w-56 object-contain" src={logoUrl} alt="Business logo preview" />
            ) : (
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-line bg-white text-muted">
                  <Image size={22} />
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">No logo selected</p>
              </div>
            )}
          </div>
          <div className="mt-3 grid gap-2">
            <button className="btn" type="button" onClick={chooseLogo}><Upload size={16} /> {logoUrl ? "Replace Logo" : "Upload Logo"}</button>
            <button className="btn" type="button" onClick={removeLogo} disabled={!settings.logoPath}><X size={16} /> Remove Logo</button>
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.watermarkEnabled}
                onChange={(event) => setSettings({ ...settings, watermarkEnabled: event.target.checked })}
              />
              Enable invoice watermark
            </label>
            {settings.watermarkEnabled && logoUrl ? (
              <label className="mt-3 block">
                <span className="label">watermark source</span>
                <select
                  className="field mt-1"
                  value={settings.watermarkType}
                  onChange={(event) => setSettings({ ...settings, watermarkType: event.target.value as Settings["watermarkType"] })}
                >
                  <option value="business_logo">Business logo</option>
                  <option value="business_name">Business name</option>
                </select>
              </label>
            ) : null}
            {settings.watermarkEnabled && !logoUrl ? (
              <p className="mt-2 text-sm text-muted">Business name will be used as the watermark.</p>
            ) : null}
          </div>
        </aside>
        <div className="xl:col-span-2">
          {message ? <p className="text-sm text-positive">{message}</p> : null}
          <button className="btn btn-primary mt-4" type="submit"><Save size={16} /> Save Settings</button>
        </div>
      </form>
    </>
  );
}

function Input({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return <label><span className="label">{label}</span><input className="field mt-1" value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}
