# 🎆 Crackers Shop Invoice Billing POS (Tamil Nadu, India)

Production-oriented **Crackers Shop Invoice Billing and Point of Sale (POS) Software** tailored specifically for single and multi-counter fireworks retail shops in Tamil Nadu, India (Sivakasi / Madurai / Chennai / Coimbatore fireworks trade).

---

## 🚀 Key Features

### 1. High-Speed Diwali POS Billing Counter
- **Instant Search & Barcode Ready**: Search by English Name, Tamil Name (கம்ப மத்தாப்பு, புஸ்வாணம், தரை சக்கரம்), SKU, Brand, or standard barcode scanner.
- **Fast Keyboard Navigation**: Full POS operation via keyboard shortcuts (`F1` Help, `F2` Search, `F3` Customer, `F6` Hold Bill, `F7` Resume, `F8` Payment, `F9` Thermal 80mm Print, `F10` A4 Tax Invoice).
- **Seasonal Festival Discount Engine**: Configurable seasonal discounts (standard Sivakasi 70% to 80% festival discount off MRP) with line-level and bill-level discount controls.
- **Hold & Recall Bills**: Park active customer baskets during rush hours and resume them instantly with local durable persistence.
- **Real-Time Payment Methods**: Cash (with tendered change calculation), instant UPI QR code generation, Card, and Split payments.

### 2. Dual Invoice Printing System
- **80mm & 58mm Thermal ESC/POS Receipts**: Compact layout with Tamil Nadu shop identity, GSTIN, PESO License, Green Crackers certification badge, itemized breakdown, and Diwali greetings.
- **A4 Full GST Tax Invoices**: Formal business invoices compliant with Indian tax standards, HSN 3604 classification, CGST (9%) + SGST (9%), bank transfer details, terms of sale, and authorized signatory boxes.

### 3. Inventory & Physical Godown Ledger
- **Stock Movement Ledger**: Automatic audit ledger tracking `SALE_DEDUCTION`, `PURCHASE_RECEIPT`, `SALE_RETURN`, `STOCK_ADJUSTMENT`, and `DAMAGED_SCRAP_WRITEOFF`.
- **Physical Count Reconciliation**: Adjust godown counts with mandatory reason documentation.
- **Live Stock Alerts & Valuation**: Real-time valuation at cost price (COGS) and retail price.

### 4. Returns & Credit Notes
- Search original sales invoice, select eligible items, record reason (defective fuse, damp cracker, outer damage), select refund method, and choose whether to restock or scrap. Automatically issues `CN/2026-27/...` Credit Note.

### 5. Supplier Purchases & Inward Goods
- Record manufacturer inward bills (Standard, Coronation, Sony, Vadivel, Ayyan), post quantities to stock automatically, and maintain supplier payable balances.

### 6. Reports & GSTR-1 Tax Statements
- GSTR-1 HSN 3604 breakdown statement exportable to CSV.
- Cost of Goods Sold (COGS), Gross Profit, and Net Profit after shop operating expenses.
- Cashier-wise counter registers.

### 7. Offline Windows Desktop & Cloud Architecture
- Built with **Next.js App Router**, **TypeScript**, and **Tailwind CSS**.
- **Supabase PostgreSQL** backend with complete SQL migrations, Row-Level Security (RLS) policies, and transactional database functions.
- **Tauri Windows Desktop** configuration (`src-tauri/`) with offline fallback and durable transaction synchronization queue.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | Next.js 14 App Router, React 18, TypeScript |
| **Styling & Aesthetics** | Tailwind CSS with warm amber/sparkler brand palette |
| **Icons & Visuals** | Lucide React |
| **Charts & Analytics** | Recharts |
| **Database & Auth** | Supabase PostgreSQL, Row Level Security (RLS), Prisma ORM |
| **Printing & Invoices** | Built-in 80mm ESC/POS Thermal and A4 Tax Invoice renderers |
| **Desktop Shell** | Tauri for Windows with offline persistence architecture |
| **Automated Testing** | Vitest (Calculations & Taxes) & Playwright (End-to-End POS) |

---

## 🏃 Getting Started

### Prerequisites
- Node.js `v18+` or `v20+` (Tested on `v22.22.1`)
- npm or yarn

### 1. Installation
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Automated Unit Tests
```bash
npx vitest run
```

---

## 📂 Project Structure

```
invoice/
├── src/
│   ├── app/
│   │   ├── audit-logs/           # Audit trail of sensitive actions
│   │   ├── categories/           # Category CRUD with Tamil names
│   │   ├── customers/            # Customer directory & credit balances
│   │   ├── expenses/             # Daily shop expenses (coolie, rent, freight)
│   │   ├── inventory/            # Live stock balances & ledger
│   │   ├── pos/                  # Flagship Point-of-Sale billing screen
│   │   ├── printer-settings/     # 80mm/58mm/A4 printer diagnostics
│   │   ├── products/             # Product catalog & PESO certifications
│   │   ├── purchases/            # Supplier inward bills & restock
│   │   ├── reports/              # GSTR-1, revenue, margins & cashier reports
│   │   ├── returns/              # Controlled returns & credit notes
│   │   ├── sales/                # Sales invoices register & reprinting
│   │   ├── shop-settings/        # Legal name, GSTIN, PESO, bank & UPI
│   │   ├── stock-adjustments/    # Physical stock count reconciliation
│   │   ├── suppliers/            # Manufacturer supplier directory
│   │   ├── sync/                 # Database backup JSON & cloud sync queue
│   │   ├── users/                # Role-based access control (Admin/Cashier/Stock)
│   │   ├── globals.css           # Global Tailwind and print CSS
│   │   ├── layout.tsx            # Main HTML layout
│   │   └── page.tsx              # Live Dashboard
│   ├── components/
│   │   └── layout/
│   │       └── Shell.tsx         # Responsive navbar and 18-module sidebar
│   ├── lib/
│   │   ├── calculations.ts       # Deterministic decimal & GST arithmetic
│   │   ├── calculations.test.ts  # Vitest unit test suite
│   │   ├── db.ts                 # Offline-first storage & database manager
│   │   ├── print.ts              # 80mm thermal & A4 PDF invoice generators
│   │   └── supabase.ts           # Supabase client & auth state
│   └── types/
│       └── index.ts              # Master TypeScript domain models
├── prisma/
│   └── schema.prisma             # Typed Prisma database schema
├── supabase/
│   └── migrations/
│       └── 20261017000001_initial_schema.sql # Master PostgreSQL & RLS migration
├── src-tauri/
│   └── tauri.conf.json           # Tauri Windows desktop packaging configuration
├── tests/
│   └── e2e.spec.ts               # Playwright end-to-end integration test
├── .env.example                  # Environment configuration template
└── package.json                  # Dependencies and build scripts
```

---

## 📜 Legal & Compliance Notice

- **Fireworks Compliance**: Fireworks items in Tamil Nadu must comply with PESO (Petroleum and Explosives Safety Organization) and CSIR-NEERI Green Cracker testing guidelines.
- **GST Rate**: Pyrotechnic articles and fireworks under HSN `3604` are subject to applicable GST (commonly 18% or 28% based on state notifications).
- **Tax Verification**: Verify your business registration status (Regular GST vs Composition Scheme) with a certified Indian Chartered Accountant or tax professional prior to commercial deployment.
