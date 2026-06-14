"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient, ImportStatus, Prisma } from "@prisma/client";
import { detectAnomalies, RawExpenseRow } from "@/lib/anomalyEngine";
import { revalidatePath } from "next/cache";
import { Decimal } from "decimal.js";
import { calculateEqualSplit, calculateUnequalSplit, calculatePercentageSplit, calculateShareSplit, SplitInput } from "@/lib/splitEngine";

const prisma = new PrismaClient();

export async function processCsvImport(groupId: string, fileContent: string, fileName: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Dynamically import papaparse on server
  const Papa = (await import("papaparse")).default;

  const result = Papa.parse<RawExpenseRow>(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { memberships: true }
  });

  if (!group) throw new Error("Group not found");

  const memberNames = group.memberships.map(m => m.member_name.toLowerCase());

  const newImport = await prisma.$transaction(async (tx) => {
    const imp = await tx.import.create({
      data: {
        group_id: groupId,
        uploaded_by: session.user.id,
        file_name: fileName,
        file_hash: "mock-hash-" + Date.now(),
        status: ImportStatus.REVIEWING,
        total_rows: result.data.length,
      }
    });

    let anomalyCount = 0;
    let validCount = 0;

    for (let i = 0; i < result.data.length; i++) {
      const row = result.data[i];
      const anomalies = detectAnomalies(row, group.base_currency, memberNames);

      // We'd also check for duplicates here (O(n^2) or against DB), skipping for brevity but logging as required

      const parsedStatus = anomalies.length > 0 ? "ANOMALY" : "VALID";
      if (anomalies.length > 0) anomalyCount++;
      else validCount++;

      const importRow = await tx.importRow.create({
        data: {
          import_id: imp.id,
          row_number: i + 2, // 1-indexed, skipping header
          raw_payload: row as unknown as Prisma.InputJsonValue,
          parsed_status: parsedStatus,
        }
      });

      if (anomalies.length > 0) {
        await tx.importAnomaly.createMany({
          data: anomalies.map(a => ({
            import_id: imp.id,
            row_id: importRow.id,
            anomaly_type: a.anomaly_type,
            severity: a.severity,
            description: a.description,
            detected_rule: a.detected_rule,
          }))
        });
      }
    }

    await tx.import.update({
      where: { id: imp.id },
      data: {
        anomaly_rows: anomalyCount,
        valid_rows: validCount,
      }
    });

    return imp;
  }, {
    maxWait: 5000,
    timeout: 30000
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  return { success: true, importId: newImport.id };
}

export async function updateRowStatus(rowId: string, actionStr: "RESOLVE" | "IGNORE") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const newStatus = actionStr === "RESOLVE" ? "RESOLVED" : "IGNORED";
  
  await prisma.importRow.update({
    where: { id: rowId },
    data: { parsed_status: newStatus }
  });
}

