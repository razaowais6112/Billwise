export type InvoiceStatus = "paid" | "partial" | "unpaid" | "cancelled";
export type ProductType = "product" | "service";
export type PaymentMode = "cash" | "upi" | "card" | "bank_transfer" | "cheque" | "other";
export type WatermarkType = "business_name" | "business_logo";

export interface Settings {
  id: number;
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  businessGstin?: string;
  logoPath?: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  currency: string;
  taxEnabled: boolean;
  defaultTaxRate: number;
  defaultInvoiceNotes?: string;
  watermarkEnabled: boolean;
  watermarkType: WatermarkType;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  outstandingBalance?: number;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  type: ProductType;
  unit: string;
  price: number;
  taxRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: number;
  invoiceId: number;
  invoiceNumber?: string;
  customerName?: string;
  amount: number;
  paymentMode: PaymentMode;
  paymentDate: string;
  notes?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  productId?: number;
  itemName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  createdAt: string;
}

export interface InvoiceListItem {
  id: number;
  invoiceNumber: string;
  customerNameSnapshot: string;
  invoiceDate: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: InvoiceStatus;
}

export interface InvoiceDetail extends InvoiceListItem {
  customerId?: number;
  customerPhoneSnapshot?: string;
  customerAddressSnapshot?: string;
  customerGstinSnapshot?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  notes?: string;
  items: InvoiceItem[];
  payments: Payment[];
}

export interface CreateInvoiceItemInput {
  productId?: number;
  itemName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
}

export interface CreateInvoiceInput {
  customerId?: number;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGstin?: string;
  invoiceDate: string;
  notes?: string;
  items: CreateInvoiceItemInput[];
  initialPayment?: {
    amount: number;
    paymentMode: PaymentMode;
    paymentDate: string;
    notes?: string;
  };
}

export interface DashboardSummary {
  todaysSales: number;
  monthSales: number;
  pendingAmount: number;
  totalInvoices: number;
  recentInvoices: InvoiceListItem[];
}

export interface SalesReport {
  totalSales: number;
  totalPaid: number;
  pendingAmount: number;
  invoiceCount: number;
  customerWiseSales: Array<{ customerName: string; totalSales: number; invoiceCount: number }>;
}

export interface PendingPayment {
  invoiceId: number;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  balanceAmount: number;
}

export interface DatabaseInfo {
  databasePath: string;
  appDataDir: string;
  exists: boolean;
}

export interface BackupResult {
  backupPath: string;
}

export interface RestoreResult {
  restored: boolean;
  safetyBackupPath: string;
}
