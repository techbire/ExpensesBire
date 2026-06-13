# Implementation Plan

## Phase 1: Foundation
- **Setup**: Initialize Next.js 15 App Router with TypeScript and Tailwind CSS.
- **Database**: Setup Neon PostgreSQL. Initialize Prisma schema.
- **Authentication**: Setup NextAuth.js (Credentials provider).
- **Core UI**: Implement layout, navigation, and auth screens.

## Phase 2: Groups & Memberships
- **Groups API**: Create, read, update groups.
- **Memberships API**: Add members to groups, handle join/leave dates.
- **UI**: Group dashboard, members management modal.

## Phase 3: Expense Engine & Split Logic
- **Split Engine**: Build pure functions to calculate `amount_base` and `final_owed_amount` for EQUAL, UNEQUAL, PERCENTAGE, and SHARE splits.
- **Manual Entry**: Build UI to manually add expenses and settlements.
- **Persistence**: Save expenses, splits, and settlements to the DB with transaction guarantees.

## Phase 4: CSV Import & Anomaly Engine
- **File Upload**: Build drag-and-drop CSV upload component.
- **Parser**: Integrate `papaparse` to read raw rows.
- **Rule Engine**: Build logic to detect all anomalies identified in `IMPORT_ANALYSIS.md`.
- **Review UI**: Build the interactive import queue where users resolve flagged issues (mapping aliases, fixing dates, converting settlements).
- **Commit Logic**: Save resolved rows into the main `expenses` and `settlements` tables.

## Phase 5: Balance Calculation & Ledger
- **Math Engine**: Build the balance aggregator that sums credits and debits per member.
- **Traceability View**: Build a "Member Statement" UI that lists every line-item contributing to a user's balance.
- **Settlement Recommendations**: Algorithm to suggest minimal transactions to settle debts.

## Phase 6: Reporting & Polish
- **Import Report**: Generate a summary of the CSV import process showing rows parsed, anomalies fixed, and user decisions.
- **Audit Logs**: Ensure all critical actions write to `audit_logs`.
- **UI Polish**: Refine error states, loading states, and responsive design.

## Phase 7: Deployment & Documentation
- **Tests**: Write unit tests for Split Engine, Balance Engine, and Anomaly Rules.
- **Docs**: Finalize `README.md` and `AI_USAGE.md`.
- **Deployment**: Deploy to Vercel.
