# Restore FuelSuite Pro & Apply Green/Purple Contextual Theme

Restore the original FuelSuite Pro suite by removing the recent Daily Report Entry and Station Reports Archive additions, restoring standard navigation anchored on the FuelSuite Dashboard, and revamping the entire user interface to match the main app's signature pitch-black canvas with contextual green (positive inflows/profits) and deep purple (negative expenses/debts) accounting theme.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were clarified and confirmed with the user during Phase 1:
> - **Removed Features**: Remove `Daily Report Entry` and `Station Reports Archive` views from FuelSuite navigation and defaults to restore the core FuelSuite Pro workspace.
> - **Accounting Theme Rules**: Strict duality theme across all views: **Candlestick Green (`#00E676` / `text-emerald-400`)** for all positive inflows, revenue, cash collected, and profit margins; **Deep Purple (`#9333EA` / `#7C3AED` / `#A855F7`)** for all negative expenses, fuel purchase debts, supplier liabilities, and cash outflows; and **Slate Grey (`#94A3B8`)** for neutral metadata and fuel volume metrics.
> - **Branding & Identity**: Rebrand the navigation header and sidebar to **"FuelSuite Pro"** with sub-tagline "Station Operations & Fuel Accounting".

---

## 1. Overview & Core Concept

- **What It Does**: FuelSuite Pro is the dedicated station operations and fuel accounting management workspace for Loruk Energy Ltd filling stations (Ndalu, Junction, Bungoma, Bendera, etc.). It enables shift managers and directors to monitor white oils pump readings, LPG and lubricant purchases, operational station expenses, customer invoice debts, and total cash/bank reconciliations.
- **Target Audience**: Station managers, accountants, and company directors tracking real-time station margins, fuel volumes, and cash flow.
- **Key Value**: Provides a focused, high-contrast, distraction-free accounting workspace without unnecessary shift audit sub-flows, aligned with the main app's visual identity.

---

## 2. User Experience & Visual Design

### Navigation & Core Views
1. **Dashboard (`DashboardView`)**: High-level station KPI cards, combined product sales trends, expenses summary, and live status. (Default landing view).
2. **White Oils (`PumpReadingsView`)**: Pump meter readings, dispensing volume (Super PMS, Diesel AGO, Kerosene), pump test deductions, and revenue calculation.
3. **LPG & Purchases (`LPGView`)**: Gas cylinder sales, accessories, opening stocks, refill costs, and purchase liabilities.
4. **Expenses (`ExpensesView`)**: Categorized station operational expenses, petty cash logs, generator fueling, and utility disbursements.
5. **Invoices & Debts (`InvoicesView`)**: Credit customer invoices, pending station debts, payment receipts, and aging balances.
6. **Where the Money Is (`CashPositionView`)**: Comprehensive cash breakdown across cash-at-hand, till, M-Pesa balances, bank deposits, and net reconciliation.

### Visual Identity & Theme
- **Canvas Atmosphere**: Pure pitch-black background (`#000000`) consistent with DeepCharts Black across the main app.
- **Surface Elevation**: Cards, tables, and modal panels styled in deep black with subtle borders (`border-white/10 bg-white/[0.02]`) and interactive hover borders that glow green on positive revenue cards and purple on expense/debt cards.
- **Contextual Color Mapping**:
  - **Positive Green (`#00E676` / `text-emerald-400`, `bg-emerald-500/15`, `border-emerald-500/30`)**: Gross revenue, pump sales value, M-Pesa collections, bank remittances, net gross profit, positive cash differences.
  - **Negative Deep Purple (`#9333EA` / `#7C3AED` / `#A855F7`, `bg-purple-500/15`, `border-purple-500/30`)**: Station operating expenses, LPG purchase bills, customer invoices owed, cash shortages, equipment maintenance costs.
  - **Neutral Slate (`#94A3B8` / `#64748B`, `border-white/10`)**: Litre volumes, meter reading numbers, dates, station tags, product categories.

---

## 3. Key Architectural Decisions & Deletions

