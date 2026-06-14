"use client";

import { useState } from "react";
import { createExpense } from "@/app/actions/expenseActions";
import { SplitType } from "@prisma/client";
import { PlusCircle } from "lucide-react";

type Member = { id: string; member_name: string; status: string };

export function AddExpenseModal({ groupId, members, baseCurrency }: { groupId: string, members: Member[], baseCurrency: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const splitType = SplitType.EQUAL;

  // Default all active members to be included in EQUAL split
  const activeMembers = members.filter(m => m.status === "ACTIVE");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(activeMembers.map(m => m.id));
  
  // Basic payload state
  const [payerId, setPayerId] = useState(activeMembers[0]?.id || "");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);

    try {
      await createExpense({
        group_id: groupId,
        paid_by_member_id: payerId,
        expense_date: date,
        description,
        amount_original: amount,
        currency_original: baseCurrency,
        amount_base: amount, // Assuming base currency for manual entry in v1
        base_currency: baseCurrency,
        split_type: splitType,
        splits: selectedMembers.map(member_id => ({ member_id })) // Simple EQUAL split logic for UI v1
      });
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      alert("Failed to add expense");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
      >
        <PlusCircle className="-ml-1 mr-2 h-5 w-5" />
        Add Expense
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
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Add Expense</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <input type="text" required value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="e.g. Dinner at Marina" />
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Paid By</label>
                    <select required value={payerId} onChange={e => setPayerId(e.target.value)} className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.member_name} {m.status === 'INACTIVE' ? '(Inactive)' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Split With (Equal Split)</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border p-3 rounded-md dark:border-gray-600">
                      {activeMembers.map(m => (
                        <label key={m.id} className="flex items-center">
                          <input 
                            type="checkbox" 
                            checked={selectedMembers.includes(m.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedMembers([...selectedMembers, m.id]);
                              else setSelectedMembers(selectedMembers.filter(id => id !== m.id));
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                          />
                          <span className="ml-2 text-sm text-gray-900 dark:text-gray-300">{m.member_name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Note: Only Equal Split is fully supported in this manual entry UI for now. Complex splits will be imported via CSV.</p>
                  </div>

                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" disabled={isPending} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                    {isPending ? "Saving..." : "Save Expense"}
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
