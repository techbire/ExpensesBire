# Master Build Prompt: Shared Expenses App

You are an expert full-stack engineering agent acting as both Product Manager and Developer. Build this project from scratch to production quality using the assignment below as the source of truth. Do not build a generic finance app. Build a shared expenses app for a small real-world group with messy data, membership changes over time, multiple split types, settlements, and a deliberate CSV import cleanup workflow.

## 0) Non-negotiable rules
1. Read the assignment fully before coding.
2. Read `expenses_export.csv` fully before coding.
3. Detect every anomaly in the CSV before import.
4. Do not silently guess on ambiguous data.
5. Keep an audit trail for imports, anomaly handling, and balance calculations.
6. Make balances explainable line by line.
7. Use **Next.js** for the app.
8. The assignment explicitly says **relational DBs only**, so the source of truth must be Neon PostgreSQL (or another free relational PostgreSQL host if Neon is unavailable).
9. Use only free or open-source AI APIs or local models. No paid APIs.

## 1) Product goal
Build and deploy a shared expenses app for a group of flatmates and trip participants. The app must let users:
- log in
- create and manage groups
- manage membership changes over time
- create and edit expenses
- record settlements and payments
- import the provided CSV exactly as-is
- see group-wise balances and individual balance summaries
- trace every balance back to the source expenses
- review and approve import anomalies

The app must be understandable in a live review session. Reviewers may ask you to trace a row from CSV to final balance, explain a rounding rule, or change a split rule live.

## 2) Scope
This is a shared household and trip expense reconciliation app.

It is not:
- a personal budgeting app
- a business accounting system
- a bank reconciliation product
- a B2B invoice manager
- a generic finance dashboard

The app must be opinionated about shared expenses, reimbursements, and balance settlement.

## 3) Minimum feature set
Implement all of the following:
1. Login module
2. Group creation and management
3. Membership changes over time
4. Expense creation and editing
5. All split types present in the CSV
6. Group-wise balances
7. Individual balance summaries
8. Settlement or payment recording
9. CSV import through the app
10. Relational DB source of truth

## 4) Core product behavior
The app must support two kinds of users:
- a person who wants one settlement number per member
- a person who wants full traceability for every balance number

Therefore the UI and backend must support:
- summary balance cards
- detailed drill-down per member
- line-item contribution tracing
- import review queues
- audit logs for all important transformations

## 5) The CSV must be treated as hostile input
The file contains deliberate problems and inconsistencies. The importer must:
1. detect them
2. surface them
3. handle them using a documented policy
4. store the action taken in the database
5. show the result in an import report

Do not crash the import. Do not silently guess. Do not rewrite the CSV manually before upload.

## 6) Expected anomaly categories
The importer must be able to detect and classify issues like:
- duplicate expenses
- near-duplicate expenses with different amounts
- inconsistent dates and ambiguous dates
- missing currency
- missing payer
- settlement logged as an expense
- zero-value rows
- negative amount rows that may be refunds
- split type mismatches
- split percentages that do not sum to 100
- split details that conflict with the split type
- names with inconsistent casing or aliases
- members appearing before they joined or after they left
- expenses involving temporary guests
- rows with amounts requiring rounding
- trip expenses in foreign currency
- rows where the same description appears more than once with conflicting values

## 7) CSV handling policy to implement
Use the following policy unless a better choice is explicitly documented in `DECISIONS.md`.

### Dates
- Accept only unambiguous parsed dates.
- Store raw date text and parsed date separately.
- If a date is ambiguous, mark it `needs_review`.
- Never silently choose between month-first and day-first when both are plausible.

### Duplicates
- Detect duplicates using date, description similarity, amount, payer, currency, split participants, and notes.
- Mark suspected duplicates as `possible_duplicate`.
- Do not auto-delete.
- Require user approval to merge, keep both, or discard one.

