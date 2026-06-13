"use client";

import { useState } from "react";
import { markMemberInactive } from "@/app/actions/memberActions";
import { UserMinus } from "lucide-react";

export function RemoveMemberButton({ membershipId }: { membershipId: string }) {
  const [isPending, setIsPending] = useState(false);

  const handleRemove = async () => {
    const leaveDate = prompt("Enter leave date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
    if (!leaveDate) return;

    if (confirm("Are you sure you want to mark this member as inactive? They will no longer participate in new expenses.")) {
      setIsPending(true);
      try {
        await markMemberInactive(membershipId, leaveDate);
      } catch (e) {
        console.error(e);
        alert("Failed to update membership");
      } finally {
        setIsPending(false);
      }
    }
  };

  return (
    <button
      onClick={handleRemove}
      disabled={isPending}
      className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors"
      title="Mark inactive"
    >
      <UserMinus className="h-4 w-4" />
    </button>
  );
}
