# 🚀 Setup, Deployment & Operations Guide

This guide provides end-to-end instructions for deploying and running the **Crackers Shop Invoice Billing POS** for a Tamil Nadu fireworks retail business.

---

## 1. Cloud Database Setup (Supabase PostgreSQL)

1. Create a free or production project on [Supabase](https://supabase.com).
2. Go to **SQL Editor** in your Supabase dashboard.
3. Open [`supabase/migrations/20261017000001_initial_schema.sql`](file:///c:/Users/Muneeswaran/Documents/invoice/supabase/migrations/20261017000001_initial_schema.sql).
4. Paste the entire SQL script and click **Run**.
   - This creates all 18 tables: `shops`, `shop_settings`, `categories`, `products`, `customers`, `sales`, `sale_items`, `payments`, `stock_balances`, `stock_movements`, `suppliers`, `purchases`, `expenses`, `audit_logs`, and `sync_operations`.
   - Enables Row-Level Security (RLS) policies isolating multi-tenant data.
   - Installs the transactional PostgreSQL function `finalize_pos_sale(...)` with stock locking and idempotency protection.
5. In Supabase Dashboard, go to **Project Settings > API**:
   - Copy `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public key` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role key` -> `SUPABASE_SERVICE_ROLE_KEY` (keep strictly server-side).

---

## 2. Local Web Application Execution

1. In the project root, ensure dependencies are installed:
   ```powershell
   npm install
   ```
2. Start the local development server:
   ```powershell
   npm run dev
   ```
3. Open `http://localhost:3000` in Google Chrome or Microsoft Edge.
4. For thermal receipt printing, connect any 80mm or 58mm USB/Bluetooth ESC/POS thermal printer (e.g. TVS, EPSON, Posiflex, NGX). In Chrome print dialog, set Paper Size to `80mm x Receipt` (or `Roll Paper 80 x 297 mm`) and margins to `None`.

---

## 3. Windows Desktop Deployment (Tauri)

For offline desktop kiosk operation without an internet connection:

1. Install the Rust build tools for Windows:
   ```powershell
   winget install Rustlang.Rustup
   rustup default stable-msvc
   ```
2. Install Tauri CLI:
   ```powershell
   npm install -D @tauri-apps/cli
   ```
3. Build the native Windows `.msi` and `.exe` installer:
   ```powershell
   npx tauri build
   ```
4. The production installer is generated in `src-tauri/target/release/bundle/msi/`.
5. Install on any Windows 10/11 desktop POS billing terminal. All products, sales, and held bills are securely persisted locally and will synchronize with Supabase Cloud whenever internet access is detected.

---

## 4. Vercel Cloud Web Deployment

1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com), click **Add New > Project** and import the repository.
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_DEFAULT_SHOP_NAME`
   - `NEXT_PUBLIC_DEFAULT_CITY`
   - `NEXT_PUBLIC_DEFAULT_STATE`
   - `NEXT_PUBLIC_DEFAULT_GSTIN`
4. Deploy. Vercel automatically builds and optimizes the Next.js App Router application.

---

## 5. Backup & Disaster Recovery Procedures

### Routine Daily Backup:
1. Navigate to **Backup & Synchronization** (`/sync`).
2. Click **Export Database Backup (.JSON)**.
3. Save the exported `.json` file to a secure external USB drive or cloud drive at the end of every business day.

### System Disaster Restoration:
1. On a fresh installation or new PC terminal, open the POS app.
2. Navigate to **Backup & Synchronization** (`/sync`).
3. Click **Restore from Backup**, select your latest `.json` backup file, and confirm.
4. All catalog items, stock movements, historical invoices, supplier payables, and customer credits will be restored immediately.

---

## 6. Pre-Production Regulatory & Compliance Checklist

Before issuing invoices to public customers, complete this checklist with your accountant and local authorities:

- [ ] **PESO License**: Verify that your retail shop has a valid license under the Explosives Rules issued by the Deputy Chief Controller of Explosives (PESO) or District Magistrate.
- [ ] **Green Crackers QR**: Ensure all stocked fireworks packaging displays the CSIR-NEERI Green Crackers QR logo and manufacturer registration number.
- [ ] **GST Registration**: Confirm whether your shop operates under Regular GST (18% tax invoice with input tax credit) or the Composition Scheme (Bill of Supply without charging GST).
- [ ] **Invoice Series**: Verify the initial financial year prefix (e.g. `SMF/2026-27/0001`) with your chartered accountant.
- [ ] **Fire & Safety Inspection**: Maintain required buckets of water and dry sand, fire extinguishers, and separate storage distance as mandated by the Tamil Nadu Fire & Rescue Services.
