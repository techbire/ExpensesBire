# Import Report: `expenses_export.csv`

This report summarizes the stats, anomalies, and resolutions applied when ingesting `expenses_export.csv` into the Shared Expenses application.

---

## 📊 Import Statistics

| Metric | Count | Details |
| :--- | :--- | :--- |
| **Total Raw Rows** | 44 | Rows parsed from CSV. |
| **Valid Rows (Direct)** | 23 | Rows imported immediately with no issues. |
| **Anomaly Rows Flagged** | 21 | Rows flagged for review and manually resolved. |
| **Successfully Committed** | 42 | Final rows saved to the main database (Expenses + Settlements). |
| **Discarded Rows** | 2 | Duplicate entries rejected by the user. |

---

## 🔍 Anomaly Detection & Resolution Log

Below is the complete log of every anomaly detected by the rules engine and the action taken for resolution:

| Row | Date | Description | Amount / Currency | Flagged Anomaly | Action Taken & Resolution |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **6** | 08-02-2026 | dinner - marina bites | 3200 INR | **Duplicate** of Row 5 | **DISCARDED**: User flagged as duplicate; rejected row to prevent double-counting. |
| **7** | 10-02-2026 | Electricity Feb | "1,200" INR | **Formatting** (commas) | **IMPORTED**: Numeric string normalized to `1200.00`. |
| **9** | 14-02-2026 | Movie night snacks | 640 INR | **Alias/Casing** (`priya`) | **RESOLVED**: Casing normalized; mapped to canonical user `Priya`. |
| **10** | 15-02-2026 | Cylinder refill | 899.995 INR | **Precision / Rounding** | **IMPORTED**: High-precision `899.9950` stored in DB; display rounded to `900.00`. |
| **11** | 18-02-2026 | Groceries DMart | 1875 INR | **Alias** (`Priya S`) | **RESOLVED**: Mapped alias `Priya S` to canonical member `Priya`. |
| **13** | 22-02-2026 | House cleaning supplies | 780 INR | **Missing Payer** | **RESOLVED**: User assigned `Aisha` as payer based on group history. |
| **14** | 25-02-2026 | Rohan paid Aisha back | 5000 INR | **Settlement** | **CONVERTED TO SETTLEMENT**: Removed from expenses; saved as a 5000 INR payment from Rohan to Aisha. |
| **15** | 28-02-2026 | Pizza Friday | 1440 INR | **Split Conflict** (110%) | **MODIFIED**: Corrected percentages to: Aisha 30%, Rohan 25%, Priya 25%, Meera 20% (sum 100%). |
| **20** | 09-03-2026 | Goa villa booking | 540 USD | **Foreign Currency** | **IMPORTED**: Preserved USD currency; converted to base currency (`INR`) at rate `83.00` (`44820.00 INR`). |
| **21** | 10-03-2026 | Beach shack lunch | 84 USD | **Foreign Currency** | **IMPORTED**: Converted USD at `83.00` rate (`6972.00 INR`). |
| **23** | 11-03-2026 | Parasailing | 150 USD | **Guest Member & USD** | **RESOLVED**: Registered `Dev's friend Kabir` as a temporary guest profile; converted USD at `83.00`. |
| **24** | 11-03-2026 | Dinner at Thalassa | 2400 INR | **Near Duplicate** of Row 25 | **IMPORTED**: User verified Aisha's payment entry of `2400.00` was correct. |
| **25** | 11-03-2026 | Thalassa dinner | 2450 INR | **Near Duplicate** of Row 24 | **DISCARDED**: Double logged entry from Rohan rejected. |
| **26** | 12-03-2026 | Parasailing refund | -30 USD | **Negative Amount & USD** | **IMPORTED**: Confirmed as refund/reversal. Converted to base at `83.00` (`-2490.00 INR`). |
| **27** | Mar-14 | Airport cab | 1100 INR | **Ambiguous Date & Alias** | **RESOLVED**: Ambiguous date parsed to `14-03-2026`. Mapped `rohan ` (trailing space) to canonical `Rohan`. |
| **28** | 15-03-2026 | Groceries DMart | 2105 [None] | **Missing Currency** | **RESOLVED**: Set currency to default `INR` and imported. |
| **31** | 22-03-2026 | Dinner order Swiggy | 0 INR | **Zero Amount** | **IMPORTED**: Stored as zero-amount; excluded from ledger math. |
| **32** | 25-03-2026 | Weekend brunch | 2200 INR | **Split Conflict** (110%) | **MODIFIED**: Standardized splits to sum to 100%. |
| **34** | 04-05-2026 | Deep cleaning service | 2500 INR | **Ambiguous Date** | **RESOLVED**: Confirmed date as `05-04-2026` (April 5th, standard `DD-MM-YYYY`). |
| **36** | 02-04-2026 | Groceries BigBasket | 2640 INR | **Membership timeline** | **MODIFIED**: Removed Meera (inactive on April 2) from split; split equally among active users. |
| **38** | 08-04-2026 | Sam deposit share | 15000 INR | **Settlement** | **CONVERTED TO SETTLEMENT**: Saved as a 15000 INR payment from Sam to Aisha. |
| **42** | 18-04-2026 | Furniture for common room | 12000 INR | **Split Conflict** | **RESOLVED**: Mismatch between `equal` type and `shares` details resolved in favor of Equal split. |

---

## 🛡️ Applied Policy Summary

1. **Dates**:
   - standard `DD-MM-YYYY` formats are parsed directly.
   - Ambiguous formats (`Mar-14`, mixed day-month orders) are flagged and resolved by explicit manual mapping.
2. **Aliases**:
   - Case issues and spacing errors are cleaned automatically.
   - Explicit name mutations (`Priya S` vs `Priya`) are mapped canonicalizing back to the original database profiles.
3. **Settlements**:
   - Any transaction with description terms "paid back", "settle", or "deposit share" is isolated and logged as a debit-reducing settlement rather than an expense split.
4. **Precision**:
   - Display values are rounded to 2 decimal places, but database values preserve high decimal precision (up to 4 places) to prevent cumulative residue errors.
