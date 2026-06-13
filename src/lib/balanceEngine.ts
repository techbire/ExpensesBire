import { Decimal } from "decimal.js";

type RawExpense = {
  paid_by_member_id: string;
  amount_base: Decimal;
  splits: {
    member_id: string;
    final_owed_amount: Decimal;
  }[];
};

type RawSettlement = {
  from_member_id: string;
  to_member_id: string;
  amount_base: Decimal;
};

export type BalanceMap = Record<string, Decimal>;

export type SettlementSuggestion = {
  from_member_id: string;
  to_member_id: string;
  amount: Decimal;
};

export function calculateBalances(expenses: RawExpense[], settlements: RawSettlement[]): BalanceMap {
  const balances: BalanceMap = {};

  // Initialize helper
  const add = (id: string, amount: Decimal) => {
    if (!balances[id]) balances[id] = new Decimal(0);
    balances[id] = balances[id].plus(amount);
  };

  // Process Expenses
  for (const exp of expenses) {
    // The payer gets credited the total amount
    add(exp.paid_by_member_id, exp.amount_base);

    // Each person involved in the split gets debited their share
    for (const split of exp.splits) {
      add(split.member_id, split.final_owed_amount.negated());
    }
  }

  // Process Settlements
  for (const st of settlements) {
    // Sender (from) gets credited (they paid)
    add(st.from_member_id, st.amount_base);
    // Receiver (to) gets debited (they received)
    add(st.to_member_id, st.amount_base.negated());
  }

  // Round balances to 4 decimal places to avoid floating point issues
  for (const id in balances) {
    balances[id] = balances[id].toDecimalPlaces(4);
  }

  return balances;
}

export function calculateSuggestedSettlements(balances: BalanceMap): SettlementSuggestion[] {
  // Separate into debtors and creditors
  const debtors: { id: string; amount: Decimal }[] = [];
  const creditors: { id: string; amount: Decimal }[] = [];

  for (const [id, balance] of Object.entries(balances)) {
    if (balance.isNegative() && !balance.isZero()) {
      debtors.push({ id, amount: balance.abs() });
    } else if (balance.isPositive() && !balance.isZero()) {
      creditors.push({ id, amount: balance });
    }
  }

  // Sort descending by amount to optimize the greedy matching (largest debts to largest credits)
  debtors.sort((a, b) => b.amount.cmp(a.amount));
  creditors.sort((a, b) => b.amount.cmp(a.amount));

  const suggestions: SettlementSuggestion[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settledAmount = Decimal.min(debtor.amount, creditor.amount);

    suggestions.push({
      from_member_id: debtor.id,
      to_member_id: creditor.id,
      amount: settledAmount,
    });

    debtor.amount = debtor.amount.minus(settledAmount);
    creditor.amount = creditor.amount.minus(settledAmount);

    // Use a small epsilon to avoid floating point infinite loops
    if (debtor.amount.abs().lessThan(0.0001)) dIdx++;
    if (creditor.amount.abs().lessThan(0.0001)) cIdx++;
  }

  return suggestions;
}
