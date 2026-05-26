# Billwise

Billwise is an offline-first Windows desktop invoicing app for small businesses.

## Stack

- Tauri v2
- React + TypeScript
- Tailwind CSS
- SQLite through the Rust backend

## Development

Install Node.js, npm, Rust, Cargo, and the Tauri prerequisites for your OS.

```bash
npm install
npm run tauri:dev
```

## Build

```bash
npm run tauri:build
```

The app stores `billing.db` in the OS app-data directory resolved by Tauri, not beside the executable.
