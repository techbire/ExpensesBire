# Shared Expenses & Reconciliation App

This is a premium, full-stack Next.js 15 Web Application designed to manage and reconcile shared household and trip expenses for small groups. It handles complex split types (Equal, Unequal, Percentage, and Shares), supports multiple currencies with exchange rate overrides, and features an interactive CSV import review system to flag and resolve anomalies.

---

## 🚀 Key Features
- **Deterministic Math Engine**: High-precision calculations powered by `Decimal.js` to eliminate floating-point rounding issues.
- **Traceable Ledger**: Every member's balance is traceable back to the source expenses, splits, and settlements.
- **Adversarial CSV Importer**: Custom parsing and rules engine that flags:
  - Missing payers and missing currencies.
  - Zero/Negative amounts (possible refunds).
  - Ambiguous date formats.
  - Casing mismatches and member aliases (e.g., `Priya S` vs `Priya`).
  - Active timeline membership violations.
  - Duplicate and near-duplicate entries.
- **Authentication**: Secure registration and login module powered by NextAuth.js.
- **Settlement Recommendations**: Greedy matching algorithm suggesting the minimal number of transactions required to settle all debts.

---

## 🛠️ Technology Stack
- **Framework**: Next.js 15 (App Router with Server Actions & API routes)
- **Language**: TypeScript
- **Database & ORM**: PostgreSQL via Neon DB & Prisma ORM
- **Styling**: Tailwind CSS
- **Testing**: Jest & `ts-jest` for native TypeScript unit testing

---

## ⚙️ Environment Variables
Create a `.env` file in the root directory and configure the following variables:

```env
# Database Connection (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key"
```

---

## 🏃 Local Run & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Migration & Client Generation
Ensure your `.env` contains a valid `DATABASE_URL` link, then run:
```bash
npx prisma db push
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Testing

We have built a unit test suite to verify the core engines:
- **Split Engine**: Validates split calculations and remainder balance adjustments.
- **Balance Engine**: Verifies credits/debits calculation and debt minimization recommendations.
- **Anomaly Engine**: Checks detection of various CSV import issues.

To run the test suite:
```bash
npm run test
```

---

## ☁️ Deployment on Vercel

1. **Push your code** to a GitHub repository.
2. **Import the project** in the Vercel Dashboard.
3. Configure your production **Environment Variables** (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`) in Vercel settings.
4. **Deploy**. Next.js App Router projects build natively on Vercel.

---

## 🤖 AI Tools Used
- **Gemini 3.5 Flash**: Assisting in the engineering implementation, test drafting, and documentation.
- For a comprehensive log of AI prompts, wrong outputs, and detections, refer to [AI_USAGE.md](file:///c:/Users/anshg/OneDrive/Desktop/ExpensesBire/AI_USAGE.md).
