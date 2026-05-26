# Codex Implementation Brief: Local Windows Billing App

## 1. Project Goal

Build a lightweight offline-first billing application that can be installed on Windows and used by small businesses to create invoices, manage customers, manage products/services, record payments, print/export invoices, and view basic reports.

This is not a SaaS product in phase 1. It should run locally on the user’s Windows machine with a local SQLite database.

## 2. Product Scope

### App Type

Local desktop application for Windows.

### Target Users

- Small shops
- Freelancers
- Repair/service businesses
- Local wholesalers
- Coaching centers
- Home businesses
- Small offices that need simple billing without heavy accounting software

### Core Problem

Users need a simple way to:

1. Create bills quickly.
2. Save customer and product/service records.
3. Track paid, partial, and unpaid invoices.
4. Print or export invoice PDFs.
5. See basic sales and pending payment reports.
6. Keep all data locally on their machine.

## 3. Recommended Tech Stack

### Desktop Framework

Use:

```txt
Tauri v2 + React + TypeScript
```

Reason:

- Lightweight compared to Electron.
- Generates installable Windows desktop app.
- Allows using the Stitch-generated UI as React components.
- Supports local filesystem and native desktop integration.
- Rust backend commands can handle local app operations safely.

### Frontend

Use:

```txt
React + TypeScript + Tailwind CSS
```

Recommended UI libraries:

```txt
shadcn/ui
lucide-react
react-hook-form
zod
tanstack/react-query
```

### Local Database

Use:

```txt
SQLite
```

Recommended options:

Option A — Preferred:

```txt
Rust backend with sqlx + SQLite
```

Option B:

```txt
Tauri SQL plugin with SQLite
```

Use SQLite because:

- It is local.
- No separate DB server is required.
- Easy to backup and restore.
- Good enough for small business billing data.
- Works well for a Windows desktop app.

### PDF/Print

Use invoice HTML preview and browser print API first.

Later PDF export can be implemented with:

```txt
window.print()
```

or a Rust-side PDF generation library if needed.

For MVP, implement:

```txt
Invoice Preview -> Print -> Save as PDF using Windows print dialog
```

This avoids unnecessary complexity.

## 4. Windows App Strategy

The final app should be packaged as a Windows installer using Tauri.

Expected build command:

```bash
npm run tauri build
```

or if using pnpm:

```bash
pnpm tauri build
```

The output should include a Windows installer/build artifact under the Tauri target/release/bundle directory.

### Important Packaging Requirements

Codex should configure:

```txt
src-tauri/tauri.conf.json
```

with:

- App name
- App identifier
- Window title
- App icon placeholder
- Windows bundle configuration
- File permissions required for local database and backup files

### App Install Location

The user installs the app like a normal Windows application.

### Local Data Location

Do not store the SQLite database beside the executable.

Store app data in the OS-specific application data directory.

For Windows, the database should be stored under a path similar to:

```txt
C:\Users\<username>\AppData\Roaming\<AppName>\billing.db
```

or the Tauri app data directory equivalent.

The exact path should be resolved using Tauri/Rust app path APIs, not hardcoded.

## 5. Local Database Behavior

### Database File

Use a single SQLite database file:

```txt
billing.db
```

### Database Initialization

On first app launch:

1. Check if the app data directory exists.
2. Create the directory if missing.
3. Check if `billing.db` exists.
4. If not, create it.
5. Run database migrations.
6. Insert default settings if missing.

### Migration Strategy

Create a simple migration system.

Recommended folder:

```txt
src-tauri/migrations
```

Initial migration:

```txt
001_initial_schema.sql
```

Codex should ensure migrations are idempotent or tracked using a schema_migrations table.

### Backup Strategy

MVP backup should be simple:

- User clicks “Create Backup”.
- App copies `billing.db` to a selected folder.
- Backup filename format:

```txt
billing-backup-YYYY-MM-DD-HH-mm.db
```

Restore flow:

- User selects a `.db` backup file.
- App validates it has required tables.
- App replaces current DB after creating a safety backup.
- App restarts or reloads.

