import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="app-content min-w-0 flex-1 p-5">
        <div className="app-topbar mb-4 flex items-center justify-between border-b border-line pb-4">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">Offline desktop invoicing</p>
            <p className="text-sm text-ink">Billwise keeps your billing data on this computer.</p>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
