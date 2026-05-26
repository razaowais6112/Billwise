import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import type {
  BackupResult,
  CreateInvoiceInput,
  Customer,
  DashboardSummary,
  DatabaseInfo,
  InvoiceDetail,
  InvoiceListItem,
  Payment,
  PaymentMode,
  PendingPayment,
  Product,
  RestoreResult,
  SalesReport,
  Settings
} from "../types";

type IdInput<T> = { id: number; input: T };

export const api = {
  getSettings: () => invoke<Settings>("get_settings"),
  updateSettings: (input: Partial<Settings>) => invoke<Settings>("update_settings", { input }),
  saveBusinessLogo: (fileName: string, bytes: number[]) =>
    invoke<Settings>("save_business_logo", { fileName, bytes }),
  removeBusinessLogo: () => invoke<Settings>("remove_business_logo"),
  logoUrl: (logoPath?: string) => logoPath ? convertFileSrc(logoPath) : "",

  listCustomers: (query = "") => invoke<Customer[]>("list_customers", { query }),
  getCustomer: (id: number) => invoke<Customer>("get_customer", { id }),
  createCustomer: (input: Partial<Customer>) => invoke<Customer>("create_customer", { input }),
  updateCustomer: ({ id, input }: IdInput<Partial<Customer>>) =>
    invoke<Customer>("update_customer", { id, input }),
  deactivateCustomer: (id: number) => invoke<void>("deactivate_customer", { id }),

  listProducts: (query = "") => invoke<Product[]>("list_products", { query }),
  getProduct: (id: number) => invoke<Product>("get_product", { id }),
  createProduct: (input: Partial<Product>) => invoke<Product>("create_product", { input }),
  updateProduct: ({ id, input }: IdInput<Partial<Product>>) =>
    invoke<Product>("update_product", { id, input }),
  deactivateProduct: (id: number) => invoke<void>("deactivate_product", { id }),

  listInvoices: (filters: Record<string, string> = {}) =>
    invoke<InvoiceListItem[]>("list_invoices", { filters }),
  getInvoice: (id: number) => invoke<InvoiceDetail>("get_invoice", { id }),
  createInvoice: (input: CreateInvoiceInput) => invoke<InvoiceDetail>("create_invoice", { input }),
  cancelInvoice: (id: number) => invoke<void>("cancel_invoice", { id }),

  listPayments: (filters: Record<string, string> = {}) => invoke<Payment[]>("list_payments", { filters }),
  recordPayment: (input: { invoiceId: number; amount: number; paymentMode: PaymentMode; paymentDate: string; notes?: string }) =>
    invoke<InvoiceDetail>("record_payment", { input }),
  deletePayment: (id: number) => invoke<InvoiceDetail>("delete_payment", { id }),

  getDashboardSummary: () => invoke<DashboardSummary>("get_dashboard_summary"),
  getSalesReport: (filters: Record<string, string>) => invoke<SalesReport>("get_sales_report", { filters }),
  getPendingPaymentsReport: () => invoke<PendingPayment[]>("get_pending_payments_report"),

  getDatabaseInfo: () => invoke<DatabaseInfo>("get_database_info"),
  createBackup: (targetFolderPath: string) => invoke<BackupResult>("create_backup", { targetFolderPath }),
  restoreBackup: (sourceFilePath: string) => invoke<RestoreResult>("restore_backup", { sourceFilePath })
};
