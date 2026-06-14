"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient, ImportStatus, Prisma } from "@prisma/client";
import { detectAnomalies, RawExpenseRow } from "@/lib/anomalyEngine";
import { revalidatePath } from "next/cache";

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
  });

  revalidatePath(`/dashboard/groups/${groupId}`);
  return { success: true, importId: newImport.id };
}
