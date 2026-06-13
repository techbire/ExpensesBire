import { Decimal } from "decimal.js";

// Ensure high precision for internal calculation
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type SplitInput = {
  member_id: string;
  split_method_value?: string; // Raw input like "30" for 30% or "2" for shares
};

export type SplitOutput = {
  member_id: string;
  split_method_value: string | null;
  percentage: Decimal | null;
  share_weight: Decimal | null;
  amount_base: Decimal;
  final_owed_amount: Decimal;
};

export function calculateEqualSplit(totalAmountBase: Decimal, members: string[]): SplitOutput[] {
  if (members.length === 0) return [];
  
  const count = new Decimal(members.length);
  const baseShare = totalAmountBase.dividedBy(count).toDecimalPlaces(4);
  
  // Handle remainder
  const sumBase = baseShare.times(count);
  const difference = totalAmountBase.minus(sumBase);
  
  return members.map((member_id, index) => {
    // Add the remainder to the first person to ensure it adds up exactly
    const adjustedShare = index === 0 ? baseShare.plus(difference) : baseShare;
    return {
      member_id,
      split_method_value: null,
      percentage: null,
      share_weight: null,
      amount_base: adjustedShare,
      final_owed_amount: adjustedShare,
    };
  });
}

export function calculateUnequalSplit(totalAmountBase: Decimal, splits: SplitInput[]): SplitOutput[] {
  let sum = new Decimal(0);
  
  const parsedSplits = splits.map(s => {
    const val = new Decimal(s.split_method_value || "0");
    sum = sum.plus(val);
    return { member_id: s.member_id, val, raw: s.split_method_value || "0" };
  });

  // For unequal splits, the sum of amounts should perfectly equal the totalAmountBase
  // If it doesn't, the CSV has an anomaly, but our engine calculates strictly what is passed.
  // Actually, unequal split values in the CSV are given in original currency. We need to convert them to base if there's an exchange rate.
  // For simplicity, we assume `split_method_value` here is ALREADY converted to base currency before calling this engine, 
  // or that the expense is in base currency.
  
  return parsedSplits.map(s => ({
    member_id: s.member_id,
    split_method_value: s.raw,
    percentage: null,
    share_weight: null,
    amount_base: s.val,
    final_owed_amount: s.val,
  }));
}

export function calculatePercentageSplit(totalAmountBase: Decimal, splits: SplitInput[]): SplitOutput[] {
  let percentageSum = new Decimal(0);
  
  const parsedSplits = splits.map(s => {
    const pct = new Decimal(s.split_method_value || "0");
    percentageSum = percentageSum.plus(pct);
    return { member_id: s.member_id, pct, raw: s.split_method_value || "0" };
  });

  // Validations like ensuring percentageSum == 100 should happen before this engine is called
  
  let calculatedSum = new Decimal(0);
  const results = parsedSplits.map((s, index) => {
    const amount = totalAmountBase.times(s.pct).dividedBy(100).toDecimalPlaces(4);
    calculatedSum = calculatedSum.plus(amount);
    return {
      member_id: s.member_id,
      split_method_value: s.raw,
      percentage: s.pct,
      share_weight: null,
      amount_base: amount,
      final_owed_amount: amount,
    };
  });

  // Fix rounding difference
  const diff = totalAmountBase.minus(calculatedSum);
  if (!diff.isZero() && results.length > 0) {
    results[0].amount_base = results[0].amount_base.plus(diff);
    results[0].final_owed_amount = results[0].amount_base;
  }

  return results;
}

export function calculateShareSplit(totalAmountBase: Decimal, splits: SplitInput[]): SplitOutput[] {
  let shareSum = new Decimal(0);
  
  const parsedSplits = splits.map(s => {
    const weight = new Decimal(s.split_method_value || "0");
    shareSum = shareSum.plus(weight);
    return { member_id: s.member_id, weight, raw: s.split_method_value || "0" };
  });

  if (shareSum.isZero()) {
    throw new Error("Total shares cannot be zero");
  }

  let calculatedSum = new Decimal(0);
  const results = parsedSplits.map((s, index) => {
    const amount = totalAmountBase.times(s.weight).dividedBy(shareSum).toDecimalPlaces(4);
    calculatedSum = calculatedSum.plus(amount);
    return {
      member_id: s.member_id,
      split_method_value: s.raw,
      percentage: null,
      share_weight: s.weight,
      amount_base: amount,
      final_owed_amount: amount,
    };
  });

  // Fix rounding difference
  const diff = totalAmountBase.minus(calculatedSum);
  if (!diff.isZero() && results.length > 0) {
    results[0].amount_base = results[0].amount_base.plus(diff);
    results[0].final_owed_amount = results[0].amount_base;
  }

  return results;
}
