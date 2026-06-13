import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

const prisma = new PrismaClient();

export default async function ImportReviewPage({ params }: { params: { id: string, importId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const importJob = await prisma.import.findUnique({
    where: { id: params.importId },
    include: {
      rows: {
        include: { anomalies: true },
        orderBy: { row_number: 'asc' }
      }
    }
  });

  if (!importJob) redirect(`/dashboard/groups/${params.id}`);

  return (
    <div className="max-w-6xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-6">
        <Link href={`/dashboard/groups/${params.id}`} className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Group
        </Link>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">
          Commit Valid Rows
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 font-medium mb-1">Total Rows</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{importJob.total_rows}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 font-medium mb-1">Valid Rows</p>
          <p className="text-3xl font-bold text-green-600">{importJob.valid_rows}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 font-medium mb-1">Rows with Anomalies</p>
          <p className="text-3xl font-bold text-amber-500">{importJob.anomaly_rows}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 font-medium mb-1">Status</p>
          <p className="text-xl font-bold text-blue-600 uppercase mt-2">{importJob.status}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Import Queue</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raw Payload (Preview)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anomalies Detected</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {importJob.rows.map((row) => {
                const payload: any = row.raw_payload;
                return (
                  <tr key={row.id} className={row.parsed_status === "ANOMALY" ? "bg-amber-50 dark:bg-amber-900/10" : ""}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      #{row.row_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {row.parsed_status === "VALID" && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> Valid</span>}
                      {row.parsed_status === "ANOMALY" && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><AlertTriangle className="w-3 h-3 mr-1"/> Needs Review</span>}
                      {row.parsed_status === "IGNORED" && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><XCircle className="w-3 h-3 mr-1"/> Ignored</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300 max-w-xs truncate">
                      <span className="font-medium">{payload.date}</span>: {payload.description} ({payload.amount} {payload.currency})
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {row.anomalies.map(a => (
                        <div key={a.id} className="text-amber-700 dark:text-amber-400 text-xs mb-1">
                          • {a.anomaly_type}: {a.description}
                        </div>
                      ))}
                      {row.anomalies.length === 0 && <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {row.parsed_status === "ANOMALY" ? (
                        <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">Resolve</button>
                      ) : (
                        <button className="text-gray-400 hover:text-red-600 ml-4">Ignore</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