Do not implement cloud backup in MVP.

## 6. MVP Feature Scope

Build only these modules in phase 1:

1. Dashboard
2. Business Settings
3. Customers
4. Products/Services
5. Invoices
6. Payments
7. Invoice Preview/Print
8. Basic Reports
9. Backup/Restore

Do not build in MVP:

- Cloud sync
- Multi-user login
- Full accounting
- GST filing
- Inventory stock management
- WhatsApp automation
- Email sending
- Vendor/purchase management
- Role-based permissions
- Online subscription system

## 7. App Navigation

Use a left sidebar layout.

Main routes:

```txt
/dashboard
/customers
/products
/invoices
/invoices/new
/invoices/:id
/payments
/reports
/settings
/backup
```

Sidebar items:

1. Dashboard
2. Customers
3. Products & Services
4. Invoices
5. Payments
6. Reports
7. Settings
8. Backup & Restore

## 8. Database Schema

Use SQLite.

### 8.1 schema_migrations

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 8.2 settings

```sql
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    business_name TEXT,
    business_phone TEXT,
    business_email TEXT,
    business_address TEXT,
    business_gstin TEXT,
    logo_path TEXT,
    invoice_prefix TEXT NOT NULL DEFAULT 'INV',
    next_invoice_number INTEGER NOT NULL DEFAULT 1,
    currency TEXT NOT NULL DEFAULT 'INR',
    tax_enabled INTEGER NOT NULL DEFAULT 0,
    default_tax_rate REAL NOT NULL DEFAULT 0,
    default_invoice_notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 8.3 customers

```sql
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
```

### 8.4 products

```sql
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'product',
    unit TEXT NOT NULL DEFAULT 'pcs',
    price REAL NOT NULL DEFAULT 0,
    tax_rate REAL NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
```

### 8.5 invoices

```sql
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id INTEGER,
    customer_name_snapshot TEXT NOT NULL,
    customer_phone_snapshot TEXT,
    customer_address_snapshot TEXT,
    customer_gstin_snapshot TEXT,
    invoice_date TEXT NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    balance_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'unpaid',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
```

Valid invoice status values:

```txt
paid
partial
unpaid
cancelled
```

### 8.6 invoice_items

```sql
CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    product_id INTEGER,
    item_name TEXT NOT NULL,
    description TEXT,
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'pcs',
    unit_price REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    tax_rate REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    line_total REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
```

### 8.7 payments

```sql
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'cash',
    payment_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
