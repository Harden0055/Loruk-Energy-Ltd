# Receipt Proof Attachments & Fleet Fueling Deep Purple Bar Graph

A comprehensive enhancement to transaction integrity and reporting visual aesthetics across Loruk Energy's logistics suite. This update adds dual-option receipt proof capture (file browser and drag-and-drop zone, along with text/memo references) for customer payments and fleet fueling logs, paired with an interactive receipt viewer modal and Deep Royal Violet styling for the fleet fueling comparison bar graph.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during interactive clarification and define the exact implementation:

- **Receipt Viewing**: Clickable badge (`[Receipt Proof]`) directly within transaction tables that opens a dedicated image & text preview modal.
- **Attachment Interface**: Unified uploader container with two prominent file options ("Browse / Open Files" button and an active Drag & Drop surface) plus a secondary Text Memo tab for transaction references, M-Pesa codes, or notes.
- **Bar Graph Theme**: Deep Royal Violet (`#6D28D9`) applied to the fleet fueling comparison bar charts across the main Fleet view, Truck Dashboard, and Executive Overview.

---

### 1. Overview & Core Concept

1. **Transaction Integrity & Audit Proof**:
   - Financial transactions (Customer Payments in both Customer Directory and Customer Statement profiles) and vehicle operational expenses (Fleet Fueling logs) can now store concrete proof of transaction.
   - Operators can either drag-and-drop a receipt photo/scan, browse and select local files, or record an alphanumeric reference code (e.g. M-Pesa transaction ID, bank deposit reference, physical voucher serial number).

2. **Visual Consistency in Fleet Analytics**:
   - The fleet fueling bar graphs are aligned to the system's calibrated Deep Royal Violet (`#6D28D9`), harmonizing with debit figures and eliminating legacy blue or magenta tones.

---

### 2. User Experience & Visual Design

#### A. Dual-Option Receipt Proof Uploader Component (`ReceiptProofUploader`)
- **Compact Segmented Mode Selector**:
  - `File Upload` (active by default): Presents a dashed dropzone with calm violet hover borders (`border-[#6D28D9]/40`).
    - **Option 1**: A prominent `"Browse Files"` button that opens the system file picker.
    - **Option 2**: An active `"Drop receipt image here"` target area accepting file drag-and-drop events.
    - Includes image compression/reading to base64 Data URL, instant thumbnail preview, file name display, and a quick-remove button.
  - `Reference Memo / Text`: A dedicated textarea for typing or pasting payment references, voucher text, or transaction IDs.
- **Compact Footprint**: Form factor designed to fit comfortably within modal forms without requiring excessive vertical scrolling.

#### B. Clickable Table Badge & Interactive Modal Viewer
- **Table Indicator**:
  - In `Payments` and `CustomerDashboard` transaction lists, payments with proof display a sleek `[Receipt]` badge with a paperclip/receipt icon in calm violet (`bg-[#6D28D9]/15 text-[#6D28D9] border-[#6D28D9]/30 hover:bg-[#6D28D9]/25`).
  - In `Fleet` and `TruckDashboard` expense rows, fueling entries with proof display an identical interactive badge.
- **Receipt Preview Modal (`ReceiptProofModal`)**:
  - Displays high-resolution image preview with full-width fit, zoom toggle, and download capability.
  - Renders formatted text/reference codes with one-click copy to clipboard.
  - Summarizes linked transaction details (Date, Vehicle/Customer, Amount in KES, Created By).

#### C. Fleet Fueling Bar Graph Restyling
- **Recharts Bar Color**: Replaced with Deep Royal Violet (`#6D28D9`) across:
  - `Fleet.tsx` (Fleet Fueling Comparison chart).
  - `Dashboard.tsx` (Executive Fleet Fueling Comparison chart).
  - `TruckDashboard.tsx` (Vehicle Spend Breakdown chart).
- **Tooltip Accent**: Updated cursor fill and border styling to `#6D28D9` for complete visual cohesion.

---

### 3. Key Product Decisions & Trade-Offs

- **Client-Side Image Ingestion (Data URLs)**:
  - *Chosen Approach*: Convert attached receipt images directly to compressed base64 strings stored inside the payment and fleet documents.
  - *Why*: Instant availability across offline, quota-exceeded local fallback modes, and live Firestore sync without requiring secondary cloud bucket configuration or third-party storage setup.
  - *Guardrail*: Client-side canvas resizing limits image dimensions to a maximum of 1200px width/height and 0.8 JPEG quality, keeping document payloads lean and snappy.
- **Combined Image & Text Support**:
  - Both an image and a reference text memo can be stored simultaneously, ensuring cashiers can record an M-Pesa confirmation code alongside a physical slip photo.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                       Loruk Energy Suite                        │
│                                                                 │
│   ┌───────────────────────────┐    ┌────────────────────────┐   │
│   │   Record Payment Form     │    │   Fleet Fueling Form   │   │
│   │   (CustomerDashboard /    │    │      (Fleet.tsx)       │   │
│   │       Payments.tsx)       │    │                        │   │
│   └─────────────┬─────────────┘    └───────────┬────────────┘   │
│                 │                              │                │
│                 ▼                              ▼                │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │               ReceiptProofUploader Component            │   │
│   │  ┌───────────────────────┐  ┌────────────────────────┐  │   │
│   │  │ Option 1: File Dialog │  │ Option 2: Drag & Drop  │  │   │
│   │  └───────────────────────┘  └────────────────────────┘  │   │
│   │  ┌───────────────────────────────────────────────────┐  │   │
│   │  │ Tab 2: Reference Code / Text Proof Memo           │  │   │
│   │  └───────────────────────────────────────────────────┘  │   │
│   └─────────────────────────────┬───────────────────────────┘   │
│                                 │                               │
│                                 ▼                               │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │            Firestore / LocalDB Storage Layer            │   │
│   │  • Payment: { ...fields, receiptImage, receiptText }    │   │
│   │  • FleetExpense: { ...fields, receiptImage, receiptText }│   │
│   └─────────────────────────────┬───────────────────────────┘   │
│                                 │                               │
│                 ┌───────────────┴───────────────┐               │
│                 ▼                               ▼               │
│   ┌───────────────────────────┐   ┌─────────────────────────┐   │
│   │  Clickable Table Badges   │   │  ReceiptProofModal      │   │
│   │  (Payments, Statements,   │──▶│  • Full image viewer    │   │
│   │   Fleet Log Data Grids)   │   │  • Reference copy memo  │   │
│   └───────────────────────────┘   └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

#### State & Data Types
1. **Type Definition Updates (`src/types.ts`)**:
   - `Payment`: Add optional `receiptImage?: string` and `receiptText?: string`.
   - `FleetExpense`: Add optional `receiptImage?: string` and `receiptText?: string`.
2. **Form State Extensions**:
   - `receiptFile: string | null` (Base64 string).
   - `receiptText: string` (Reference text).
3. **Chart Visual Configuration**:
   - `fill="#6D28D9"` on all Fleet Fueling `<Bar />` elements.
