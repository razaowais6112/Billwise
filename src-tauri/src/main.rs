use chrono::Local;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{Manager, State};

type AppResult<T> = Result<T, String>;

struct DbState {
    conn: Mutex<Connection>,
    database_path: PathBuf,
    app_data_dir: PathBuf,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Settings {
    id: i64,
    business_name: Option<String>,
    business_phone: Option<String>,
    business_email: Option<String>,
    business_address: Option<String>,
    business_gstin: Option<String>,
    logo_path: Option<String>,
    invoice_prefix: String,
    next_invoice_number: i64,
    currency: String,
    tax_enabled: bool,
    default_tax_rate: f64,
    default_invoice_notes: Option<String>,
    watermark_enabled: bool,
    watermark_type: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingsInput {
    business_name: Option<String>,
    business_phone: Option<String>,
    business_email: Option<String>,
    business_address: Option<String>,
    business_gstin: Option<String>,
    logo_path: Option<String>,
    invoice_prefix: Option<String>,
    next_invoice_number: Option<i64>,
    currency: Option<String>,
    tax_enabled: Option<bool>,
    default_tax_rate: Option<f64>,
    default_invoice_notes: Option<String>,
    watermark_enabled: Option<bool>,
    watermark_type: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Customer {
    id: i64,
    name: String,
    phone: Option<String>,
    email: Option<String>,
    address: Option<String>,
    gstin: Option<String>,
    is_active: bool,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CustomerInput {
    name: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    address: Option<String>,
    gstin: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Product {
    id: i64,
    name: String,
    description: Option<String>,
    r#type: String,
    unit: String,
    price: f64,
    tax_rate: f64,
    is_active: bool,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProductInput {
    name: Option<String>,
    description: Option<String>,
    r#type: Option<String>,
    unit: Option<String>,
    price: Option<f64>,
    tax_rate: Option<f64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct InvoiceListItem {
    id: i64,
    invoice_number: String,
    customer_name_snapshot: String,
    invoice_date: String,
    total_amount: f64,
    paid_amount: f64,
    balance_amount: f64,
    status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct InvoiceItem {
    id: i64,
    invoice_id: i64,
    product_id: Option<i64>,
    item_name: String,
    description: Option<String>,
    quantity: f64,
    unit: String,
    unit_price: f64,
    discount_amount: f64,
    tax_rate: f64,
    tax_amount: f64,
    line_total: f64,
    created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Payment {
    id: i64,
    invoice_id: i64,
    invoice_number: Option<String>,
    customer_name: Option<String>,
    amount: f64,
    payment_mode: String,
    payment_date: String,
    notes: Option<String>,
    created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct InvoiceDetail {
    id: i64,
    invoice_number: String,
    customer_id: Option<i64>,
    customer_name_snapshot: String,
    customer_phone_snapshot: Option<String>,
    customer_address_snapshot: Option<String>,
    customer_gstin_snapshot: Option<String>,
    invoice_date: String,
    subtotal: f64,
    discount_amount: f64,
    tax_amount: f64,
    total_amount: f64,
    paid_amount: f64,
    balance_amount: f64,
    status: String,
    notes: Option<String>,
    items: Vec<InvoiceItem>,
    payments: Vec<Payment>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateInvoiceItemInput {
    product_id: Option<i64>,
    item_name: String,
    description: Option<String>,
    quantity: f64,
    unit: String,
    unit_price: f64,
    discount_amount: f64,
    tax_rate: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InitialPaymentInput {
    amount: f64,
    payment_mode: String,
    payment_date: String,
    notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateInvoiceInput {
    customer_id: Option<i64>,
    customer_name: String,
    customer_phone: Option<String>,
    customer_address: Option<String>,
    customer_gstin: Option<String>,
    invoice_date: String,
    notes: Option<String>,
    items: Vec<CreateInvoiceItemInput>,
    initial_payment: Option<InitialPaymentInput>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RecordPaymentInput {
    invoice_id: i64,
    amount: f64,
    payment_mode: String,
    payment_date: String,
    notes: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DashboardSummary {
    todays_sales: f64,
    month_sales: f64,
    pending_amount: f64,
    total_invoices: i64,
    recent_invoices: Vec<InvoiceListItem>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CustomerWiseSales {
    customer_name: String,
    total_sales: f64,
    invoice_count: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SalesReport {
    total_sales: f64,
    total_paid: f64,
    pending_amount: f64,
    invoice_count: i64,
    customer_wise_sales: Vec<CustomerWiseSales>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PendingPayment {
    invoice_id: i64,
    invoice_number: String,
    customer_name: String,
    invoice_date: String,
    balance_amount: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DatabaseInfo {
    database_path: String,
    app_data_dir: String,
    exists: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BackupResult {
    backup_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RestoreResult {
    restored: bool,
    safety_backup_path: String,
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&app_data_dir)?;
            let database_path = app_data_dir.join("billing.db");
            let conn = Connection::open(&database_path)?;
            conn.execute_batch("PRAGMA foreign_keys = ON;")?;
            run_migrations(&conn)?;
            app.manage(DbState {
                conn: Mutex::new(conn),
                database_path,
                app_data_dir,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_database_info,
            get_settings,
            update_settings,
            save_business_logo,
            remove_business_logo,
            list_customers,
            get_customer,
            create_customer,
            update_customer,
            deactivate_customer,
            list_products,
            get_product,
            create_product,
            update_product,
            deactivate_product,
            list_invoices,
            get_invoice,
            create_invoice,
            cancel_invoice,
            list_payments,
            record_payment,
            delete_payment,
            get_dashboard_summary,
            get_sales_report,
            get_pending_payments_report,
            create_backup,
            restore_backup
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Billwise");
}

fn run_migrations(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch("CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, migration_name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);")?;
    let name = "001_initial_schema.sql";
    let already_applied: Option<i64> = conn
        .query_row(
            "SELECT id FROM schema_migrations WHERE migration_name = ?1",
            [name],
            |row| row.get(0),
        )
        .optional()?;
    if already_applied.is_none() {
        conn.execute_batch(include_str!("../migrations/001_initial_schema.sql"))?;
        conn.execute("INSERT INTO schema_migrations (migration_name) VALUES (?1)", [name])?;
    }
    ensure_column(
        conn,
        "settings",
        "watermark_enabled",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_column(
        conn,
        "settings",
        "watermark_type",
        "TEXT NOT NULL DEFAULT 'business_name'",
    )?;
    conn.execute(
        "INSERT OR IGNORE INTO settings (id, business_name, invoice_prefix, next_invoice_number, currency) VALUES (1, 'Billwise', 'INV', 1, 'INR')",
        [],
    )?;
    Ok(())
}

fn ensure_column(
    conn: &Connection,
    table: &str,
    column: &str,
    definition: &str,
) -> rusqlite::Result<()> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table))?;
    let columns = stmt.query_map([], |row| row.get::<_, String>(1))?;
    for existing in columns {
        if existing? == column {
            return Ok(());
        }
    }
    conn.execute_batch(&format!(
        "ALTER TABLE {} ADD COLUMN {} {};",
        table, column, definition
    ))
}

fn lock_conn<'a>(state: &'a State<'_, DbState>) -> AppResult<std::sync::MutexGuard<'a, Connection>> {
    state.conn.lock().map_err(|_| "Database lock failed".to_string())
}

fn get_settings_from_conn(conn: &Connection) -> AppResult<Settings> {
    conn.query_row(
        "SELECT id, business_name, business_phone, business_email, business_address, business_gstin, logo_path, invoice_prefix, next_invoice_number, currency, tax_enabled, default_tax_rate, default_invoice_notes, watermark_enabled, watermark_type FROM settings WHERE id = 1",
        [],
        |row| Ok(Settings {
            id: row.get(0)?,
            business_name: row.get(1)?,
            business_phone: row.get(2)?,
            business_email: row.get(3)?,
            business_address: row.get(4)?,
            business_gstin: row.get(5)?,
            logo_path: row.get(6)?,
            invoice_prefix: row.get(7)?,
            next_invoice_number: row.get(8)?,
            currency: row.get(9)?,
            tax_enabled: row.get::<_, i64>(10)? == 1,
            default_tax_rate: row.get(11)?,
            default_invoice_notes: row.get(12)?,
            watermark_enabled: row.get::<_, i64>(13)? == 1,
            watermark_type: row.get(14)?,
        }),
    ).map_err(|err| err.to_string())
}

#[tauri::command(rename_all = "camelCase")]
fn get_settings(state: State<DbState>) -> AppResult<Settings> {
    let conn = lock_conn(&state)?;
    get_settings_from_conn(&conn)
}

#[tauri::command(rename_all = "camelCase")]
fn update_settings(state: State<DbState>, input: SettingsInput) -> AppResult<Settings> {
    let conn = lock_conn(&state)?;
    let current = get_settings_from_conn(&conn)?;
    let watermark_type = normalize_watermark_type(input.watermark_type.unwrap_or(current.watermark_type));
    conn.execute(
        "UPDATE settings SET business_name=?1, business_phone=?2, business_email=?3, business_address=?4, business_gstin=?5, logo_path=?6, invoice_prefix=?7, next_invoice_number=?8, currency=?9, tax_enabled=?10, default_tax_rate=?11, default_invoice_notes=?12, watermark_enabled=?13, watermark_type=?14, updated_at=CURRENT_TIMESTAMP WHERE id=1",
        params![
            input.business_name.or(current.business_name),
            input.business_phone.or(current.business_phone),
            input.business_email.or(current.business_email),
            input.business_address.or(current.business_address),
            input.business_gstin.or(current.business_gstin),
            input.logo_path.or(current.logo_path),
            input.invoice_prefix.unwrap_or(current.invoice_prefix),
            input.next_invoice_number.unwrap_or(current.next_invoice_number),
            input.currency.unwrap_or(current.currency),
            if input.tax_enabled.unwrap_or(current.tax_enabled) { 1 } else { 0 },
            input.default_tax_rate.unwrap_or(current.default_tax_rate),
            input.default_invoice_notes.or(current.default_invoice_notes),
            if input.watermark_enabled.unwrap_or(current.watermark_enabled) { 1 } else { 0 },
            watermark_type
        ],
    ).map_err(|err| err.to_string())?;
    get_settings_from_conn(&conn)
}

fn normalize_watermark_type(value: String) -> String {
    if value == "business_logo" {
        value
    } else {
        "business_name".to_string()
    }
}

#[tauri::command(rename_all = "camelCase")]
fn save_business_logo(
    state: State<DbState>,
    file_name: String,
    bytes: Vec<u8>,
) -> AppResult<Settings> {
    if bytes.is_empty() {
        return Err("Logo file is empty".to_string());
    }
    let extension = Path::new(&file_name)
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .ok_or("Logo file must have an image extension")?;
    if !matches!(extension.as_str(), "png" | "jpg" | "jpeg" | "webp" | "svg") {
        return Err("Logo must be a PNG, JPG, JPEG, WebP, or SVG file".to_string());
    }

    let assets_dir = state.app_data_dir.join("assets");
    fs::create_dir_all(&assets_dir).map_err(|err| err.to_string())?;
    remove_existing_logo_files(&assets_dir)?;
    let logo_path = assets_dir.join(format!("business-logo.{}", extension));
    fs::write(&logo_path, bytes).map_err(|err| err.to_string())?;

    let conn = lock_conn(&state)?;
    conn.execute(
        "UPDATE settings SET logo_path=?1, updated_at=CURRENT_TIMESTAMP WHERE id=1",
        [logo_path.to_string_lossy().to_string()],
    ).map_err(|err| err.to_string())?;
    get_settings_from_conn(&conn)
}

#[tauri::command(rename_all = "camelCase")]
fn remove_business_logo(state: State<DbState>) -> AppResult<Settings> {
    let assets_dir = state.app_data_dir.join("assets");
    remove_existing_logo_files(&assets_dir)?;
    let conn = lock_conn(&state)?;
    conn.execute(
        "UPDATE settings SET logo_path=NULL, watermark_type='business_name', updated_at=CURRENT_TIMESTAMP WHERE id=1",
        [],
    ).map_err(|err| err.to_string())?;
    get_settings_from_conn(&conn)
}

fn remove_existing_logo_files(assets_dir: &Path) -> AppResult<()> {
    if !assets_dir.exists() {
        return Ok(());
    }
    for entry in fs::read_dir(assets_dir).map_err(|err| err.to_string())? {
        let path = entry.map_err(|err| err.to_string())?.path();
        let is_business_logo = path
            .file_stem()
            .and_then(|value| value.to_str())
            .map(|value| value == "business-logo")
            .unwrap_or(false);
        if is_business_logo && path.is_file() {
            fs::remove_file(path).map_err(|err| err.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
fn list_customers(state: State<DbState>, query: Option<String>) -> AppResult<Vec<Customer>> {
    let conn = lock_conn(&state)?;
    let like = format!("%{}%", query.unwrap_or_default());
    let mut stmt = conn.prepare("SELECT id, name, phone, email, address, gstin, is_active, created_at, updated_at FROM customers WHERE name LIKE ?1 OR phone LIKE ?1 ORDER BY is_active DESC, name LIMIT 500").map_err(|err| err.to_string())?;
    let rows = stmt.query_map([like], map_customer).map_err(|err| err.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|err| err.to_string())
}

#[tauri::command(rename_all = "camelCase")]
fn get_customer(state: State<DbState>, id: i64) -> AppResult<Customer> {
    let conn = lock_conn(&state)?;
    customer_by_id(&conn, id)
}

#[tauri::command(rename_all = "camelCase")]
fn create_customer(state: State<DbState>, input: CustomerInput) -> AppResult<Customer> {
    let name = input.name.filter(|value| !value.trim().is_empty()).ok_or("Customer name is required")?;
    let conn = lock_conn(&state)?;
    conn.execute(
        "INSERT INTO customers (name, phone, email, address, gstin) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![name, input.phone, input.email, input.address, input.gstin],
    ).map_err(|err| err.to_string())?;
    customer_by_id(&conn, conn.last_insert_rowid())
}

#[tauri::command(rename_all = "camelCase")]
fn update_customer(state: State<DbState>, id: i64, input: CustomerInput) -> AppResult<Customer> {
    let conn = lock_conn(&state)?;
    let current = customer_by_id(&conn, id)?;
    conn.execute(
        "UPDATE customers SET name=?1, phone=?2, email=?3, address=?4, gstin=?5, updated_at=CURRENT_TIMESTAMP WHERE id=?6",
        params![
            input.name.unwrap_or(current.name),
            input.phone.or(current.phone),
            input.email.or(current.email),
            input.address.or(current.address),
            input.gstin.or(current.gstin),
            id
        ],
    ).map_err(|err| err.to_string())?;
    customer_by_id(&conn, id)
}

#[tauri::command(rename_all = "camelCase")]
fn deactivate_customer(state: State<DbState>, id: i64) -> AppResult<()> {
    let conn = lock_conn(&state)?;
    conn.execute("UPDATE customers SET is_active=0, updated_at=CURRENT_TIMESTAMP WHERE id=?1", [id]).map_err(|err| err.to_string())?;
    Ok(())
}

fn customer_by_id(conn: &Connection, id: i64) -> AppResult<Customer> {
    conn.query_row("SELECT id, name, phone, email, address, gstin, is_active, created_at, updated_at FROM customers WHERE id=?1", [id], map_customer).map_err(|err| err.to_string())
}

fn map_customer(row: &rusqlite::Row<'_>) -> rusqlite::Result<Customer> {
    Ok(Customer {
        id: row.get(0)?,
        name: row.get(1)?,
        phone: row.get(2)?,
        email: row.get(3)?,
        address: row.get(4)?,
        gstin: row.get(5)?,
        is_active: row.get::<_, i64>(6)? == 1,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

#[tauri::command(rename_all = "camelCase")]
fn list_products(state: State<DbState>, query: Option<String>) -> AppResult<Vec<Product>> {
    let conn = lock_conn(&state)?;
    let like = format!("%{}%", query.unwrap_or_default());
    let mut stmt = conn.prepare("SELECT id, name, description, type, unit, price, tax_rate, is_active, created_at, updated_at FROM products WHERE name LIKE ?1 ORDER BY is_active DESC, name LIMIT 500").map_err(|err| err.to_string())?;
    let rows = stmt.query_map([like], map_product).map_err(|err| err.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|err| err.to_string())
}

#[tauri::command(rename_all = "camelCase")]
fn get_product(state: State<DbState>, id: i64) -> AppResult<Product> {
    let conn = lock_conn(&state)?;
    product_by_id(&conn, id)
}

#[tauri::command(rename_all = "camelCase")]
fn create_product(state: State<DbState>, input: ProductInput) -> AppResult<Product> {
    let name = input.name.filter(|value| !value.trim().is_empty()).ok_or("Product/service name is required")?;
    let price = input.price.unwrap_or(0.0);
    let tax_rate = input.tax_rate.unwrap_or(0.0);
    if price < 0.0 || !(0.0..=100.0).contains(&tax_rate) {
        return Err("Price and tax rate are invalid".to_string());
    }
    let conn = lock_conn(&state)?;
    conn.execute(
        "INSERT INTO products (name, description, type, unit, price, tax_rate) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![name, input.description, input.r#type.unwrap_or("product".into()), input.unit.unwrap_or("pcs".into()), price, tax_rate],
    ).map_err(|err| err.to_string())?;
    product_by_id(&conn, conn.last_insert_rowid())
}

#[tauri::command(rename_all = "camelCase")]
fn update_product(state: State<DbState>, id: i64, input: ProductInput) -> AppResult<Product> {
    let conn = lock_conn(&state)?;
    let current = product_by_id(&conn, id)?;
    conn.execute(
        "UPDATE products SET name=?1, description=?2, type=?3, unit=?4, price=?5, tax_rate=?6, updated_at=CURRENT_TIMESTAMP WHERE id=?7",
        params![
            input.name.unwrap_or(current.name),
            input.description.or(current.description),
            input.r#type.unwrap_or(current.r#type),
            input.unit.unwrap_or(current.unit),
            input.price.unwrap_or(current.price),
            input.tax_rate.unwrap_or(current.tax_rate),
            id
        ],
    ).map_err(|err| err.to_string())?;
    product_by_id(&conn, id)
}

#[tauri::command(rename_all = "camelCase")]
fn deactivate_product(state: State<DbState>, id: i64) -> AppResult<()> {
    let conn = lock_conn(&state)?;
    conn.execute("UPDATE products SET is_active=0, updated_at=CURRENT_TIMESTAMP WHERE id=?1", [id]).map_err(|err| err.to_string())?;
    Ok(())
}

fn product_by_id(conn: &Connection, id: i64) -> AppResult<Product> {
    conn.query_row("SELECT id, name, description, type, unit, price, tax_rate, is_active, created_at, updated_at FROM products WHERE id=?1", [id], map_product).map_err(|err| err.to_string())
}

fn map_product(row: &rusqlite::Row<'_>) -> rusqlite::Result<Product> {
    Ok(Product {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        r#type: row.get(3)?,
        unit: row.get(4)?,
        price: row.get(5)?,
        tax_rate: row.get(6)?,
        is_active: row.get::<_, i64>(7)? == 1,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

#[tauri::command(rename_all = "camelCase")]
fn create_invoice(state: State<DbState>, input: CreateInvoiceInput) -> AppResult<InvoiceDetail> {
    validate_invoice(&input)?;
    let mut conn = lock_conn(&state)?;
    let tx = conn.transaction().map_err(|err| err.to_string())?;
    let (prefix, next_number): (String, i64) = tx.query_row("SELECT invoice_prefix, next_invoice_number FROM settings WHERE id=1", [], |row| Ok((row.get(0)?, row.get(1)?))).map_err(|err| err.to_string())?;
    let invoice_number = format!("{}-{:06}", prefix, next_number);
    let totals = calculate_totals(&input.items);
    let initial_paid = input.initial_payment.as_ref().map(|payment| payment.amount).unwrap_or(0.0);
    if initial_paid > totals.total_amount {
        return Err("Advance payment cannot exceed invoice total".to_string());
    }
    let balance = totals.total_amount - initial_paid;
    let status = status_from_amounts(initial_paid, balance);
    tx.execute(
        "INSERT INTO invoices (invoice_number, customer_id, customer_name_snapshot, customer_phone_snapshot, customer_address_snapshot, customer_gstin_snapshot, invoice_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount, balance_amount, status, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        params![invoice_number, input.customer_id, input.customer_name, input.customer_phone, input.customer_address, input.customer_gstin, input.invoice_date, totals.subtotal, totals.discount_amount, totals.tax_amount, totals.total_amount, initial_paid, balance, status, input.notes],
    ).map_err(|err| err.to_string())?;
    let invoice_id = tx.last_insert_rowid();
    for item in &input.items {
        let item_total = calculate_item(item);
        tx.execute(
            "INSERT INTO invoice_items (invoice_id, product_id, item_name, description, quantity, unit, unit_price, discount_amount, tax_rate, tax_amount, line_total) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![invoice_id, item.product_id, item.item_name, item.description, item.quantity, item.unit, item.unit_price, item.discount_amount, item.tax_rate, item_total.tax_amount, item_total.line_total],
        ).map_err(|err| err.to_string())?;
    }
    if let Some(payment) = input.initial_payment {
        if payment.amount > 0.0 {
            let payment_notes = payment.notes.or_else(|| Some("Advance payment".to_string()));
            tx.execute(
                "INSERT INTO payments (invoice_id, amount, payment_mode, payment_date, notes) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![invoice_id, payment.amount, payment.payment_mode, payment.payment_date, payment_notes],
            ).map_err(|err| err.to_string())?;
        }
    }
    tx.execute("UPDATE settings SET next_invoice_number = next_invoice_number + 1, updated_at=CURRENT_TIMESTAMP WHERE id=1", []).map_err(|err| err.to_string())?;
    tx.commit().map_err(|err| err.to_string())?;
    get_invoice_by_id(&conn, invoice_id)
}

#[tauri::command(rename_all = "camelCase")]
fn list_invoices(state: State<DbState>, filters: Option<serde_json::Value>) -> AppResult<Vec<InvoiceListItem>> {
    let conn = lock_conn(&state)?;
    let query = filters.as_ref().and_then(|v| v.get("query")).and_then(|v| v.as_str()).unwrap_or("");
    let status = filters.as_ref().and_then(|v| v.get("status")).and_then(|v| v.as_str()).unwrap_or("");
    let like = format!("%{}%", query);
    let mut stmt = conn.prepare("SELECT id, invoice_number, customer_name_snapshot, invoice_date, total_amount, paid_amount, balance_amount, status FROM invoices WHERE (invoice_number LIKE ?1 OR customer_name_snapshot LIKE ?1) AND (?2 = '' OR status = ?2) ORDER BY invoice_date DESC, id DESC LIMIT 500").map_err(|err| err.to_string())?;
    let rows = stmt.query_map(params![like, status], map_invoice_list_item).map_err(|err| err.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|err| err.to_string())
}

#[tauri::command(rename_all = "camelCase")]
fn get_invoice(state: State<DbState>, id: i64) -> AppResult<InvoiceDetail> {
    let conn = lock_conn(&state)?;
    get_invoice_by_id(&conn, id)
}

#[tauri::command(rename_all = "camelCase")]
fn cancel_invoice(state: State<DbState>, id: i64) -> AppResult<()> {
    let conn = lock_conn(&state)?;
    conn.execute("UPDATE invoices SET status='cancelled', updated_at=CURRENT_TIMESTAMP WHERE id=?1", [id]).map_err(|err| err.to_string())?;
    Ok(())
}

fn get_invoice_by_id(conn: &Connection, id: i64) -> AppResult<InvoiceDetail> {
    let mut invoice = conn.query_row(
        "SELECT id, invoice_number, customer_id, customer_name_snapshot, customer_phone_snapshot, customer_address_snapshot, customer_gstin_snapshot, invoice_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount, balance_amount, status, notes FROM invoices WHERE id=?1",
        [id],
        |row| Ok(InvoiceDetail {
            id: row.get(0)?,
            invoice_number: row.get(1)?,
            customer_id: row.get(2)?,
            customer_name_snapshot: row.get(3)?,
            customer_phone_snapshot: row.get(4)?,
            customer_address_snapshot: row.get(5)?,
            customer_gstin_snapshot: row.get(6)?,
            invoice_date: row.get(7)?,
            subtotal: row.get(8)?,
            discount_amount: row.get(9)?,
            tax_amount: row.get(10)?,
            total_amount: row.get(11)?,
            paid_amount: row.get(12)?,
            balance_amount: row.get(13)?,
            status: row.get(14)?,
            notes: row.get(15)?,
            items: vec![],
            payments: vec![],
        }),
    ).map_err(|err| err.to_string())?;
    invoice.items = invoice_items(conn, id)?;
    invoice.payments = invoice_payments(conn, id)?;
    Ok(invoice)
}

fn invoice_items(conn: &Connection, invoice_id: i64) -> AppResult<Vec<InvoiceItem>> {
    let mut stmt = conn.prepare("SELECT id, invoice_id, product_id, item_name, description, quantity, unit, unit_price, discount_amount, tax_rate, tax_amount, line_total, created_at FROM invoice_items WHERE invoice_id=?1").map_err(|err| err.to_string())?;
    let rows = stmt.query_map([invoice_id], |row| Ok(InvoiceItem {
        id: row.get(0)?,
        invoice_id: row.get(1)?,
        product_id: row.get(2)?,
        item_name: row.get(3)?,
        description: row.get(4)?,
        quantity: row.get(5)?,
        unit: row.get(6)?,
        unit_price: row.get(7)?,
        discount_amount: row.get(8)?,
        tax_rate: row.get(9)?,
        tax_amount: row.get(10)?,
        line_total: row.get(11)?,
        created_at: row.get(12)?,
    })).map_err(|err| err.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|err| err.to_string())
}

fn invoice_payments(conn: &Connection, invoice_id: i64) -> AppResult<Vec<Payment>> {
    let mut stmt = conn.prepare("SELECT id, invoice_id, amount, payment_mode, payment_date, notes, created_at FROM payments WHERE invoice_id=?1 ORDER BY payment_date DESC, id DESC").map_err(|err| err.to_string())?;
    let rows = stmt.query_map([invoice_id], |row| Ok(Payment {
        id: row.get(0)?,
        invoice_id: row.get(1)?,
        invoice_number: None,
        customer_name: None,
        amount: row.get(2)?,
        payment_mode: row.get(3)?,
        payment_date: row.get(4)?,
        notes: row.get(5)?,
        created_at: row.get(6)?,
    })).map_err(|err| err.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|err| err.to_string())
}

fn map_invoice_list_item(row: &rusqlite::Row<'_>) -> rusqlite::Result<InvoiceListItem> {
    Ok(InvoiceListItem {
        id: row.get(0)?,
        invoice_number: row.get(1)?,
        customer_name_snapshot: row.get(2)?,
        invoice_date: row.get(3)?,
        total_amount: row.get(4)?,
        paid_amount: row.get(5)?,
        balance_amount: row.get(6)?,
        status: row.get(7)?,
    })
}

struct ItemTotals {
    tax_amount: f64,
    line_total: f64,
}

struct InvoiceTotals {
    subtotal: f64,
    discount_amount: f64,
    tax_amount: f64,
    total_amount: f64,
}

fn calculate_item(item: &CreateInvoiceItemInput) -> ItemTotals {
    let base = item.quantity * item.unit_price;
    let taxable = (base - item.discount_amount).max(0.0);
    let tax_amount = taxable * item.tax_rate / 100.0;
    ItemTotals {
        tax_amount,
        line_total: taxable + tax_amount,
    }
}

fn calculate_totals(items: &[CreateInvoiceItemInput]) -> InvoiceTotals {
    items.iter().fold(InvoiceTotals { subtotal: 0.0, discount_amount: 0.0, tax_amount: 0.0, total_amount: 0.0 }, |mut total, item| {
        let item_total = calculate_item(item);
        total.subtotal += item.quantity * item.unit_price;
        total.discount_amount += item.discount_amount;
        total.tax_amount += item_total.tax_amount;
        total.total_amount += item_total.line_total;
        total
    })
}

fn status_from_amounts(paid: f64, balance: f64) -> &'static str {
    if balance <= 0.0001 {
        "paid"
    } else if paid > 0.0 {
        "partial"
    } else {
        "unpaid"
    }
}

fn validate_invoice(input: &CreateInvoiceInput) -> AppResult<()> {
    if input.customer_name.trim().is_empty() {
        return Err("Customer name is required".to_string());
    }
    if input.items.is_empty() {
        return Err("At least one invoice item is required".to_string());
    }
    for item in &input.items {
        if item.item_name.trim().is_empty() || item.quantity <= 0.0 || item.unit_price < 0.0 || item.discount_amount < 0.0 || !(0.0..=100.0).contains(&item.tax_rate) {
            return Err("Invoice item values are invalid".to_string());
        }
    }
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
fn record_payment(state: State<DbState>, input: RecordPaymentInput) -> AppResult<InvoiceDetail> {
    if input.amount <= 0.0 {
        return Err("Payment amount must be greater than zero".to_string());
    }
    let conn = lock_conn(&state)?;
    let balance: f64 = conn.query_row("SELECT balance_amount FROM invoices WHERE id=?1", [input.invoice_id], |row| row.get(0)).map_err(|err| err.to_string())?;
    if input.amount > balance {
        return Err("Payment amount cannot be greater than invoice balance".to_string());
    }
    conn.execute(
        "INSERT INTO payments (invoice_id, amount, payment_mode, payment_date, notes) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![input.invoice_id, input.amount, input.payment_mode, input.payment_date, input.notes],
    ).map_err(|err| err.to_string())?;
    recalculate_invoice_payment(&conn, input.invoice_id)?;
    get_invoice_by_id(&conn, input.invoice_id)
}

#[tauri::command(rename_all = "camelCase")]
fn list_payments(state: State<DbState>, filters: Option<serde_json::Value>) -> AppResult<Vec<Payment>> {
    let conn = lock_conn(&state)?;
    let mode = filters.as_ref().and_then(|v| v.get("mode")).and_then(|v| v.as_str()).unwrap_or("");
    let mut stmt = conn.prepare("SELECT p.id, p.invoice_id, i.invoice_number, i.customer_name_snapshot, p.amount, p.payment_mode, p.payment_date, p.notes, p.created_at FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE (?1 = '' OR p.payment_mode = ?1) ORDER BY p.payment_date DESC, p.id DESC LIMIT 500").map_err(|err| err.to_string())?;
    let rows = stmt.query_map([mode], |row| Ok(Payment {
        id: row.get(0)?,
        invoice_id: row.get(1)?,
        invoice_number: row.get(2)?,
        customer_name: row.get(3)?,
        amount: row.get(4)?,
        payment_mode: row.get(5)?,
        payment_date: row.get(6)?,
        notes: row.get(7)?,
        created_at: row.get(8)?,
    })).map_err(|err| err.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|err| err.to_string())
}

#[tauri::command(rename_all = "camelCase")]
fn delete_payment(state: State<DbState>, id: i64) -> AppResult<InvoiceDetail> {
    let conn = lock_conn(&state)?;
    let invoice_id: i64 = conn.query_row("SELECT invoice_id FROM payments WHERE id=?1", [id], |row| row.get(0)).map_err(|err| err.to_string())?;
    conn.execute("DELETE FROM payments WHERE id=?1", [id]).map_err(|err| err.to_string())?;
    recalculate_invoice_payment(&conn, invoice_id)?;
    get_invoice_by_id(&conn, invoice_id)
}

fn recalculate_invoice_payment(conn: &Connection, invoice_id: i64) -> AppResult<()> {
    let total_amount: f64 = conn.query_row("SELECT total_amount FROM invoices WHERE id=?1", [invoice_id], |row| row.get(0)).map_err(|err| err.to_string())?;
    let paid_amount: f64 = conn.query_row("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id=?1", [invoice_id], |row| row.get(0)).map_err(|err| err.to_string())?;
    let balance = (total_amount - paid_amount).max(0.0);
    let status = status_from_amounts(paid_amount, balance);
    conn.execute("UPDATE invoices SET paid_amount=?1, balance_amount=?2, status=?3, updated_at=CURRENT_TIMESTAMP WHERE id=?4 AND status != 'cancelled'", params![paid_amount, balance, status, invoice_id]).map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
fn get_dashboard_summary(state: State<DbState>) -> AppResult<DashboardSummary> {
    let conn = lock_conn(&state)?;
    let today = Local::now().format("%Y-%m-%d").to_string();
    let month = Local::now().format("%Y-%m").to_string();
    let todays_sales = scalar_f64(&conn, "SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE status != 'cancelled' AND invoice_date = ?1", &today)?;
    let month_sales = scalar_f64(&conn, "SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE status != 'cancelled' AND invoice_date LIKE ?1", &format!("{}%", month))?;
    let pending_amount: f64 = conn.query_row("SELECT COALESCE(SUM(balance_amount), 0) FROM invoices WHERE status IN ('unpaid', 'partial')", [], |row| row.get(0)).map_err(|err| err.to_string())?;
    let total_invoices: i64 = conn.query_row("SELECT COUNT(*) FROM invoices", [], |row| row.get(0)).map_err(|err| err.to_string())?;
    let recent_invoices = list_invoices_with_sql(&conn, "SELECT id, invoice_number, customer_name_snapshot, invoice_date, total_amount, paid_amount, balance_amount, status FROM invoices ORDER BY id DESC LIMIT 5")?;
    Ok(DashboardSummary { todays_sales, month_sales, pending_amount, total_invoices, recent_invoices })
}

#[tauri::command(rename_all = "camelCase")]
fn get_sales_report(state: State<DbState>, filters: Option<serde_json::Value>) -> AppResult<SalesReport> {
    let conn = lock_conn(&state)?;
    let from = filters.as_ref().and_then(|v| v.get("from")).and_then(|v| v.as_str()).unwrap_or("0000-01-01");
    let to = filters.as_ref().and_then(|v| v.get("to")).and_then(|v| v.as_str()).unwrap_or("9999-12-31");
    let total_sales = range_scalar(&conn, "SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE status != 'cancelled' AND invoice_date BETWEEN ?1 AND ?2", from, to)?;
    let total_paid = range_scalar(&conn, "SELECT COALESCE(SUM(paid_amount), 0) FROM invoices WHERE status != 'cancelled' AND invoice_date BETWEEN ?1 AND ?2", from, to)?;
    let pending_amount = range_scalar(&conn, "SELECT COALESCE(SUM(balance_amount), 0) FROM invoices WHERE status != 'cancelled' AND invoice_date BETWEEN ?1 AND ?2", from, to)?;
    let invoice_count: i64 = conn.query_row("SELECT COUNT(*) FROM invoices WHERE status != 'cancelled' AND invoice_date BETWEEN ?1 AND ?2", params![from, to], |row| row.get(0)).map_err(|err| err.to_string())?;
    let mut stmt = conn.prepare("SELECT customer_name_snapshot, SUM(total_amount), COUNT(*) FROM invoices WHERE status != 'cancelled' AND invoice_date BETWEEN ?1 AND ?2 GROUP BY customer_name_snapshot ORDER BY SUM(total_amount) DESC").map_err(|err| err.to_string())?;
    let rows = stmt.query_map(params![from, to], |row| Ok(CustomerWiseSales { customer_name: row.get(0)?, total_sales: row.get(1)?, invoice_count: row.get(2)? })).map_err(|err| err.to_string())?;
    Ok(SalesReport { total_sales, total_paid, pending_amount, invoice_count, customer_wise_sales: rows.collect::<Result<Vec<_>, _>>().map_err(|err| err.to_string())? })
}

#[tauri::command(rename_all = "camelCase")]
fn get_pending_payments_report(state: State<DbState>) -> AppResult<Vec<PendingPayment>> {
    let conn = lock_conn(&state)?;
    let mut stmt = conn.prepare("SELECT id, invoice_number, customer_name_snapshot, invoice_date, balance_amount FROM invoices WHERE status IN ('unpaid', 'partial') AND balance_amount > 0 ORDER BY invoice_date ASC").map_err(|err| err.to_string())?;
    let rows = stmt.query_map([], |row| Ok(PendingPayment { invoice_id: row.get(0)?, invoice_number: row.get(1)?, customer_name: row.get(2)?, invoice_date: row.get(3)?, balance_amount: row.get(4)? })).map_err(|err| err.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|err| err.to_string())
}

fn scalar_f64(conn: &Connection, sql: &str, value: &str) -> AppResult<f64> {
    conn.query_row(sql, [value], |row| row.get(0)).map_err(|err| err.to_string())
}

fn range_scalar(conn: &Connection, sql: &str, from: &str, to: &str) -> AppResult<f64> {
    conn.query_row(sql, params![from, to], |row| row.get(0)).map_err(|err| err.to_string())
}

fn list_invoices_with_sql(conn: &Connection, sql: &str) -> AppResult<Vec<InvoiceListItem>> {
    let mut stmt = conn.prepare(sql).map_err(|err| err.to_string())?;
    let rows = stmt.query_map([], map_invoice_list_item).map_err(|err| err.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|err| err.to_string())
}

#[tauri::command(rename_all = "camelCase")]
fn get_database_info(state: State<DbState>) -> DatabaseInfo {
    DatabaseInfo {
        database_path: state.database_path.display().to_string(),
        app_data_dir: state.app_data_dir.display().to_string(),
        exists: state.database_path.exists(),
    }
}

#[tauri::command(rename_all = "camelCase")]
fn create_backup(state: State<DbState>, target_folder_path: String) -> AppResult<BackupResult> {
    let target_dir = Path::new(&target_folder_path);
    if !target_dir.is_dir() {
        return Err("Please choose an existing backup folder".to_string());
    }
    let file_name = format!("billing-backup-{}.db", Local::now().format("%Y-%m-%d-%H-%M"));
    let backup_path = target_dir.join(file_name);
    fs::copy(&state.database_path, &backup_path).map_err(|err| err.to_string())?;
    Ok(BackupResult { backup_path: backup_path.display().to_string() })
}

#[tauri::command(rename_all = "camelCase")]
fn restore_backup(state: State<DbState>, source_file_path: String) -> AppResult<RestoreResult> {
    let source = Path::new(&source_file_path);
    validate_backup(source)?;
    let safety_backup_path = state.app_data_dir.join(format!("billing-safety-backup-{}.db", Local::now().format("%Y-%m-%d-%H-%M")));
    fs::copy(&state.database_path, &safety_backup_path).map_err(|err| err.to_string())?;
    let mut conn = lock_conn(&state)?;
    let old_conn = std::mem::replace(&mut *conn, Connection::open_in_memory().map_err(|err| err.to_string())?);
    drop(old_conn);
    fs::copy(source, &state.database_path).map_err(|err| err.to_string())?;
    let restored_conn = Connection::open(&state.database_path).map_err(|err| err.to_string())?;
    restored_conn.execute_batch("PRAGMA foreign_keys = ON;").map_err(|err| err.to_string())?;
    *conn = restored_conn;
    Ok(RestoreResult { restored: true, safety_backup_path: safety_backup_path.display().to_string() })
}

fn validate_backup(path: &Path) -> AppResult<()> {
    if !path.is_file() {
        return Err("Backup file does not exist".to_string());
    }
    let conn = Connection::open(path).map_err(|err| err.to_string())?;
    for table in ["settings", "customers", "products", "invoices", "invoice_items", "payments"] {
        let exists: Option<String> = conn.query_row("SELECT name FROM sqlite_master WHERE type='table' AND name=?1", [table], |row| row.get(0)).optional().map_err(|err| err.to_string())?;
        if exists.is_none() {
            return Err(format!("Backup is missing required table: {}", table));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn item(quantity: f64, unit_price: f64, discount_amount: f64, tax_rate: f64) -> CreateInvoiceItemInput {
        CreateInvoiceItemInput {
            product_id: None,
            item_name: "Test item".to_string(),
            description: None,
            quantity,
            unit: "pcs".to_string(),
            unit_price,
            discount_amount,
            tax_rate,
        }
    }

    #[test]
    fn calculates_invoice_totals() {
        let totals = calculate_totals(&[item(2.0, 100.0, 20.0, 10.0), item(1.0, 50.0, 0.0, 0.0)]);
        assert_eq!(totals.subtotal, 250.0);
        assert_eq!(totals.discount_amount, 20.0);
        assert_eq!(totals.tax_amount, 18.0);
        assert_eq!(totals.total_amount, 248.0);
    }

    #[test]
    fn calculates_invoice_status() {
        assert_eq!(status_from_amounts(0.0, 100.0), "unpaid");
        assert_eq!(status_from_amounts(25.0, 75.0), "partial");
        assert_eq!(status_from_amounts(100.0, 0.0), "paid");
    }

    #[test]
    fn rejects_invalid_invoice_items() {
        let input = CreateInvoiceInput {
            customer_id: None,
            customer_name: "Customer".to_string(),
            customer_phone: None,
            customer_address: None,
            customer_gstin: None,
            invoice_date: "2026-05-23".to_string(),
            notes: None,
            items: vec![item(0.0, 100.0, 0.0, 0.0)],
            initial_payment: None,
        };
        assert!(validate_invoice(&input).is_err());
    }
}