```

Valid payment modes:

```txt
cash
upi
card
bank_transfer
cheque
other
```

## 9. Important Business Rules

### 9.1 Invoice Number Generation

Invoice number format:

```txt
PREFIX-000001
```

Example:

```txt
INV-000001
INV-000002
```

Use settings:

```txt
invoice_prefix
next_invoice_number
```

When creating an invoice:

1. Start DB transaction.
2. Read current prefix and next_invoice_number.
3. Generate invoice number.
4. Insert invoice.
5. Insert invoice items.
6. Insert payment if paid_amount > 0.
7. Increment next_invoice_number.
8. Commit transaction.

This prevents duplicate invoice numbers.

### 9.2 Customer Snapshot

Invoice should store customer snapshot fields.

Reason:

If customer details change later, old invoices should still show the original customer details.

Store:

```txt
customer_name_snapshot
customer_phone_snapshot
customer_address_snapshot
customer_gstin_snapshot
```

### 9.3 Product Snapshot

Invoice item should store item name, unit, price, tax rate, etc.

Reason:

If product price changes later, old invoices should not change.

### 9.4 Invoice Totals

Calculate totals in backend/service layer, not only frontend.

For each item:

```txt
base = quantity * unit_price
line_discount = discount_amount
taxable = base - line_discount
tax_amount = taxable * tax_rate / 100
line_total = taxable + tax_amount
```

Invoice:

```txt
subtotal = sum(quantity * unit_price)
discount_amount = sum(item discount)
tax_amount = sum(item tax)
total_amount = sum(line_total)
paid_amount = sum(payments)
balance_amount = total_amount - paid_amount
```

Status:

```txt
paid if balance_amount <= 0
partial if paid_amount > 0 and balance_amount > 0
unpaid if paid_amount = 0
```

### 9.5 Payment Recording

When a payment is added:

1. Insert payment.
2. Recalculate invoice paid_amount.
3. Recalculate balance_amount.
4. Update invoice status.

Prevent overpayment unless explicitly allowed. MVP should not allow payment greater than balance.

### 9.6 Invoice Deletion

Avoid hard deleting invoices.

MVP behavior:

- Allow cancel invoice.
- Set status to `cancelled`.
- Do not include cancelled invoices in sales reports.
- Keep invoice history.

## 10. Backend Command/API Design

Since this is a Tauri desktop app, expose backend commands to frontend.

Use names like:

### Settings

```ts
getSettings(): Promise<Settings>
updateSettings(input: UpdateSettingsInput): Promise<Settings>
```

### Customers

```ts
listCustomers(query?: string): Promise<Customer[]>
getCustomer(id: number): Promise<CustomerDetail>
createCustomer(input: CreateCustomerInput): Promise<Customer>
updateCustomer(id: number, input: UpdateCustomerInput): Promise<Customer>
deactivateCustomer(id: number): Promise<void>
```

### Products

```ts
listProducts(query?: string): Promise<Product[]>
getProduct(id: number): Promise<Product>
createProduct(input: CreateProductInput): Promise<Product>
updateProduct(id: number, input: UpdateProductInput): Promise<Product>
deactivateProduct(id: number): Promise<void>
```

### Invoices

```ts
listInvoices(filters: InvoiceFilters): Promise<InvoiceListItem[]>
getInvoice(id: number): Promise<InvoiceDetail>
createInvoice(input: CreateInvoiceInput): Promise<InvoiceDetail>
cancelInvoice(id: number): Promise<void>
```

### Payments

```ts
listPayments(filters: PaymentFilters): Promise<Payment[]>
recordPayment(input: RecordPaymentInput): Promise<InvoiceDetail>
deletePayment(id: number): Promise<InvoiceDetail>
```

### Reports

```ts
getDashboardSummary(): Promise<DashboardSummary>
getSalesReport(filters: ReportFilters): Promise<SalesReport>
getPendingPaymentsReport(): Promise<PendingPayment[]>
```

### Backup

```ts
createBackup(targetFolderPath: string): Promise<BackupResult>
restoreBackup(sourceFilePath: string): Promise<RestoreResult>
getDatabaseInfo(): Promise<DatabaseInfo>
```

## 11. TypeScript DTOs

Codex should create shared frontend types.

### Settings

```ts
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
}
```

### Customer

```ts
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
}
```

### Product

```ts
export interface Product {
  id: number;
  name: string;
  description?: string;
  type: "product" | "service";
  unit: string;
  price: number;
  taxRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Create Invoice Input

```ts
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
```

### Invoice Item Input

```ts
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
```

### Invoice Detail

```ts
export interface InvoiceDetail {
  id: number;
  invoiceNumber: string;
  customerId?: number;
  customerNameSnapshot: string;
  customerPhoneSnapshot?: string;
  customerAddressSnapshot?: string;
  customerGstinSnapshot?: string;
  invoiceDate: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: "paid" | "partial" | "unpaid" | "cancelled";
  notes?: string;
  items: InvoiceItem[];
  payments: Payment[];
}
```

## 12. Frontend Screen Requirements

The Stitch UI can be connected to these screens.

### 12.1 Dashboard

Show:

- Today’s sales
- This month’s sales
- Pending amount
- Total invoices
- Recent invoices
- Quick actions

Required command:

```ts
getDashboardSummary()
```

### 12.2 Customers

Features:

- Search customers
- Add customer
- Edit customer
- View customer invoice history
- Show outstanding balance

Required commands:

```ts
listCustomers()
createCustomer()
updateCustomer()
deactivateCustomer()
```

### 12.3 Products & Services

Features:

- Search products/services
- Add product/service
- Edit item
- Deactivate item
- Type: product/service
- Price and tax rate

Required commands:

```ts
listProducts()
createProduct()
updateProduct()
deactivateProduct()
```

### 12.4 Create Invoice

Features:

- Select existing customer or enter walk-in customer
- Add items from product list or manually
- Quantity, price, discount, tax
- Live total calculation
- Initial payment
- Save invoice
- After save, navigate to invoice preview

Required commands:

```ts
listCustomers()
listProducts()
createInvoice()
```

### 12.5 Invoice List

Features:

- Search invoice number/customer
- Filter by date range
- Filter by status
- View invoice
- Print invoice
- Cancel invoice
- Mark/add payment

Required commands:

```ts
listInvoices()
cancelInvoice()
recordPayment()
```

### 12.6 Invoice Preview

Features:

- A4-style invoice
- Business details
- Customer details
- Items table
- Totals
- Payment status
- Print button

Required commands:

```ts
getInvoice()
getSettings()
```

### 12.7 Payments

Features:

- Show payment list
- Filter by date
- Filter by mode
- Link payment to invoice
- Delete payment if entered by mistake

Required commands:

```ts
listPayments()
deletePayment()
```

### 12.8 Reports

Features:

- Date range selection
- Total sales
- Total paid
- Pending amount
- Number of invoices
- Customer-wise sales
- Pending payment table

Required commands:

```ts
getSalesReport()
getPendingPaymentsReport()
```

### 12.9 Settings

Features:

- Business profile
- Invoice prefix
- Tax setting
- Currency
- Default invoice notes
- Logo path

Required commands:

```ts
getSettings()
updateSettings()
```

### 12.10 Backup & Restore

Features:

- Show DB location
- Create backup
- Restore backup
- Warning before restore

Required commands:

```ts
getDatabaseInfo()
createBackup()
restoreBackup()
```

## 13. Suggested Folder Structure

```txt
billing-app/
  package.json
  index.html
  vite.config.ts
  src/
    main.tsx
    App.tsx
    routes/
      DashboardPage.tsx
      CustomersPage.tsx
      ProductsPage.tsx
      InvoicesPage.tsx
      CreateInvoicePage.tsx
      InvoicePreviewPage.tsx
      PaymentsPage.tsx
      ReportsPage.tsx
      SettingsPage.tsx
      BackupPage.tsx
    components/
      layout/
        AppShell.tsx
        Sidebar.tsx
        Topbar.tsx
      common/
        DataTable.tsx
        ConfirmDialog.tsx
        EmptyState.tsx
        MoneyText.tsx
      invoice/
        InvoiceForm.tsx
        InvoiceItemsTable.tsx
        InvoiceTotalsPanel.tsx
        InvoicePrintView.tsx
      customers/
        CustomerForm.tsx
      products/
        ProductForm.tsx
      payments/
        PaymentForm.tsx
    lib/
      tauri.ts
      formatters.ts
      validators.ts
      constants.ts
    types/
      settings.ts
      customer.ts
      product.ts
      invoice.ts
      payment.ts
      report.ts
  src-tauri/
    Cargo.toml
    tauri.conf.json
    src/
      main.rs
      db.rs
      migrations.rs
      commands/
        mod.rs
        settings.rs
        customers.rs
        products.rs
        invoices.rs
        payments.rs
        reports.rs
        backup.rs
      services/
        invoice_calculator.rs
        invoice_number.rs
        backup_service.rs
      models/
        settings.rs
        customer.rs
        product.rs
        invoice.rs
        payment.rs
        report.rs
    migrations/
      001_initial_schema.sql
```

## 14. Implementation Phases for Codex

### Phase 1 — Project Setup

Codex should:

1. Create Tauri + React + TypeScript project.
2. Install Tailwind CSS.
3. Add shadcn/ui or basic reusable UI components.
4. Create app shell with sidebar.
5. Configure routing.
6. Configure Tauri build.
7. Create placeholder pages.

Acceptance criteria:

- App runs locally in dev mode.
- Sidebar navigation works.
- Empty pages render correctly.
- Windows build config exists.

### Phase 2 — Database Setup

Codex should:

1. Add SQLite support.
2. Resolve app data directory.
3. Create/open `billing.db`.
4. Add migration runner.
5. Apply initial schema.
6. Insert default settings row.

Acceptance criteria:

- DB is created on first run.
- Migrations run only once.
- Settings row exists.
- DB location can be displayed in app.

### Phase 3 — Settings, Customers, Products

Codex should implement:

- Settings CRUD
- Customer CRUD
- Product/service CRUD
- Search and deactivate support

Acceptance criteria:

- User can save business details.
- User can create/edit/deactivate customers.
- User can create/edit/deactivate products/services.

### Phase 4 — Invoice Creation

Codex should implement:

- Invoice form
- Backend invoice calculation
- Transaction-safe invoice number generation
- Invoice item insertion
- Optional initial payment
- Invoice detail view

Acceptance criteria:

- Invoice can be created.
- Invoice number is unique.
- Totals are calculated correctly.
- Product and customer snapshots are stored.
- Initial payment updates status correctly.

### Phase 5 — Invoice Preview and Print

Codex should implement:

- A4 invoice preview
- Print button using browser print
- Clean print CSS
- Hide app navigation during print

Acceptance criteria:

- Invoice preview looks printable.
- Print opens Windows print dialog.
- User can save as PDF from print dialog.

### Phase 6 — Payments

Codex should implement:

- Add payment to invoice
- Payment list
- Delete payment
- Recalculate invoice status after payment changes

Acceptance criteria:

- Partial payment works.
- Full payment marks invoice as paid.
- Overpayment is blocked.
- Deleting payment recalculates invoice correctly.

### Phase 7 — Reports

Codex should implement:

- Dashboard summary
- Sales report by date range
- Pending payments report
- Customer-wise sales

Acceptance criteria:

- Reports exclude cancelled invoices.
- Reports use correct date range.
- Pending payment report only shows invoices with balance.

### Phase 8 — Backup and Restore

Codex should implement:

- Show DB path
- Create backup
- Restore backup with warning
- Validate backup file before restore

Acceptance criteria:

- Backup creates a copy of SQLite DB.
- Restore replaces DB safely.
- A safety backup is created before restore.

### Phase 9 — Windows Build

Codex should:

1. Configure app icon.
2. Configure app identifier.
3. Configure Windows bundling.
4. Generate production build.
5. Document build command.

Acceptance criteria:

- `npm run tauri build` works.
- Windows installer/build artifact is generated.
- Installed app runs and creates local DB.

## 15. Validation Rules

### Customer

- Name required
- Phone optional
- Email optional but validate format if present

### Product

- Name required
- Price must be >= 0
- Tax rate must be between 0 and 100
- Type must be product/service

### Invoice

- Customer name required
- At least one item required
- Quantity must be > 0
- Unit price must be >= 0
- Discount must be >= 0
- Tax rate must be between 0 and 100
- Initial payment cannot exceed total amount

### Payment

- Amount must be > 0
- Amount cannot exceed invoice balance
- Payment date required
- Payment mode required

## 16. Error Handling

Show user-friendly errors.

Examples:

```txt
Could not create invoice. Please try again.
Payment amount cannot be greater than invoice balance.
Customer name is required.
Database backup failed. Please choose another folder.
```

Log technical details internally.

Do not expose raw SQL errors to the user.

## 17. Print CSS Requirements

Invoice print should:

- Use A4 layout.
- Hide sidebar/topbar/buttons.
- Use black text on white background.
- Keep table borders clean.
- Avoid splitting totals section across pages.

Example CSS direction:

```css
@media print {
  .app-sidebar,
  .app-topbar,
  .no-print {
    display: none !important;
  }

  .invoice-print {
    width: 210mm;
    min-height: 297mm;
    padding: 16mm;
    background: white;
    color: black;
  }
}
```

## 18. Security and Privacy

Since this is local-first:

- No user data should leave the machine.
- No analytics in MVP.
- No cloud sync in MVP.
- Store database locally.
- Optional PIN lock can be added later.
- Backup files are user-controlled.

## 19. Performance Requirements

The app should feel instant for small business use.

Expected local data volume:

```txt
Customers: up to 10,000
Products: up to 10,000
Invoices: up to 100,000
Invoice items: up to 500,000
Payments: up to 100,000
```

Use pagination for invoice list, customer list, and product list.

List commands should support:

```txt
page
pageSize
search
filters
```

## 20. Testing Requirements

Codex should add basic tests where practical.

Priority tests:

1. Invoice total calculation.
2. Invoice status calculation.
3. Invoice number generation.
4. Payment overpayment prevention.
5. Report totals excluding cancelled invoices.
6. Migration runner does not rerun applied migrations.

## 21. Seed Data for Development

Codex should create optional seed data for dev mode:

- 5 customers
- 10 products/services
- 5 invoices with different statuses
- 3 payments

This helps test the UI.

Do not seed production builds unless explicitly triggered.

## 22. Codex Execution Prompt

Use this prompt in Codex:

```txt
You are building a lightweight offline-first Windows billing desktop app.

Use Tauri v2 + React + TypeScript + SQLite. The app should run locally on Windows and store all data in a local SQLite database inside the app data directory, not beside the executable.

Implement the project in phases.

Phase 1:
- Set up Tauri + React + TypeScript.
- Add Tailwind CSS.
- Create app shell with left sidebar navigation.
- Create placeholder pages for Dashboard, Customers, Products & Services, Invoices, Create Invoice, Payments, Reports, Settings, Backup & Restore.
- Configure basic Tauri Windows app metadata.

Phase 2:
- Add SQLite support.
- Resolve app data directory.
- Create/open billing.db.
- Add migration runner.
- Apply initial schema from migrations/001_initial_schema.sql.
- Insert default settings row.

Phase 3:
- Implement settings, customers, and products/services CRUD.
- Use Tauri backend commands.
- Add frontend forms and tables.
- Add validation.

Phase 4:
- Implement invoice creation.
- Generate invoice numbers transactionally using settings.invoice_prefix and settings.next_invoice_number.
- Store customer snapshot fields.
- Store product/item snapshot fields.
- Calculate invoice totals in backend/service layer.
- Support optional initial payment.
- Update invoice status as paid, partial, or unpaid.

Phase 5:
- Implement invoice list and invoice detail page.
- Add filters for invoice number/customer, date range, and status.
- Add invoice preview page.
- Add print CSS and print button.

Phase 6:
- Implement payment recording.
- Prevent overpayment.
- Recalculate invoice paid amount, balance amount, and status after every payment change.

Phase 7:
- Implement dashboard summary and basic reports.
- Exclude cancelled invoices from sales reports.

Phase 8:
- Implement backup and restore.
- Backup should copy billing.db to a selected folder.
- Restore should validate the selected database file, create a safety backup, replace the current DB, and reload the app.

Keep the app small, clean, and useful. Do not add cloud sync, authentication, inventory, full accounting, GST filing, WhatsApp, or email automation in MVP.

Follow the database schema, folder structure, business rules, and acceptance criteria from the attached implementation brief.
```

## 23. First Milestone Codex Prompt

Use this smaller prompt first if you want Codex to start cleanly:

```txt
Create the initial project foundation for a lightweight Windows billing app using Tauri v2 + React + TypeScript.

Requirements:
1. Create a Tauri + React + TypeScript project.
2. Add Tailwind CSS.
3. Create a clean desktop app layout with a left sidebar.
4. Add routes/pages:
   - Dashboard
   - Customers
   - Products & Services
   - Invoices
   - Create Invoice
   - Payments
   - Reports
   - Settings
   - Backup & Restore
5. Add placeholder content on every page.
6. Configure app name as "Simple Billing Desktop".
7. Prepare the project so Stitch-generated React UI can be integrated later.
8. Do not implement database yet.
9. Keep the code clean and modular.

After completing, explain:
- How to run the app in dev mode.
- Where the main files are located.
- What to implement next.
```

## 24. Second Milestone Codex Prompt

Use this after the UI shell is ready:

```txt
Now implement the local SQLite backend for the billing app.

Requirements:
1. Add SQLite support in the Tauri backend.
2. Store the database as billing.db inside the app data directory.
3. Add a migration runner.
4. Create migrations/001_initial_schema.sql using the schema from the implementation brief.
5. On first launch, create the database, run migrations, and insert the default settings row.
6. Add backend commands:
   - getDatabaseInfo
   - getSettings
   - updateSettings
7. Connect the Settings page to the backend.
8. Show the database path on the Backup & Restore page.

Do not implement customers, products, or invoices yet.
```

## 25. Third Milestone Codex Prompt

Use this after DB setup:

```txt
Implement customer and product/service management.

Requirements:
1. Add backend commands for customers:
   - listCustomers
   - getCustomer
   - createCustomer
   - updateCustomer
   - deactivateCustomer

2. Add backend commands for products/services:
   - listProducts
   - getProduct
   - createProduct
   - updateProduct
   - deactivateProduct

3. Add frontend pages:
   - Customers table with search, add, edit, deactivate
   - Products & Services table with search, add, edit, deactivate

4. Add form validation:
   - Customer name required
   - Product/service name required
   - Price must be >= 0
   - Tax rate between 0 and 100

5. Use clean reusable components.
```

## 26. Fourth Milestone Codex Prompt

Use this for invoice core:

```txt
Implement invoice creation and invoice detail.

Requirements:
1. Create backend commands:
   - createInvoice
   - getInvoice
   - listInvoices
   - cancelInvoice

2. Implement transaction-safe invoice number generation.
3. Store customer snapshot fields on invoice.
4. Store product/item snapshot fields on invoice items.
5. Calculate all invoice totals in backend:
   - subtotal
   - discount_amount
   - tax_amount
   - total_amount
   - paid_amount
   - balance_amount
   - status

6. Support optional initial payment.
7. Create frontend Create Invoice page:
   - Customer selection or manual customer name
   - Item rows
   - Quantity, unit price, discount, tax
   - Live frontend preview totals
   - Save invoice

8. After saving, navigate to invoice preview/detail page.
```

## 27. Fifth Milestone Codex Prompt

Use this for payments and reports:

```txt
Implement payments and reports.

Requirements:
1. Add payment backend commands:
   - recordPayment
   - listPayments
   - deletePayment

2. Prevent overpayment.
3. Recalculate invoice paid amount, balance amount, and status after payment changes.
4. Add dashboard summary command.
5. Add reports:
   - Sales by date range
   - Pending payments
   - Customer-wise sales

6. Reports must exclude cancelled invoices.
```

## 28. Sixth Milestone Codex Prompt

Use this for packaging and backup:

```txt
Implement backup/restore and Windows packaging readiness.

Requirements:
1. Add backup command that copies billing.db to a user-selected folder.
2. Add restore command that:
   - Validates selected DB file
   - Creates safety backup of current DB
   - Replaces current DB
   - Reloads/restarts app if needed

3. Configure Tauri app metadata:
   - App name
   - App identifier
   - Window title
   - Icon placeholder
   - Windows bundle settings

4. Document commands:
   - npm run tauri dev
   - npm run tauri build

5. Ensure the app can be built as a Windows installable desktop app.
```

## 29. Final MVP Acceptance Checklist

The MVP is complete only when:

- App runs as a Tauri desktop app.
- App can be built for Windows.
- SQLite DB is created locally.
- Business settings can be saved.
- Customers can be created and edited.
- Products/services can be created and edited.
- Invoice can be created with multiple items.
- Invoice number is generated automatically.
- Invoice preview is printable.
- Payment can be recorded.
- Paid/partial/unpaid status works correctly.
- Dashboard shows useful summary.
- Reports show sales and pending amounts.
- Backup and restore work.
- App does not require internet.
- App does not require external database.
- App does not include unnecessary SaaS features.