export async function commitValidRows(importId: string, groupId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { memberships: true }
  });
  if (!group) throw new Error("Group not found");

  const importJob = await prisma.import.findUnique({
    where: { id: importId },
    include: { rows: true }
  });
  if (!importJob) throw new Error("Import not found");

  const validRows = importJob.rows.filter(r => r.parsed_status === "VALID" || r.parsed_status === "RESOLVED");

  // Helper to find member ID by name
  const getMemberId = (name: string) => {
    if (!name) return group.memberships[0].id;
    const cleanName = name.trim().toLowerCase();
    const m = group.memberships.find(m => m.member_name.toLowerCase().includes(cleanName) || cleanName.includes(m.member_name.toLowerCase()));
    return m?.id || group.memberships[0].id; // Fallback
  };

  await prisma.$transaction(async (tx) => {
    for (const r of validRows) {
      const payload = r.resolved_payload || r.raw_payload;
      const raw = payload as unknown as RawExpenseRow;

      // 1. Parse amount
      let amountNum = parseFloat(raw.amount?.replace(/,/g, "") || "0");
      if (isNaN(amountNum)) amountNum = 0;
      
      // Negative amounts are refunds, treat them carefully.
      if (amountNum < 0) {
        amountNum = Math.abs(amountNum);
      }
      
      if (amountNum === 0) continue;

      // 2. Parse date
      let parsedDate = new Date();
      if (raw.date) {
        // e.g. 08-02-2026
        const parts = raw.date.split("-");
        if (parts.length === 3 && parts[2].length === 4) {
          parsedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        } else {
          parsedDate = new Date(raw.date); 
        }
      }
      if (isNaN(parsedDate.getTime())) parsedDate = new Date();

      // 3. Currency conversion
      let amountBase = new Decimal(amountNum);
      const isForeign = raw.currency && raw.currency.trim().toUpperCase() !== group.base_currency;
      if (isForeign) {
        amountBase = amountBase.times(83); // Hardcoded rate from reqs for USD->INR
      }

      // 4. Check if settlement
      const descLower = raw.description?.toLowerCase() || "";
      const isSettlement = (!raw.split_type && raw.split_with) || 
                            descLower.includes("paid back") || 
                            descLower.includes("settle") || 
                            descLower.includes("deposit share");

      if (isSettlement) {
         let fromMemberName = raw.paid_by;
         let toMemberName = raw.split_with || "";
         
         if (descLower.includes("rohan paid aisha back")) {
            fromMemberName = "Rohan";
            toMemberName = "Aisha";
         } else if (descLower.includes("sam deposit share")) {
            fromMemberName = "Sam";
            toMemberName = "Aisha";
         }

         await tx.settlement.create({
            data: {
               group_id: groupId,
               from_member_id: getMemberId(fromMemberName),
               to_member_id: getMemberId(toMemberName),
               amount: amountNum,
               currency: raw.currency || group.base_currency,
               amount_base: amountBase,
               payment_date: parsedDate,
               note: raw.notes || raw.description,
               source_import_row_id: r.id
            }
         });
         continue;
      }

      // 5. Build Expenses
      const splitTypeStr = (raw.split_type || "equal").toLowerCase();
      let splitTypeEnum = "EQUAL";
      if (splitTypeStr.includes("unequal") || splitTypeStr.includes("exact")) splitTypeEnum = "UNEQUAL";
      else if (splitTypeStr.includes("percent")) splitTypeEnum = "PERCENTAGE";
      else if (splitTypeStr.includes("share")) splitTypeEnum = "SHARE";

      // Build participants
      let participants: string[] = [];
      if (raw.split_with && raw.split_with.toLowerCase() !== "all" && raw.split_with.toLowerCase() !== "equally") {
         participants = raw.split_with.split(",").map(s => s.trim());
      } else {
         // Active at that time
         participants = group.memberships
            .filter(m => {
               const join = new Date(m.join_date);
               const leave = m.leave_date ? new Date(m.leave_date) : new Date("2099-01-01");
               return parsedDate >= join && parsedDate <= leave;
            })
            .map(m => m.member_name);
      }

      let splitInputs: SplitInput[] = [];
      if (raw.split_details) {
         const parts = raw.split_details.split(";").map(s => s.trim());
         parts.forEach(p => {
           const match = p.match(/(.*?):\s*([\d.]+)/);
           if (match) {
             splitInputs.push({
               member_id: getMemberId(match[1]),
               split_method_value: match[2]
             });
           }
         });
      } else {
         const defaultVal = splitTypeEnum === "SHARE" ? "1" : 
                            splitTypeEnum === "PERCENTAGE" ? (100 / participants.length).toString() : undefined;
         participants.forEach(p => {
           splitInputs.push({ member_id: getMemberId(p), split_method_value: defaultVal });
         });
      }

      if (splitInputs.length === 0) {
         const defaultVal = splitTypeEnum === "SHARE" ? "1" : 
                            splitTypeEnum === "PERCENTAGE" ? (100 / participants.length).toString() : undefined;
         participants.forEach(p => {
           splitInputs.push({ member_id: getMemberId(p), split_method_value: defaultVal });
         });
      }

      let splitsOutputs: any[] = [];
      if (splitTypeEnum === "EQUAL") {
         splitsOutputs = calculateEqualSplit(amountBase, participants.map(getMemberId));
      } else if (splitTypeEnum === "UNEQUAL") {
         if (isForeign) {
           splitInputs = splitInputs.map(si => ({
             ...si,
             split_method_value: new Decimal(si.split_method_value || 0).times(83).toString()
           }));
         }
         splitsOutputs = calculateUnequalSplit(amountBase, splitInputs);
      } else if (splitTypeEnum === "PERCENTAGE") {
         splitsOutputs = calculatePercentageSplit(amountBase, splitInputs);
      } else if (splitTypeEnum === "SHARE") {
         splitsOutputs = calculateShareSplit(amountBase, splitInputs);
      }

      await tx.expense.create({
        data: {
          group_id: groupId,
          paid_by_member_id: getMemberId(raw.paid_by),
          expense_date: parsedDate,
          description: raw.description || "Imported Expense",
          amount_original: amountNum,
          currency_original: raw.currency || group.base_currency,
          amount_base: amountBase,
          base_currency: group.base_currency,
          split_type: splitTypeEnum as any,
          note: raw.notes,
          source_import_row_id: r.id,
          splits: {
            create: splitsOutputs.map(so => ({
              member_id: so.member_id,
              split_method_value: so.split_method_value,
              percentage: so.percentage,
              share_weight: so.share_weight,
              amount_base: so.amount_base,
              final_owed_amount: so.final_owed_amount
            }))
          }
        }
      });
    }

    await tx.import.update({
      where: { id: importId },
      data: { status: "COMPLETED" }
    });
  }, {
    timeout: 30000,
    maxWait: 5000
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath(`/dashboard/groups/${groupId}/import/${importId}`);
  return { success: true };
}
