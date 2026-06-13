"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient, MembershipStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function addMember(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const group_id = formData.get("group_id") as string;
  const member_name = formData.get("member_name") as string;
  const join_date_str = formData.get("join_date") as string;
  const is_registered = formData.get("is_registered") === "true";
  const user_email = formData.get("user_email") as string;

  if (!group_id || !member_name || !join_date_str) {
    throw new Error("Missing required fields");
  }

  // Ensure user has access to group
  const hasAccess = await prisma.groupMembership.findFirst({
    where: { group_id, user_id: session.user.id }
  });

  if (!hasAccess) throw new Error("Unauthorized");

  let user_id = null;
  if (is_registered && user_email) {
    const user = await prisma.user.findUnique({ where: { email: user_email }});
    if (user) user_id = user.id;
  }

  await prisma.groupMembership.create({
    data: {
      group_id,
      member_name,
      join_date: new Date(join_date_str),
      user_id
    }
  });

  revalidatePath(`/dashboard/groups/${group_id}`);
}

export async function markMemberInactive(membership_id: string, leave_date_str: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await prisma.groupMembership.findUnique({ where: { id: membership_id }});
  if (!membership) throw new Error("Not found");

  const hasAccess = await prisma.groupMembership.findFirst({
    where: { group_id: membership.group_id, user_id: session.user.id }
  });
  if (!hasAccess) throw new Error("Unauthorized");

  await prisma.groupMembership.update({
    where: { id: membership_id },
    data: {
      status: MembershipStatus.INACTIVE,
      leave_date: new Date(leave_date_str)
    }
  });

  revalidatePath(`/dashboard/groups/${membership.group_id}`);
}
