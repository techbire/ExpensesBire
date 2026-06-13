import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import Link from "next/link";
import { Users } from "lucide-react";

const prisma = new PrismaClient();

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  // Fetch groups where user is a member
  const memberships = await prisma.groupMembership.findMany({
    where: { user_id: session.user.id },
    include: {
      group: {
        include: {
          _count: {
            select: { memberships: true, expenses: true }
          }
        }
      }
    },
    orderBy: { created_at: "desc" }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Groups</h1>
        <CreateGroupModal />
      </div>

      {memberships.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No groups yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Create a group to start tracking shared expenses with your friends or flatmates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map(({ group }) => (
            <Link
              key={group.id}
              href={`/dashboard/groups/${group.id}`}
              className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                    </div>
                  </div>
                  <div className="ml-4 w-0 flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                      {group.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {group.base_currency} Base Currency
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3 border-t border-gray-200 dark:border-gray-600">
                <div className="text-sm">
                  <span className="font-medium text-gray-900 dark:text-white">{group._count.memberships}</span> Members
                  <span className="mx-2 text-gray-400">|</span>
                  <span className="font-medium text-gray-900 dark:text-white">{group._count.expenses}</span> Expenses
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
