# Billwise Milestones

## Milestone 1: Project Foundation

Status: implemented in source.

- Tauri + React + TypeScript project files added.
- Tailwind CSS configured.
- Left-sidebar app shell added.
- MVP routes and screens added.
- App metadata set to Billwise.

## Milestone 2: Local SQLite Backend

Status: implemented in source.

- SQLite database opens in the Tauri app-data directory.
- Initial migration added.
- Migration runner tracks applied migrations.
- Default settings row is inserted.
- Settings and database-info commands added.

## Milestone 3: Customers and Products

Status: implemented in source.

- Customer list/create/update/deactivate commands and UI.
- Product/service list/create/update/deactivate commands and UI.
- Basic frontend and backend validation.

## Milestone 4: Invoices

Status: implemented in source.

- Invoice create/list/detail/cancel commands and UI.
- Transactional invoice number generation.
- Customer and product/item snapshots.
- Backend invoice total calculation.
- Optional initial payment.

## Milestone 5: Print, Payments, Reports

Status: implemented in source.

- A4-style invoice preview with print CSS.
- Payment list, record, and delete.
- Payment status recalculation.
- Dashboard summary, sales report, pending payments report.
- Cancelled invoices excluded from sales reports.

## Milestone 6: Backup and Packaging

Status: implemented in source with follow-up verification needed.

- Backup command copies `billing.db` to a selected folder path.
- Restore command validates required tables and creates a safety backup.
- Tauri Windows bundle metadata is present.
- Build must be verified on a machine with Node, Rust, and Tauri prerequisites installed.
