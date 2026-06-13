"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "decimal.js";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export type CreateSettlementInput = {
  group_id: string;
  from_member_id: string;
  to_member_id: string;
  amount: string;
  currency: string;
  amount_base: string;
  payment_date: string;
  note?: string;
};

export async function createSettlement(data: CreateSettlementInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!data.group_id || !data.from_member_id || !data.to_member_id || !data.amount) {
    throw new Error("Missing required fields");
  }

  const settlement = await prisma.$transaction(async (tx) => {
    const newSettlement = await tx.settlement.create({
      data: {
        group_id: data.group_id,
        from_member_id: data.from_member_id,
        to_member_id: data.to_member_id,
        amount: new Decimal(data.amount),
        currency: data.currency,
        amount_base: new Decimal(data.amount_base),
        payment_date: new Date(data.payment_date),
        note: data.note,
      }
    });

    await tx.auditLog.create({
      data: {
        actor_user_id: session.user.id,
        entity_type: "SETTLEMENT",
        entity_id: newSettlement.id,
        action: "CREATE",
        after_state: JSON.stringify(newSettlement),
      }
    });

    return newSettlement;
  });

  revalidatePath(`/dashboard/groups/${data.group_id}`);
  return { success: true, id: settlement.id };
}
