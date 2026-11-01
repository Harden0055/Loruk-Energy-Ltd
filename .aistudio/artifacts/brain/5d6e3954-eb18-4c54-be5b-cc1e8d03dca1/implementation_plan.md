# Fleet Fueling: Consumed Product Selection (Diesel, Engine Oil, Brake Fluid, Greasing)

Introduce product selection to the Fleet Fueling expense tracking workflow so fleet managers can accurately log and audit whether a truck consumed Diesel, Engine Oil, Brake Fluid, or Greasing, complete with table filtering and PDF export reporting.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design decisions were confirmed during Phase 1 clarification:
> - **Default Product**: Newly opened expense forms will default to **Diesel** automatically for rapid entry.
> - **Calculation & Quantity Flexibility**: Allows entering either Quantity (Litres/Units) × Rate for auto-calculating Amount, or entering the Amount directly for fixed-fee services like Greasing.
> - **Visibility & Reporting**: Consumed product will be displayed as a dedicated column in the logs table, available in the top filter bar as a product dropdown, and included in the PDF export.

- **Confirmed Decision 1**: Supported products are `Diesel`, `Engine Oil`, `Brake Fluid`, and `Greasing`.
- **Confirmed Decision 2**: Existing logs without an explicit product will gracefully fallback to `Diesel` in displays and reports.

---

## 1. Overview & Core Concept

- **What It Does**: Enhances the "Add Expense" form in Fleet Fueling by adding a **Product** dropdown selector alongside Vehicle and Station. Logs and displays the exact item consumed (`Diesel`, `Engine Oil`, `Brake Fluid`, or `Greasing`), allows filtering logs by product, and includes the product breakdown in PDF summaries.
- **Target Audience / Persona**: Fleet managers, station attendants, and operations auditors monitoring fleet consumables and maintenance costs per vehicle.
- **Key Value**: Prevents non-fuel maintenance consumables (engine oil, lubricants, brake fluid) from being misattributed solely as fuel litres, enabling accurate per-product cost accounting across trucks and stations.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Adding a Fleet Expense**:
   - The user clicks **Add Expense** on the Fleet Fueling page.
   - The form displays Date, Vehicle, Station, and a new **Product** selector defaulted to `Diesel`.
   - The user can select `Diesel`, `Engine Oil`, `Brake Fluid`, or `Greasing`.
   - When `Diesel` or oils are chosen, entering Litres and Rate auto-computes Amount (or vice versa). When `Greasing` or fixed maintenance is chosen, the user can either enter Litres/Units or type Amount directly without being blocked.
   - Clicking **Save** persists the record with its chosen product.

2. **Editing an Existing Expense**:
   - Clicking the edit pencil on any row populates the form with the expense's saved product, car, station, date, rate, and amount.
   - The user can change the product and click **Update**.

3. **Filtering & Searching**:
   - A new **Product** filter dropdown (`All Products`, `Diesel`, `Engine Oil`, `Brake Fluid`, `Greasing`) sits in the filter toolbar alongside Car, Station, and Date Range.
   - The summary card dynamically recalculates the filtered count and total KES for the selected product.

4. **Table & PDF Export**:
   - A **Product** column is added to the historical table with thematic badges matching the DeepCharts visual language (e.g. emerald for Diesel, violet for Engine Oil, amber for Brake Fluid, cyan for Greasing).
   - Exporting the PDF includes the Product column in the tabular breakdown and itemizes consumption by product in the executive summary.

### Visual Identity & Theme Alignment

- **Theme Compliance**: Adheres to DeepCharts Black (`#000000` canvas, `#121212` / `#18181B` surface panels, `#94A3B8` soft silver-grey labels and typography).
- **Subdued Accents**: Deep purple (`#7C3AED`) and emerald green (`#059669`) consistent with existing controls and badges.
- **Zero-Pill Restraint**: Clean text and unboxed typographic separators for metadata; subtle pill tags reserved only for functional category badges.
- **Tabular Figures**: All currency, quantities, and rates formatted with `tabular-nums` and monospace styling.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Flexible Quantity / Amount Entry for Maintenance Items**
  - *Chosen Approach*: Allow entering quantity and rate, OR entering amount directly without requiring litres/units for greasing.
  - *Why*: Greasing is typically charged as a flat service fee per axle or truck, whereas oil and diesel are charged per litre.
