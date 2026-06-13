"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient, SplitType } from "@prisma/client";
import { Decimal } from "decimal.js";
import { revalidatePath } from "next/cache";
import { 
  calculateEqualSplit, 
  calculatePercentageSplit, 
  calculateShareSplit, 
  calculateUnequalSplit, 
  SplitInput 
} from "@/lib/splitEngine";

const prisma = new PrismaClient();

export type CreateExpenseInput = {
  group_id: string;
  paid_by_member_id: string;
  expense_date: string;
  description: string;
  amount_original: string;
  currency_original: string;
  amount_base: string;
  base_currency: string;
  split_type: SplitType;
  note?: string;
  splits: SplitInput[]; // Only needed if split_type is not EQUAL, but if it is EQUAL, members list is inferred from the splits payload (member_id only)
};

export async function createExpense(data: CreateExpenseInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Basic validation
  if (!data.group_id || !data.paid_by_member_id || !data.amount_original || !data.splits.length) {
    throw new Error("Missing required fields");
  }

  // Calculate splits
  const amountBaseDecimal = new Decimal(data.amount_base);
  let calculatedSplits: ReturnType<typeof calculateEqualSplit> = [];

  switch (data.split_type) {
    case SplitType.EQUAL:
      calculatedSplits = calculateEqualSplit(amountBaseDecimal, data.splits.map(s => s.member_id));
      break;
    case SplitType.UNEQUAL:
      calculatedSplits = calculateUnequalSplit(amountBaseDecimal, data.splits);
      break;
    case SplitType.PERCENTAGE:
      calculatedSplits = calculatePercentageSplit(amountBaseDecimal, data.splits);
      break;
    case SplitType.SHARE:
      calculatedSplits = calculateShareSplit(amountBaseDecimal, data.splits);
      break;
  }

  // Use a transaction to create expense and splits
  const expense = await prisma.$transaction(async (tx) => {
    const newExpense = await tx.expense.create({
      data: {
        group_id: data.group_id,
        paid_by_member_id: data.paid_by_member_id,
        expense_date: new Date(data.expense_date),
        description: data.description,
        amount_original: new Decimal(data.amount_original),
        currency_original: data.currency_original,
        amount_base: amountBaseDecimal,
        base_currency: data.base_currency,
        split_type: data.split_type,
        note: data.note,
        splits: {
          create: calculatedSplits.map(s => ({
            member_id: s.member_id,
            split_method_value: s.split_method_value,
            percentage: s.percentage,
            share_weight: s.share_weight,
            amount_base: s.amount_base,
            final_owed_amount: s.final_owed_amount
          }))
        }
      }
    });

    // Create Audit Log
    await tx.auditLog.create({
      data: {
        actor_user_id: session.user.id,
        entity_type: "EXPENSE",
        entity_id: newExpense.id,
        action: "CREATE",
        after_state: JSON.stringify(newExpense),
      }
    });

    return newExpense;
  });

  revalidatePath(`/dashboard/groups/${data.group_id}`);
  return { success: true, id: expense.id };
}
