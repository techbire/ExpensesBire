# Engineering Decisions

## 1. Framework: Next.js 15 (App Router)
**Options Considered**: Next.js App Router vs Pages Router vs React SPA (Vite).
**Decision**: Next.js App Router.
**Why**: Provides robust full-stack capabilities, seamless server actions for form submissions, and API routes for complex background parsing of the CSV file. It perfectly matches the requirement for a modern web app.

## 2. Database & ORM: PostgreSQL (Neon) & Prisma
**Options Considered**: Prisma vs Drizzle vs raw SQL.
**Decision**: Prisma with PostgreSQL.
**Why**: The assignment mandates a relational DB. Prisma offers excellent type safety, fast schema iterations, and easy-to-read migrations. It works well with Next.js Server Components.

## 3. Financial Math & Rounding
**Options Considered**: Float vs Integer (cents) vs Decimal.
**Decision**: `Decimal` type via Prisma (`Decimal.js` in JS).
**Why**: Floating point math leads to precision errors (e.g., `0.1 + 0.2 = 0.30000000000000004`). Integer cents is good but handling fractions of cents (like `899.995` in the CSV) gets messy. `Decimal` provides arbitrary precision, enabling us to store 4 decimal places in the DB and round to 2 on the frontend.

## 4. Anomaly Detection Engine
**Options Considered**: Synchronous processing vs Queue-based async processing.
**Decision**: Synchronous processing with staged DB persistence.
**Why**: The CSV is small enough (44 rows) to parse synchronously in an API route or Server Action. We will save the parsed rows into `import_rows` and `import_anomalies` tables, establishing an async-like review queue that the user works through in the UI.

## 5. CSV Parsing
**Options Considered**: `papaparse` vs `csv-parse`.
**Decision**: `papaparse`.
**Why**: De facto standard for robust CSV parsing in JS. Handles edge cases well and is simple to use on both client and server.

## 6. Architecture of Balances
**Options Considered**: Materialized Views vs On-the-fly calculation vs Event Sourcing.
**Decision**: Event-sourced `expense_splits` and `settlements` with on-the-fly summation.
**Why**: The data volume is small enough that we can dynamically sum credits and debits on the fly. This guarantees that balances are always 100% explainable line-by-line, adhering strictly to the assignment's traceability rule.

## 7. Currency Conversion
**Options Considered**: Live API vs Seeded static rates.
**Decision**: Seeded static rates table (`exchange_rates`).
**Why**: Avoids relying on paid or flaky third-party APIs during a live review session. We will seed the DB with realistic historical rates (e.g., 1 USD = 83 INR). The import UI will allow overriding the rate for a specific expense.

## 8. Authentication
**Options Considered**: NextAuth.js vs Custom JWT.
**Decision**: NextAuth.js (Credentials Provider).
**Why**: Simplifies session management. The assignment only requires a "login module" without necessarily needing complex OAuth. Credentials provider gives us a clean, self-contained solution.
