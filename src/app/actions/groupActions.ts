"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function createGroup(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name") as string;
  const base_currency = formData.get("base_currency") as string || "INR";

  if (!name) {
    throw new Error("Group name is required");
  }

  const group = await prisma.group.create({
    data: {
      name,
      base_currency,
      created_by: session.user.id,
      memberships: {
        create: {
          user_id: session.user.id,
          member_name: session.user.name || "Creator",
          join_date: new Date(),
        }
      }
    }
  });

  revalidatePath("/dashboard");
  return { id: group.id };
}

export async function editGroup(groupId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  if (!name) throw new Error("Group name is required");

  // Verify access
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { memberships: true }
  });
  if (!group) throw new Error("Group not found");
  
  const hasAccess = group.memberships.some(m => m.user_id === session.user?.id);
  if (!hasAccess) throw new Error("Unauthorized");

  await prisma.group.update({
    where: { id: groupId },
    data: { name }
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