### Settlements/payments
- If a row is a reimbursement or payback, store it as a payment/settlement, not as a normal expense.
- It must reduce balances without creating a new shared split.

### Missing payer
- Mark as `unresolved_payer`.
- Exclude from balance math until resolved.

### Missing currency
- Mark as `missing_currency`.
- Never assume the currency silently.
- Allow user resolution during import review.

### Negative amount
- Treat as a possible refund or reversal.
- Do not assume the meaning silently.
- Require user confirmation unless the note clearly identifies it.

### Zero amount
- Exclude from balance math by default.
- Keep it visible in the import report.

### Split type conflicts
- Validate that `split_type` matches `split_details`.
- If the type says equal but detailed shares are present, flag `split_conflict`.
- If percentages do not sum correctly, quarantine the row unless the deviation is a tiny rounding issue and a documented normalization rule exists.

### Membership over time
- A person only participates in expenses dated while they are active in the group.
- Store join date and leave date.
- Membership should be evaluated at the expense date.

### Alias handling
- Normalize names only when explicitly mapped or approved.
- Every alias mapping must be visible in the import report.

### Currency conversion
- Preserve original currency on every expense.
- Store converted base-currency values using a documented exchange rate snapshot.
- Never treat USD as INR.
- Use only free/open sources or seeded rates, no paid APIs.

## 8) Product scenarios the app must handle
The app must correctly support:
- equal split household expenses
- unequal / exact split expenses
- percentage split expenses
- share-based split expenses
- trip expenses with temporary guests
- settlement entries between members
- member join/leave changes over time
- foreign currency trip expenses
- import review and approval flows

## 9) Required data model
Use a relational schema. Suggested tables:

- users
- groups
- group_memberships
- expenses
- expense_splits
- settlements or payments
- imports
- import_rows
- import_anomalies
- alias_mappings
- exchange_rates
- balance_events or balance_snapshots
- audit_logs

### Suggested field design
#### groups
- id
- name
- base_currency
- created_by
- created_at

#### group_memberships
- id
- group_id
- member_name or user_id
- join_date
- leave_date nullable
- status
- created_at

#### expenses
- id
- group_id
- paid_by_member_id
- expense_date
- description
- amount_original
- currency_original
- amount_base
- base_currency
- split_type
- note
- source_import_row_id nullable
- created_at
- updated_at

#### expense_splits
- id
- expense_id
- member_id
- split_method_value
- percentage nullable
- share_weight nullable
- final_owed_amount
- amount_base

#### settlements/payments
- id
- group_id
- from_member_id
- to_member_id
- amount
- currency
- amount_base
- payment_date
- note

#### imports
- id
- group_id
- uploaded_by
- file_name
- file_hash
- status
- total_rows
- valid_rows
- anomaly_rows
- created_at

#### import_rows
- id
- import_id
- row_number
- raw_payload
- parsed_status
- action_taken
- resolved_payload
- created_at

#### import_anomalies
- id
- import_id
- row_number
- anomaly_type
- severity
- description
- detected_rule
- suggested_action
- final_action
- user_decision
- created_at

#### alias_mappings
- id
- group_id
- raw_name
- canonical_name
- approved_by
- approved_at

#### exchange_rates
- id
- base_currency
- quote_currency
- rate
- rate_date
- source
- created_at

#### audit_logs
- id
- actor_user_id
- entity_type
- entity_id
- action
- before_state
- after_state
- created_at

## 10) Balance calculation rules
This must be deterministic and explainable.

### Basic rule
For each expense:
- the payer gets credited for the full expense amount in base currency
- each participant gets debited for their owed share in base currency
- the net balance is payer credit minus participant debits
- settlements/payments reduce balances

### Traceability rule
For any member, the app must show:
- every expense they participated in
- every debit and credit component
- every settlement affecting them
- the final net result

### Rounding rule
- Store internal amounts with high precision
- Round only for display
- Keep a deterministic rounding policy
- Record rounding residue in the ledger if needed so totals always reconcile

