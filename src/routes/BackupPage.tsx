import { ArchiveRestore, Database, RefreshCw } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "../components/common/PageHeader";
import { api } from "../lib/tauri";
import type { DatabaseInfo } from "../types";

export function BackupPage() {
  const [info, setInfo] = useState<DatabaseInfo>();
  const [targetFolder, setTargetFolder] = useState("");
  const [sourceFile, setSourceFile] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setInfo(await api.getDatabaseInfo());
  }

  useEffect(() => {
    void load();
  }, []);

  async function backup(event: FormEvent) {
    event.preventDefault();
    const result = await api.createBackup(targetFolder);
    setMessage(`Backup created: ${result.backupPath}`);
  }

  async function restore(event: FormEvent) {
    event.preventDefault();
    const confirmed = window.confirm("Restore will replace the current Billwise database after creating a safety backup.");
    if (!confirmed) return;
    const result = await api.restoreBackup(sourceFile);
    setMessage(`Database restored. Safety backup: ${result.safetyBackupPath}`);
  }

  return (
    <>
      <PageHeader title="Backup & Restore" description="Create local database backups and restore validated backup files." actions={<button className="btn" onClick={load}><RefreshCw size={16} /> Refresh</button>} />
      <section className="panel mb-5 p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><Database size={18} /> Database</h2>
        <p className="break-all text-sm"><strong>Path:</strong> {info?.databasePath}</p>
        <p className="break-all text-sm text-muted"><strong>App data:</strong> {info?.appDataDir}</p>
      </section>
      <div className="grid gap-5 md:grid-cols-2">
        <form className="panel p-4" onSubmit={backup}>
          <h2 className="mb-3 font-semibold">Create backup</h2>
          <label><span className="label">target folder path</span><input className="field mt-1" value={targetFolder} onChange={(e) => setTargetFolder(e.target.value)} placeholder="C:\\Users\\You\\Documents" /></label>
          <button className="btn btn-primary mt-4" type="submit"><ArchiveRestore size={16} /> Create Backup</button>
        </form>
        <form className="panel p-4" onSubmit={restore}>
          <h2 className="mb-3 font-semibold">Restore backup</h2>
          <label><span className="label">source .db file path</span><input className="field mt-1" value={sourceFile} onChange={(e) => setSourceFile(e.target.value)} placeholder="C:\\Backups\\billing-backup.db" /></label>
          <button className="btn btn-danger mt-4" type="submit">Restore Backup</button>
        </form>
      </div>
      {message ? <div className="panel mt-5 p-4 text-sm text-positive">{message}</div> : null}
    </>
  );
}
