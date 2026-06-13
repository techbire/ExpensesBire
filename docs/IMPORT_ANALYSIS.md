# Import Analysis

This document analyzes the `expenses_export.csv` file row-by-row to detect anomalies, categorize them, and establish the requirements for the import engine.

## Row-by-Row Analysis

| Row | Date | Description | Amount | Anomaly Detected | Category |
|---|---|---|---|---|---|
| 6 | 08-02-2026 | dinner - marina bites | 3200 INR | Exact amount, date, and participants as row 5. | **Duplicate** |
| 7 | 10-02-2026 | Electricity Feb | "1,200" INR | Amount contains a comma formatting character. | **Formatting** |
| 9 | 14-02-2026 | Movie night snacks | 640 INR | Payer name casing is `priya` instead of `Priya`. | **Alias/Casing** |
| 10 | 15-02-2026 | Cylinder refill | 899.995 INR | Amount contains 3 decimal places. | **Precision/Rounding** |
| 11 | 18-02-2026 | Groceries DMart | 1875 INR | Payer name is `Priya S` instead of `Priya`. | **Alias** |
| 13 | 22-02-2026 | House cleaning supplies | 780 INR | Missing `paid_by` field. | **Missing Data** |
| 14 | 25-02-2026 | Rohan paid Aisha back | 5000 INR | Logged as expense but is a settlement/payback. | **Settlement** |
| 15 | 28-02-2026 | Pizza Friday | 1440 INR | `percentage` split type, but percentages sum to 110%. | **Split Conflict** |
| 20 | 09-03-2026 | Goa villa booking | 540 USD | Currency is `USD` instead of base currency (`INR`). | **Foreign Currency** |
| 21 | 10-03-2026 | Beach shack lunch | 84 USD | Currency is `USD`. | **Foreign Currency** |
| 23 | 11-03-2026 | Parasailing | 150 USD | Includes unregistered guest member `Dev's friend Kabir`. | **Guest Member** |
| 24 | 11-03-2026 | Dinner at Thalassa | 2400 INR | Very similar to row 25 with slightly different amount. | **Near Duplicate** |
| 25 | 11-03-2026 | Thalassa dinner | 2450 INR | Conflict with row 24. | **Near Duplicate** |
| 26 | 12-03-2026 | Parasailing refund | -30 USD | Amount is negative. | **Negative Amount** |
| 27 | Mar-14 | Airport cab | 1100 INR | Ambiguous date format `Mar-14`. Payer `rohan ` has extra space. | **Ambiguous Date, Alias** |
| 28 | 15-03-2026 | Groceries DMart | 2105 | Missing currency field. | **Missing Data** |
| 31 | 22-03-2026 | Dinner order Swiggy | 0 INR | Amount is 0. | **Zero Amount** |
| 32 | 25-03-2026 | Weekend brunch | 2200 INR | `percentage` split type, percentages sum to 110%. | **Split Conflict** |
| 34 | 04-05-2026 | Deep cleaning service | 2500 INR | Ambiguous date: `04-05-2026` vs standard `DD-MM-YYYY`. | **Ambiguous Date** |
| 36 | 02-04-2026 | Groceries BigBasket | 2640 INR | Member `Meera` included in split after leaving group. | **Membership Timeline** |
| 38 | 08-04-2026 | Sam deposit share | 15000 INR | Logged as expense, but is a deposit/settlement for new member. | **Settlement** |
| 42 | 18-04-2026 | Furniture for common room | 12000 INR | Split type `equal`, but details specify `shares`. | **Split Conflict** |

## Anomaly Categories

1. **Missing Data**: Missing payer (row 13), missing currency (row 28).
2. **Formatting/Parsing**: Commas in amounts (row 7), extra spaces in names (row 27), case differences (row 9), 3 decimal precision (row 10).
3. **Duplicates & Conflicts**: Exact duplicates (row 6), near duplicates (rows 24 & 25).
4. **Aliases & Guests**: Aliases like `Priya S` (row 11), temporary guests like `Dev's friend Kabir` (row 23).
5. **Split Engine Violations**: Percentages not summing to 100 (rows 15, 32), Split type vs details mismatch (row 42).
6. **Date Ambiguity**: Missing year or alternate formats (row 27, 34).
7. **Business Logic Anomalies**: Settlements logged as expenses (row 14, 38), negative amounts/refunds (row 26), zero amounts (row 31).
8. **Membership Constraints**: Ex-member charged for expense (row 36).
9. **Currency conversion**: USD entries needing base currency equivalent (rows 20, 21, 23, 26).

## Required Importer Workflow

The importer must:
1. Parse the CSV using `papaparse` and preserve the raw payload.
2. Run a rules engine to flag the above anomaly categories.
3. Present an interactive UI where the user can:
   - Map aliases.
   - Supply missing data.
   - Resolve date ambiguities.
   - Convert settlements.
   - Correct split conflicts.
   - Approve or reject duplicates.
4. Log every user decision into `import_anomalies`.
