-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SplitType" AS ENUM ('EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARE');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'REVIEWING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RowStatus" AS ENUM ('VALID', 'ANOMALY', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "RowAction" AS ENUM ('NONE', 'IMPORTED', 'MODIFIED', 'CONVERTED_TO_SETTLEMENT', 'DISCARDED');

-- CreateEnum
CREATE TYPE "AnomalyType" AS ENUM ('MISSING_DATA', 'FORMATTING', 'DUPLICATE', 'ALIAS', 'SPLIT_CONFLICT', 'MEMBERSHIP', 'SETTLEMENT', 'NEGATIVE_AMOUNT', 'ZERO_AMOUNT', 'FOREIGN_CURRENCY', 'AMBIGUOUS_DATE');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_currency" TEXT NOT NULL DEFAULT 'INR',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMembership" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT,
    "member_name" TEXT NOT NULL,
    "join_date" TIMESTAMP(3) NOT NULL,
    "leave_date" TIMESTAMP(3),
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "paid_by_member_id" TEXT NOT NULL,
    "expense_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount_original" DECIMAL(12,4) NOT NULL,
    "currency_original" TEXT NOT NULL,
    "amount_base" DECIMAL(12,4) NOT NULL,
    "base_currency" TEXT NOT NULL,
    "split_type" "SplitType" NOT NULL,
    "note" TEXT,
    "source_import_row_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseSplit" (
    "id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "split_method_value" TEXT,
    "percentage" DECIMAL(5,2),
    "share_weight" DECIMAL(10,4),
    "amount_base" DECIMAL(12,4) NOT NULL,
    "final_owed_amount" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "ExpenseSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "from_member_id" TEXT NOT NULL,
    "to_member_id" TEXT NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "amount_base" DECIMAL(12,4) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "source_import_row_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Import" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_hash" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "valid_rows" INTEGER NOT NULL DEFAULT 0,
    "anomaly_rows" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "import_id" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "parsed_status" "RowStatus" NOT NULL DEFAULT 'VALID',
    "action_taken" "RowAction" NOT NULL DEFAULT 'NONE',
    "resolved_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportAnomaly" (
    "id" TEXT NOT NULL,
    "import_id" TEXT NOT NULL,
    "row_id" TEXT NOT NULL,
    "anomaly_type" "AnomalyType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "description" TEXT NOT NULL,
    "detected_rule" TEXT NOT NULL,
    "final_action" TEXT,
    "user_decision" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AliasMapping" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "raw_name" TEXT NOT NULL,
    "canonical_member_id" TEXT NOT NULL,
    "approved_by" TEXT NOT NULL,
    "approved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AliasMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "base_currency" TEXT NOT NULL,
    "quote_currency" TEXT NOT NULL,
    "rate" DECIMAL(10,6) NOT NULL,
    "rate_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before_state" JSONB,
    "after_state" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_source_import_row_id_key" ON "Expense"("source_import_row_id");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_source_import_row_id_key" ON "Settlement"("source_import_row_id");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paid_by_member_id_fkey" FOREIGN KEY ("paid_by_member_id") REFERENCES "GroupMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_source_import_row_id_fkey" FOREIGN KEY ("source_import_row_id") REFERENCES "ImportRow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "GroupMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_from_member_id_fkey" FOREIGN KEY ("from_member_id") REFERENCES "GroupMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_to_member_id_fkey" FOREIGN KEY ("to_member_id") REFERENCES "GroupMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_source_import_row_id_fkey" FOREIGN KEY ("source_import_row_id") REFERENCES "ImportRow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "Import"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportAnomaly" ADD CONSTRAINT "ImportAnomaly_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "Import"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportAnomaly" ADD CONSTRAINT "ImportAnomaly_row_id_fkey" FOREIGN KEY ("row_id") REFERENCES "ImportRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AliasMapping" ADD CONSTRAINT "AliasMapping_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AliasMapping" ADD CONSTRAINT "AliasMapping_canonical_member_id_fkey" FOREIGN KEY ("canonical_member_id") REFERENCES "GroupMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AliasMapping" ADD CONSTRAINT "AliasMapping_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
