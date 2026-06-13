# Project Scope

## Product Overview
This is a shared household and trip expense reconciliation web application designed for real-world groups. Its primary purpose is to parse a messy CSV file of expenses, detect anomalies, allow user-driven review and correction, and calculate explainable member-to-member balances.

## Minimum Feature Set
1. **Authentication**: Secure login module.
2. **Group Management**: Create/manage groups and their base currencies.
3. **Membership Timeline**: Track member join and leave dates to validate expense participation.
4. **Expense Management**: Create and edit expenses with multiple split types.
5. **Split Types Supported**: Equal, Unequal (Exact), Percentage, Shares.
6. **Settlements**: Record payments between members separately from expenses.
7. **CSV Import Workflow**: Upload, parse, review anomalies, and commit.
8. **Explainable Balances**: Summary balances and line-by-line traceability.
9. **Relational Database**: Source of truth with audit logs for all actions.

## CSV Handling Policies

### Missing Data
- **Missing Payer**: Flag as `unresolved_payer`. Exclude from balance math until a payer is assigned during review.
- **Missing Currency**: Flag as `missing_currency`. Require manual resolution before import.

### Formatting and Aliases
- **Amounts**: Strip non-numeric characters (like commas).
- **Aliases**: Flag minor differences (case, spaces, `Priya S` vs `Priya`) and require user mapping approval.
- **Guests**: Unregistered names (e.g., `Dev's friend Kabir`) will be flagged. Users can either map them to a core member or create a temporary guest profile.

### Business Logic
- **Duplicates**: Exact and near-duplicates are flagged as `possible_duplicate`. Do not auto-delete. Require manual user approval.
- **Settlements**: Rows identified as payments (e.g., "Rohan paid Aisha back") are converted to `settlements` and do not create shared splits.
- **Negative Amounts**: Flagged for user confirmation as refunds.
- **Zero Amounts**: Accepted but excluded from balance calculations. Visible in logs.

### Split Conflicts
- **Percentage Sum Mismatch**: If percentages do not sum to 100% (e.g., sum to 110%), the row is quarantined. The user must manually correct the percentages.
- **Type Mismatch**: If `split_type` is `equal` but `split_details` provide `shares`, flag as `split_conflict` and let the user decide which to honor.

### Dates and Timelines
- **Ambiguous Dates**: Formats like `Mar-14` or `04-05-2026` are flagged as `needs_review`. User must explicitly confirm the date.
- **Membership Validation**: Members included in an expense split who are inactive on the expense date (e.g., Meera after moving out) will trigger a `membership_violation` anomaly.

### Currency
- **Foreign Currency**: Preserve original currency. Prompt user to provide an exchange rate or use a seeded rate to calculate `amount_base`. Never assume USD is INR.

### Rounding
- Store amounts in the database as decimals (e.g., `DECIMAL(10,4)`).
- Round to 2 decimal places only for display. 

## Non-Scope
- Personal budgeting.
- B2B invoicing.
- Bank API integrations.
- Auto-resolving ambiguous data without user consent.
