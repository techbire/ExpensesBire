import { AnomalyType, Severity } from "@prisma/client";

export type RawExpenseRow = {
  date: string;
  description: string;
  paid_by: string;
  amount: string;
  currency: string;
  split_type: string;
  split_with: string;
  split_details: string;
  notes: string;
};

export type Anomaly = {
  anomaly_type: AnomalyType;
  severity: Severity;
  description: string;
  detected_rule: string;
};

export function detectAnomalies(row: RawExpenseRow, groupBaseCurrency: string, _groupMembers: string[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // 1. Missing Data
  if (!row.paid_by || row.paid_by.trim() === "") {
    anomalies.push({
      anomaly_type: AnomalyType.MISSING_DATA,
      severity: Severity.ERROR,
      description: "Missing 'paid_by' field.",
      detected_rule: "Payer is required for an expense.",
    });
  }
  
  if (!row.currency || row.currency.trim() === "") {
    anomalies.push({
      anomaly_type: AnomalyType.MISSING_DATA,
      severity: Severity.ERROR,
      description: "Missing 'currency' field.",
      detected_rule: "Currency is required for an expense.",
    });
  }

  // 2. Formatting (Commas in amounts, extra decimals)
  if (row.amount.includes(",")) {
    anomalies.push({
      anomaly_type: AnomalyType.FORMATTING,
      severity: Severity.WARNING,
      description: `Amount '${row.amount}' contains commas.`,
      detected_rule: "Amounts should be purely numeric.",
    });
  }

  const numericAmount = parseFloat(row.amount.replace(/,/g, ""));
  if (isNaN(numericAmount)) {
    anomalies.push({
      anomaly_type: AnomalyType.FORMATTING,
      severity: Severity.ERROR,
      description: `Amount '${row.amount}' is not a valid number.`,
      detected_rule: "Amounts must be numeric.",
    });
  } else {
    // 3. Zero Amount
    if (numericAmount === 0) {
      anomalies.push({
        anomaly_type: AnomalyType.ZERO_AMOUNT,
        severity: Severity.WARNING,
        description: "Amount is zero.",
        detected_rule: "Zero value row.",
      });
    }

    // 4. Negative Amount
    if (numericAmount < 0) {
      anomalies.push({
        anomaly_type: AnomalyType.NEGATIVE_AMOUNT,
        severity: Severity.WARNING,
        description: "Amount is negative.",
        detected_rule: "Negative amounts are treated as refunds and need confirmation.",
      });
    }
  }

  // 5. Foreign Currency
  if (row.currency && row.currency.trim() !== groupBaseCurrency) {
    anomalies.push({
      anomaly_type: AnomalyType.FOREIGN_CURRENCY,
      severity: Severity.WARNING,
      description: `Currency '${row.currency}' differs from base currency '${groupBaseCurrency}'.`,
      detected_rule: "Foreign currencies require an exchange rate.",
    });
  }

  // 6. Settlements
  if (!row.split_type && row.split_with) {
    anomalies.push({
      anomaly_type: AnomalyType.SETTLEMENT,
      severity: Severity.WARNING,
      description: "Missing split type but 'split_with' provided. This might be a settlement.",
      detected_rule: "Possible reimbursement masquerading as an expense.",
    });
  }
  
  const descLower = row.description?.toLowerCase() || "";
  if (descLower.includes("paid back") || (descLower.includes("paid") && descLower.includes("back")) || descLower.includes("settle") || descLower.includes("deposit share")) {
    anomalies.push({
      anomaly_type: AnomalyType.SETTLEMENT,
      severity: Severity.WARNING,
      description: "Description suggests a settlement or deposit rather than a shared expense.",
      detected_rule: "Keywords 'paid back', 'deposit' detected.",
    });
  }

  // 7. Dates
  if (row.date && (!row.date.includes("-") || row.date.length < 8)) {
    anomalies.push({
      anomaly_type: AnomalyType.AMBIGUOUS_DATE,
      severity: Severity.WARNING,
      description: `Date format '${row.date}' is unusual.`,
      detected_rule: "Standard format should be DD-MM-YYYY.",
    });
  }

  // 8. Split Engine Conflicts
  const typeLower = row.split_type?.toLowerCase().trim();
  if (typeLower === "equal" && row.split_details && row.split_details.trim() !== "") {
    anomalies.push({
      anomaly_type: AnomalyType.SPLIT_CONFLICT,
      severity: Severity.ERROR,
      description: "Split type is 'equal', but 'split_details' are provided.",
      detected_rule: "Equal splits should not have custom detail shares.",
    });
  }

  if (typeLower === "percentage" && row.split_details) {
    const sum = row.split_details.split(";").reduce((acc, part) => {
      const match = part.match(/[\d.]+/);
      return acc + (match ? parseFloat(match[0]) : 0);
    }, 0);
    
    if (Math.abs(sum - 100) > 0.1) {
      anomalies.push({
        anomaly_type: AnomalyType.SPLIT_CONFLICT,
        severity: Severity.ERROR,
        description: `Percentages sum to ${sum}% instead of 100%.`,
        detected_rule: "Percentages must sum perfectly to 100.",
      });
    }
  }

  // Note: We leave DUPLICATE and ALIAS anomaly detection to the import handler because they require aggregate context (comparing against all rows/DB).

  return anomalies;
}
