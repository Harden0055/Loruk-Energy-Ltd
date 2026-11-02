# Global Figure Color Refinement: Deep Royal Violet

Replace all light purple, pink, and rose color tokens across application tables, metric cards, and debit totals with a true, saturated Deep Royal Violet (`#6D28D9`), strictly eliminating any reddish or pinkish undertones.

## User Review & Critical Decisions

> [!IMPORTANT]
> The clarifying questions were answered and confirmed by the user:
> - **Confirmed Color Token**: **Deep Royal Violet (`#6D28D9`)**, a true deep, saturated royal purple with zero magenta/pink cast, calibrated for maximum contrast and readability on deep black surfaces (`#000000` / `#09090B`).
> - **Confirmed Target Scope**: **All numerical amounts, table figures, and debit totals** across Fleet Fueling, Deliveries, Customer Ledger, Station Dashboards, Truck Analytics, and FuelSuite reports.
> - **Contrast & Readability**: Pair `#6D28D9` with `font-mono` and `font-bold` for vertical tabular alignment, ensuring WCAG AA legibility against dark slate and black background panels.

---

## 1. Overview & Core Concept

- **What It Does**: Standardizes the financial typography and numerical color palette across all operational views. All debit figures, transaction values, delivery amounts, and expense logs transition from previous pinkish/soft violet tones (`#8B5CF6`, `text-purple-400`, `text-rose-*`, `text-pink-*`) to an authoritative, deep royal violet (`#6D28D9`).
- **Target Audience**: Fleet managers, station accountants, dispatch controllers, and company leadership monitoring high-value fuel ledger transactions.
- **Key Value**: Provides a visually cohesive, professional, high-contrast display for financial metrics with zero color ambiguity or pinkish hue distortion.

---

## 2. User Experience & Visual Design

### Color & Typography System
- **Deep Royal Violet Token**: `#6D28D9` (`rgb(109, 40, 217)`). This shade sits firmly in the blue-violet spectrum with zero pink/magenta bleed.
- **Accompanying Debit Icon & Accent Tint**:
  - Main numerical text: `text-[#6D28D9] font-mono font-bold tabular-nums`
  - Subtle debit wrappers: `bg-[#6D28D9]/15 border-[#6D28D9]/30`
  - Debit indicators: `ArrowUp`, `Coins`, and debit transaction badges tinted in matching `#6D28D9`
- **Strict Anti-Slop Discipline**:
  - No decorative pulsing dots or artificial status tags.
  - Tabular numerals (`tabular-nums`) maintained across all tables for aligned decimal places.
  - Clean hairline borders (`border-white/[0.08]` / `border-theme-border`) without multi-elevation card clutter.

### Targeted Views & Elements
1. **Ledger (`/ledger`)**:
   - Filtered Debits (Deliveries) KPI card: `text-[#6D28D9]` and matching arrow icon.
   - Net Change (Due state) amount: `text-[#6D28D9]`.
   - Table Debit amount column: `text-[#6D28D9] font-mono font-bold`.
2. **Deliveries (`/deliveries`)**:
   - Total Delivered Value KPI card: `text-[#6D28D9]`.
   - Table Amount column and total summary value: `text-[#6D28D9]`.
3. **Fleet Fueling (`/fleet`)**:
   - Expense table Amount column: `!text-[#6D28D9] font-mono font-bold`.
   - Vehicle registration link accents and total filtered figure.
4. **Customer Dashboard (`/customers/:id`)**:
   - Total Debits, Invoiced Amount, and Outstanding Due balance figures: `text-[#6D28D9]`.
   - Statement table debit columns.
5. **Station Dashboard (`/stations/:id`) & Truck Dashboard (`/trucks/:id`)**:
   - Expense summaries, debit disbursements, and vehicle fueling total values.
6. **FuelSuite Views (`/fuelsuite/*`)**:
   - ExpensesView, DailyReportView, DailyReportEntryView, and DashboardView: All expense and debit figures updated to `#6D28D9`.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct CSS Token `#6D28D9` vs. Generic Tailwind Classes**:
  - *Chosen Approach*: Enforce `#6D28D9` directly on targeted financial figure classes (`text-[#6D28D9]`) rather than generic `text-purple-400` or `text-purple-500` which lean magenta under certain monitor color profiles.
  - *Why*: Ensures pixel-exact color fidelity matching the user's sample image without unintended browser color space drift.
- **Decision 2: Scope Boundaries**:
  - *Chosen Approach*: Apply `#6D28D9` to all numerical amounts, debit totals, and direct debit indicators while preserving credit figures in Emerald Green (`#059669` / `#10B981`) for clear debit/credit accounting contrast.

---

## 4. Technical Architecture & Execution Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                 Global Design System Tokens                 │
│   Primary Debit Figure: #6D28D9 (Deep Royal Violet)         │
│   Credit Figure:        #059669 / #10B981 (Emerald Green)   │
│   Neutral / Litres:     Theme Slate (#F8FAFC / #94A3B8)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┼────────────────────────┐
       ▼                       ▼                        ▼
┌──────────────┐       ┌──────────────┐         ┌──────────────┐
│  Operations  │       │  Accounting  │         │  FuelSuite   │
├──────────────┤       ├──────────────┤         ├──────────────┤
│ Deliveries   │       │ Ledger       │         │ ExpensesView │
│ Fleet        │       │ CustomerDash │         │ DailyReports │
│ Trucks       │       │ StationDash  │         │ Dashboard    │
└──────────────┘       └──────────────┘         └──────────────┘
       │                       │                        │
       └───────────────────────┼────────────────────────┘
                               ▼
               Clean Compile & Verification Turn
               (tsc --noEmit & compile_applet)
```

### Execution Steps
1. **Operations Module**: Update `Deliveries.tsx`, `Fleet.tsx`, `TruckDashboard.tsx`, and `StationDashboard.tsx`.
2. **Ledger & Customer Module**: Update `Ledger.tsx` and `CustomerDashboard.tsx`.
3. **FuelSuite Module**: Update `ExpensesView.tsx`, `DailyReportView.tsx`, `DailyReportEntryView.tsx`, and `DashboardView.tsx`.
4. **Verification**: Run TypeScript type check and compile verification to ensure zero build regressions.
