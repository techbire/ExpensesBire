import { Decimal } from "decimal.js";
import {
  calculateBalances,
  calculateSuggestedSettlements,
} from "../src/lib/balanceEngine";

describe("balanceEngine", () => {
  describe("calculateBalances", () => {
    it("should calculate correct balances for simple expenses", () => {
      // User A paid 90, split equally among A, B, C (30 each)
      // A should have +60 (90 paid - 30 owed)
      // B should have -30 (0 paid - 30 owed)
      // C should have -30 (0 paid - 30 owed)
      const expenses = [
        {
          paid_by_member_id: "A",
          amount_base: new Decimal("90"),
          splits: [
            { member_id: "A", final_owed_amount: new Decimal("30") },
            { member_id: "B", final_owed_amount: new Decimal("30") },
            { member_id: "C", final_owed_amount: new Decimal("30") },
          ],
        },
      ];

      const balances = calculateBalances(expenses, []);
      expect(balances["A"].toString()).toBe("60");
      expect(balances["B"].toString()).toBe("-30");
      expect(balances["C"].toString()).toBe("-30");
    });

    it("should adjust balances correctly when settlements are applied", () => {
      // User A paid 90, split equally among A, B, C.
      // Balances before settlement: A: +60, B: -30, C: -30
      // B settles with A for 30
      // Balances after: A: +30, B: 0, C: -30 (since B paid A, A gets credited - wait:
      // Let's trace the engine's calculation:
      // Sender (B) gets credited (+30)
      // Receiver (A) gets debited (-30)
      // So B: -30 (expense) + 30 (settlement) = 0
      // A: +60 (expense) - 30 (settlement) = +30.
      // This is correct because A received money, so their net positive balance reduces.
      const expenses = [
        {
          paid_by_member_id: "A",
          amount_base: new Decimal("90"),
          splits: [
            { member_id: "A", final_owed_amount: new Decimal("30") },
            { member_id: "B", final_owed_amount: new Decimal("30") },
            { member_id: "C", final_owed_amount: new Decimal("30") },
          ],
        },
      ];

      const settlements = [
        {
          from_member_id: "B",
          to_member_id: "A",
          amount_base: new Decimal("30"),
        },
      ];

      const balances = calculateBalances(expenses, settlements);
      expect(balances["A"].toString()).toBe("30");
      expect(balances["B"].toString()).toBe("0");
      expect(balances["C"].toString()).toBe("-30");
    });
  });

  describe("calculateSuggestedSettlements", () => {
    it("should return correct settlement recommendation to clear debts", () => {
      // Balances: A: +60, B: -30, C: -30
      // B pays A 30, C pays A 30
      const balances = {
        A: new Decimal("60"),
        B: new Decimal("-30"),
        C: new Decimal("-30"),
      };

      const suggestions = calculateSuggestedSettlements(balances);
      expect(suggestions).toHaveLength(2);
      
      // Since sorting is descending by absolute amount, B and C both owe 30.
      // Verify suggestions net to 0.
      const totalSuggested = suggestions.reduce((acc, curr) => acc.plus(curr.amount), new Decimal(0));
      expect(totalSuggested.toString()).toBe("60");

      const hasBtoA = suggestions.some(s => s.from_member_id === "B" && s.to_member_id === "A" && s.amount.equals(30));
      const hasCtoA = suggestions.some(s => s.from_member_id === "C" && s.to_member_id === "A" && s.amount.equals(30));
      expect(hasBtoA).toBe(true);
      expect(hasCtoA).toBe(true);
    });

    it("should handle complex balances with minimal transactions", () => {
      // Balances: A: +100, B: -60, C: -40
      // B pays A 60, C pays A 40
      const balances = {
        A: new Decimal("100"),
        B: new Decimal("-60"),
        C: new Decimal("-40"),
      };

      const suggestions = calculateSuggestedSettlements(balances);
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0]).toEqual({
        from_member_id: "B",
        to_member_id: "A",
        amount: new Decimal("60"),
      });
      expect(suggestions[1]).toEqual({
        from_member_id: "C",
        to_member_id: "A",
        amount: new Decimal("40"),
      });
    });
  });
});
