# FireStore Security Specification (TDD)

## 1. Data Invariants
- **Authentication**: All operations (read, create, update, delete) on station data collections (stations, pump_readings, fuel_rates, lpg_inventory, lpg_sales, burner_inventory, burner_sales, expenses, cash_positions, invoices, daily_reports) require the user to be certified and signed in (`request.auth != null`).
- **Data Integrity**: Numeric fields like litres, rates, amounts, quantities, balances, and stock levels must be strictly non-negative (`>= 0`).
- **Temporal Integrity**: Fields like `createdAt` and `updatedAt` are immutable/set to the current request timestamp (`request.time`).
- **Station Scope**: Write operations must specify a valid station partition (`station in ['Ndalu', 'Junction']`).

---

## 2. The "Dirty Dozen" Malicious Payloads

### Payload 1: Unauthenticated Read Attempt
- **Collection**: `customers`
- **Attack**: Read full customer ledger without signing in.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 2: Self-Allocating Admin Role (Privilege Escalation)
- **Collection**: `users`
- **Attack**: Registering a user profile with `role = 'admin'` manually.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 3: Identity Spoofing (Owner Spoofing)
- **Collection**: `payments`
- **Attack**: Saving a payment where `createdBy` is different from the logged in user's UID or email.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 4: Negative Fuel Rate Poisoning
- **Collection**: `fuel_rates`
- **Attack**: Setting a fuel rate for diesel at `-1.50` per litre to disrupt calculations.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 5: Negative Meter Start (Pump Reading Poisoning)
- **Collection**: `pump_readings`
- **Attack**: Setting `litresStart = -100` resulting in fraudulent sales volume calculations.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 6: Out-of-Bound Stock Levels (Denial of Service)
- **Collection**: `lpg_inventory`
- **Attack**: Setting cylinder `stockLevel = -1000` or a extremely large number.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 7: Negative Sales Amounts on Burner Purchases
- **Collection**: `burner_purchases`
- **Attack**: Creating a purchase with cost `< 0`.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 8: Illegal Document Path ID (ID Poisoning Attack)
- **Collection**: `stations`
- **Attack**: Attempting to create a station document with ID `../../ST-HACKED` containing poison directories or illegal characters.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 9: Shadow Ghost Fields Inclusion
- **Collection**: `expenses`
- **Attack**: Injecting an extra field `isApprovedBySystem: true` to bypass verification steps while logging cash spending.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 10: Negative Cash Reconciliation (Cash Positions)
- **Collection**: `cash_positions`
- **Attack**: Reporting a negative MPesa or physical cash amount to simulate cash loss.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 11: Direct Balance Modification on Daily Invoices
- **Collection**: `invoices`
- **Attack**: Manually modifying the invoice balance/due fields without submitting a payment ledger item.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 12: Terminal State Tampering
- **Collection**: `daily_reports`
- **Attack**: Attempting to update or delete a finalized, terminal state report.
- **Expected Outcome**: `PERMISSION_DENIED`

---

## 3. The Firebase Security Rules Test Runner
Tests are performed using the Firebase Firestore Emulator environment, verifying that all of the above payloads return permissions errors.