- **Decision 1: Clean Removal of Added Daily Report Shift Forms**:
  - *Chosen Approach*: Remove `Daily Report Entry` and `Station Reports Archive` from `FuelSuiteApp.tsx` imports, menu items, routes, and `ViewType` union. Set `initialView = 'Dashboard'`.
  - *Why*: Eliminates complex multi-tab shift entry and archive workflows that were added on top of the original FuelSuite Pro, restoring the streamlined classic experience.
- **Decision 2: UI Overhaul of Classic Views to Duality Accounting Theme**:
  - *Chosen Approach*: Update `DashboardView`, `PumpReadingsView`, `LPGView`, `ExpensesView`, `InvoicesView`, and `CashPositionView` to eliminate conflicting colors (blues, ambers, bright pinks) in favor of the strict green (positive) and deep purple (negative) duality system.
  - *Why*: Delivers visual continuity with the main Loruk Energy Ltd app and instant readability for financial data.

---

## 4. Technical Architecture & View Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 FuelSuite Pro Main Frame                    │
│    (Header: "FuelSuite Pro", Station Selector, Print)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
┌──────────────────────────────┐        ┌─────────────────────────────┐
│     Sidebar Navigation       │        │     Active Station View     │
│  - Dashboard                 │        │                             │
│  - White Oils (Pumps)        │───────►│  [Pitch-Black Canvas #000]  │
│  - LPG & Purchases           │        │  [Positive Green Inflows]   │
│  - Expenses                  │        │  [Negative Purple Outflows] │
│  - Invoices & Debts          │        │                             │
│  - Where the Money Is        │        │                             │
│  - Exit to Main App          │        │                             │
└──────────────────────────────┘        └─────────────────────────────┘
```

### Files to Modify
1. `src/pages/fuelsuite/FuelSuiteApp.tsx`:
   - Rename branding from "Fuel Suite" to "FuelSuite Pro" with subtitle "Station Operations & Fuel Accounting".
   - Remove `Daily Report Entry` and `Station Reports Archive` from `ViewType`, menu items, and view switch.
   - Set default view to `'Dashboard'`.
   - Update sidebar items and active states to clean green/purple badges.
2. `src/pages/fuelsuite/views/DashboardView.tsx`:
   - Style summary KPI metrics with positive green (revenue, net cash) and negative purple (expenses, pending invoices).
   - Theme charts with candlestick green and royal purple palettes.
3. `src/pages/fuelsuite/views/PumpReadingsView.tsx`:
   - Restyle pump meter reading tables, revenue totals, and testing deductions.
4. `src/pages/fuelsuite/views/ExpensesView.tsx`:
   - Restyle all expense category totals and table logs in deep purple.
5. `src/pages/fuelsuite/views/InvoicesView.tsx`:
   - Restyle invoice amounts, receivables, and debt tracking in deep purple and settlements in green.
6. `src/pages/fuelsuite/views/CashPositionView.tsx`:
   - Restyle total cash position, M-Pesa, bank accounts, and drawer cash in positive green.
7. `src/pages/fuelsuite/views/LPGView.tsx`:
   - Restyle sales in green and cylinder refills/purchases in deep purple.

---

## 5. Execution Summary

All planned tasks have been completed:
1. **Restored FuelSuite Pro Core Architecture**:
   - Removed `Daily Report Entry` and `Station Reports Archive` views from navigation and deleted temporary audit files (`DailyReportEntryView.tsx`, `StationReportsArchiveView.tsx`, `stationReportsDb.ts`).
   - Restored the 6 core FuelSuite Pro views: `Dashboard`, `White Oils`, `LPG & Purchases`, `Expenses`, `Invoices & Debts`, and `Where the Money Is`.
   - Updated default landing view to `'Dashboard'` and rebranded header/sidebar to **"FuelSuite Pro"**.
2. **Implemented Green and Purple Accounting Theme**:
   - Pure pitch-black canvas (`#000000`) across all views and modals.
   - **Candlestick Green (`#00E676` / `text-emerald-400`)**: Positive financial inflows, sales revenues, settled customer payments, till collections, bank balances, and net profit margins.
   - **Deep Purple (`#9333EA` / `#A855F7`)**: Negative financial outflows, operating expenses, customer receivables and credit risk debts, LPG supplier purchases, and cash shortages.
3. **Verification**:
   - `compile_applet` and `lint_applet` executed with 0 errors.
   - Dev server restarted.
