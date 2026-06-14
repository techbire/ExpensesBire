"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { processCsvImport } from "@/app/actions/importActions";
import { UploadCloud, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ImportPage({ params }: { params: { id: string } }) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError("");
    setIsPending(true);

    try {
      const text = await file.text();
      const res = await processCsvImport(params.id, text, file.name);
      
      if (res.success) {
        router.push(`/dashboard/groups/${params.id}/import/${res.importId}`);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to process CSV file");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <Link href={`/dashboard/groups/${params.id}`} className="text-sm text-blue-600 hover:text-blue-800 flex items-center mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Group
      </Link>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Import Expenses</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Upload a CSV file containing your expenses. Our engine will parse the file, detect anomalies (like missing currency, duplicates, and split conflicts), and guide you through resolving them.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <div className="flex text-sm text-gray-600 dark:text-gray-300 justify-center mb-1">
            <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
              <span>Upload a CSV file</span>
              <input id="file-upload" name="file-upload" type="file" accept=".csv" className="sr-only" onChange={handleFileUpload} disabled={isPending} />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">CSV up to 5MB</p>
        </div>

        {isPending && (
          <div className="mt-6 flex items-center justify-center space-x-3 text-blue-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="font-medium">Analyzing CSV...</span>
          </div>
        )}
      </div>
    </div>
  );
}