- **Decision 2: Backwards Compatibility for Historical Records**
  - *Chosen Approach*: If an existing record lacks a `product` property, treat it as `Diesel` by default (`e.product || 'Diesel'`).
  - *Why*: Historical records in `fleetExpenses` were recorded prior to this feature and represent diesel fuelings.
- **Decision 3: Non-Destructive Extension**
  - *Chosen Approach*: Add `product?: string` to `FleetExpense` interface in `src/types.ts` and update mutations in `src/lib/db.ts` and `src/pages/Fleet.tsx` without changing existing collections or schema invariants.

---

## 4. Technical Architecture & Data Strategy

### Component Hierarchy & Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Fleet Page (Fleet.tsx)               │
├─────────────────────────────────────────────────────────┤
│  Top Action Bar                                         │
│   ├── Truck Dashboard Link                              │
│   ├── Export PDF (Includes Product Column & Summary)    │
│   └── Add Expense Toggle                                │
├─────────────────────────────────────────────────────────┤
│  Add / Edit Expense Form                                │
│   ├── Date Picker (Sticky static date)                  │
│   ├── Vehicle Select + Quick Add Modal Shortcut         │
│   ├── Station Select + Quick Add Modal Shortcut         │
│   ├── [NEW] Product Select (Diesel, Oil, Brake, Grease) │
│   ├── Litres / Qty Input (Flexible)                     │
│   ├── Rate (KES/L) Input (Auto Rate × Qty)              │
│   ├── Amount (KES) Input                                │
│   └── Save / Update & Cancel Buttons                    │
├─────────────────────────────────────────────────────────┤
│  Filter Bar & Analytics Strip                           │
│   ├── Car Filter                                        │
│   ├── Station Filter                                    │
│   ├── [NEW] Product Filter Dropdown                     │
│   ├── Date Range Filter (From / To)                     │
│   └── Filtered Total Summary & Fleet Comparison Chart   │
├─────────────────────────────────────────────────────────┤
│  Historical Fleet Logs Table                            │
│   ├── Date                                              │
│   ├── Car                                               │
│   ├── Station                                           │
│   ├── [NEW] Product Badge Column                        │
│   ├── Litres / Qty                                      │
│   ├── Amount (KES)                                      │
│   └── Actions (Edit / Delete)                           │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │ Firestore: fleetExpenses  │
              │  - carRegistration: string│
              │  - station: string        │
              │  - product: string        │
              │  - litres?: number        │
              │  - rate?: number          │
              │  - amount: number         │
              │  - date: number           │
              │  - createdBy: string      │
              └───────────────────────────┘
```

### Proposed Changes

1. **`src/types.ts`**:
   - Update `FleetExpense` interface to include `product?: 'Diesel' | 'Engine Oil' | 'Brake Fluid' | 'Greasing' | string`.

2. **`src/pages/Fleet.tsx`**:
   - Add `product` state in the component (`Diesel` by default).
   - Insert Product `<select>` into the Add Expense grid:
     - Options: `Diesel`, `Engine Oil`, `Brake Fluid`, `Greasing`.
   - Update `handleLitresChange`, `handleRateChange`, and `handleAmountChange` to allow optional quantity when greasing is selected.
   - Update `handleSubmit` to save `product` on both create and update operations.
   - Update edit handler to restore `e.product || 'Diesel'` into the form state.
   - Add `selectedProduct` filter state and dropdown in the filter controls bar (`All Products`, `Diesel`, `Engine Oil`, `Brake Fluid`, `Greasing`).
   - Add `Product` column to the table header and body rows with styled badges.
   - Update `generatePDF` to include `Product` in table columns and summary breakdown.

3. **`src/pages/TruckDashboard.tsx`**:
   - Display the `Product` column in the Historic Fueling table for complete cross-view consistency.

---

## 5. Verification Plan

1. **Lint & Compilation**: Run `lint_applet` and `compile_applet` to verify zero TypeScript or syntax errors.
2. **Form Interaction**:
   - Open Add Expense form, verify product defaults to `Diesel`.
   - Switch product to `Engine Oil`, `Brake Fluid`, and `Greasing`.
   - Enter Litres and Rate; verify Amount calculates correctly.
   - Enter Amount directly for Greasing; verify form submits cleanly.
3. **Table & Filtering**:
   - Verify saved logs show the appropriate product badge in the table.
   - Filter by product in the filter dropdown; verify only matching records display and totals recompute.
4. **PDF Export**:
   - Trigger PDF download and verify the PDF table includes the Product column.
