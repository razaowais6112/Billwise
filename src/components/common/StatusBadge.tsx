import type { InvoiceStatus } from "../../types";

const styles: Record<InvoiceStatus, string> = {
  paid: "bg-positive/10 text-positive",
  partial: "bg-warning/10 text-warning",
  unpaid: "bg-muted/10 text-muted",
  cancelled: "bg-danger/10 text-danger"
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}
