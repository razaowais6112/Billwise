# Billwise Technical Implementation

## Current Architecture

Billwise is scaffolded as a Tauri v2 desktop app with a React + TypeScript frontend and a Rust backend using SQLite.

Frontend responsibilities:

- Desktop app shell with left sidebar navigation.
- Forms, tables, filters, print preview, and user-friendly validation.
- Typed Tauri API wrapper in `src/lib/tauri.ts`.

Backend responsibilities:

- Resolve the OS app-data directory and open `billing.db`.
- Run SQLite migrations once using `schema_migrations`.
- Own business-critical rules: invoice numbers, invoice totals, payment status, reports, backup validation.

## Data Location

The SQLite database is created as:

```txt
<Tauri app data dir>/billing.db
```

The path is surfaced in the Backup & Restore screen through `getDatabaseInfo`.

## Design Source

The first implementation uses a lightweight Billwise desktop UI based on the product brief. Stitch assets remain optional.

If Stitch export files or screenshots are added later:

- Put screenshots/spec notes in `docs/design/`.
- Put exported React/CSS/assets in a root `stitch/` folder.
- Adapt the existing screens without changing backend command behavior.

## Command Boundary

The frontend calls typed helpers from `src/lib/tauri.ts`. Those helpers call Rust Tauri commands in `src-tauri/src/main.rs`.

The public frontend helper names match the implementation brief:

- `getSettings`, `updateSettings`
- `listCustomers`, `createCustomer`, `updateCustomer`, `deactivateCustomer`
- `listProducts`, `createProduct`, `updateProduct`, `deactivateProduct`
- `listInvoices`, `getInvoice`, `createInvoice`, `cancelInvoice`
- `listPayments`, `recordPayment`, `deletePayment`
- `getDashboardSummary`, `getSalesReport`, `getPendingPaymentsReport`
- `getDatabaseInfo`, `createBackup`, `restoreBackup`

## Verification Notes

This workspace did not have Node/npm or Rust/Cargo installed, so dependency installation, TypeScript checks, Rust tests, and Tauri builds were not run locally.

Run these after installing the toolchains:

```bash
npm install
npm run build
npm run tauri:dev
cd src-tauri && cargo test
```
