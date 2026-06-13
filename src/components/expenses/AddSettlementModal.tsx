"use client";

import { useState } from "react";
import { createSettlement } from "@/app/actions/settlementActions";
import { ArrowRightLeft } from "lucide-react";

type Member = { id: string; member_name: string; status: string };

export function AddSettlementModal({ groupId, members, baseCurrency }: { groupId: string, members: Member[], baseCurrency: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromId === toId) {
      alert("Sender and receiver cannot be the same.");
      return;
    }
    
    setIsPending(true);
    try {
      await createSettlement({
        group_id: groupId,
        from_member_id: fromId,
        to_member_id: toId,
        amount: amount,
        currency: baseCurrency,
        amount_base: amount,
        payment_date: date,
        note: "Manual settlement"
      });
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      alert("Failed to record settlement");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
      >
        <ArrowRightLeft className="-ml-1 mr-2 h-5 w-5" />
        Record Payment
      </button>

      {isOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setIsOpen(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-900 dark:opacity-90"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4 space-y-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Record Settlement</h3>
                  
                  <div className="grid grid-cols-2 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">From</label>
                      <select required value={fromId} onChange={e => setFromId(e.target.value)} className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="" disabled>Select payer</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.member_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">To</label>
                      <select required value={toId} onChange={e => setToId(e.target.value)} className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="" disabled>Select receiver</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.member_name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount ({baseCurrency})</label>
                      <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                      <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" disabled={isPending} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                    {isPending ? "Saving..." : "Save Payment"}
                  </button>
                  <button type="button" onClick={() => setIsOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