The rounding utility should be isolated so it can be changed live if needed.

## 11) AI usage policy
Use AI carefully and visibly.

### Acceptable AI uses
- anomaly classification assistance
- alias suggestion assistance
- draft import policies
- test generation
- documentation drafting
- explanation of balance logic

### Forbidden AI uses
- silently fixing ambiguous rows
- silently choosing membership dates
- silently converting currency
- rewriting the CSV contents
- making final business decisions without user approval

### AI implementation rules
- use only free or open-source models/APIs or local models
- store prompts in files
- validate AI output with schemas
- log AI request/response pairs
- add deterministic fallback logic

### Required AI documentation
Create `AI_USAGE.md` with:
- tools used
- key prompts
- at least 3 incorrect AI outputs
- how the mistakes were caught
- what changed after each mistake

## 12) Import UX
The import flow must be a first-class feature.

### Flow
1. Upload CSV
2. Parse rows
3. Detect anomalies
4. Show a review screen
5. Allow approval / rejection / correction
6. Commit approved rows
7. Generate an import report

### Import report must include
- total rows
- valid rows
- quarantined rows
- duplicates found
- ambiguous dates
- missing payer rows
- missing currency rows
- settlement rows
- negative amount rows
- split conflicts
- alias mappings
- membership-related exclusions
- user decisions

## 13) Documentation deliverables
The final repo must contain:

### README.md
- setup instructions
- deployment instructions
- local run instructions
- environment variables
- AI tools used
- short product summary

### SCOPE.md
- full scope summary
- all CSV anomalies found
- handling policy for each anomaly
- schema summary
- membership policy
- currency policy
- rounding policy
- duplicate policy
- settlement policy

### DECISIONS.md
For every important engineering decision include:
- decision
- options considered
- why the chosen option won
- tradeoffs

### AI_USAGE.md
Include:
- AI tools used
- prompts used
- at least 3 wrong outputs
- how they were detected
- how the implementation changed

## 14) Recommended architecture
### Frontend
- Next.js App Router
- TypeScript
- Tailwind CSS
- clean forms and tables
- detail views and review screens

### Backend
- Next.js route handlers
- service layer for imports, balances, and anomaly handling
- schema validation
- deterministic utilities for split calculation, rounding, and exchange conversion

### Database
- relational database
- migrations
- indexes on foreign keys and common filters
- audit tables for imports and balances

### Testing
- unit tests for split types
- unit tests for balance math
- unit tests for anomaly detection
- integration tests for import workflow
- fixtures from the provided CSV

## 15) Suggested build order
1. project setup
2. auth
3. DB schema
4. groups and memberships
5. manual expense entry
6. split logic
7. settlement logic
8. CSV parser
9. anomaly detection
10. import review UI
11. balance engine
12. traceability UI
13. import report generation
14. decision logs
15. AI helper if needed
16. tests
17. deployment
18. README and docs

## 16) Quality bar
- Use TypeScript everywhere
- Keep logic out of UI components
- Avoid magic numbers
- Use clear utility functions for math and currency conversion
- Write code that is easy to explain in a live session
- Prefer explicit policies over hidden assumptions

## 17) Final acceptance criteria
The project is complete only if:
- users can log in
- groups can be created and edited
- membership changes over time are supported
- expenses can be created manually
- all CSV split types are supported
- settlements are separate from expenses
- the CSV imports through the app
- every anomaly is detected and surfaced
- no silent guesses are made
- balances are explainable line by line
- the import report exists
- the decision log exists
- the AI usage log exists
- the app is deployed publicly
- the repository has meaningful commit history

## 18) Final instruction to the building agent
Build a polished, explainable shared expenses app using Next.js and a relational database. Treat the CSV as messy, adversarial input. Preserve traceability over convenience. Make every policy explicit and deterministic. The live reviewers will test the exact path from a bad CSV row to the final balance number, so every transformation must be visible and defensible.
