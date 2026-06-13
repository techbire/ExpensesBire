import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { AddMemberModal } from "@/components/groups/AddMemberModal";
import { RemoveMemberButton } from "@/components/groups/RemoveMemberButton";
import Link from "next/link";
import { ArrowLeft, User, Calendar, Settings } from "lucide-react";

const prisma = new PrismaClient();

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: {
      memberships: {
        orderBy: { join_date: 'asc' }
      }
    }
  });

  if (!group) redirect("/dashboard");

  // Verify access
  const hasAccess = group.memberships.some(m => m.user_id === session.user?.id);
  if (!hasAccess) redirect("/dashboard");

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-800 flex items-center mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
            <p className="text-sm text-gray-500 mt-1">Base Currency: {group.base_currency}</p>
          </div>
          <div className="flex space-x-3">
            <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
              <Settings className="-ml-1 mr-2 h-4 w-4" />
              Settings
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members Column */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Members</h2>
              <AddMemberModal groupId={group.id} />
            </div>
            
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {group.memberships.map((member) => (
                <li key={member.id} className="py-3 flex items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                      {member.member_name}
                      {member.user_id === session.user?.id && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full dark:bg-green-900 dark:text-green-200">
                          You
                        </span>
                      )}
                      {member.status === "INACTIVE" && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full dark:bg-red-900 dark:text-red-200">
                          Left
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-0.5">
                      <Calendar className="h-3 w-3 mr-1" />
                      Joined {new Date(member.join_date).toLocaleDateString()}
                      {member.leave_date && ` - Left ${new Date(member.leave_date).toLocaleDateString()}`}
                    </p>
                  </div>
                  {member.status === "ACTIVE" && member.user_id !== session.user?.id && (
                    <div className="ml-2">
                      <RemoveMemberButton membershipId={member.id} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Placeholder for Expenses/Balances */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Balances</h2>
            <div className="text-center py-8 text-gray-500">
              Balance calculation engine not yet implemented.
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Expenses</h2>
            <div className="text-center py-8 text-gray-500">
              Expense tracking not yet implemented.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
