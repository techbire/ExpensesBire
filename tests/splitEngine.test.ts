import { Decimal } from "decimal.js";
import {
  calculateEqualSplit,
  calculateUnequalSplit,
  calculatePercentageSplit,
  calculateShareSplit,
} from "../src/lib/splitEngine";

describe("splitEngine", () => {
  describe("calculateEqualSplit", () => {
    it("should return empty array when no members are passed", () => {
      const result = calculateEqualSplit(new Decimal("100"), []);
      expect(result).toEqual([]);
    });

    it("should split amount equally among members", () => {
      const result = calculateEqualSplit(new Decimal("120"), ["user1", "user2", "user3"]);
      expect(result).toHaveLength(3);
      expect(result[0].amount_base.toString()).toBe("40");
      expect(result[1].amount_base.toString()).toBe("40");
      expect(result[2].amount_base.toString()).toBe("40");
    });

    it("should handle rounding remainders by adjusting the first member", () => {
      // 100 split 3 ways is 33.3333, remainder is 0.0001
      const result = calculateEqualSplit(new Decimal("100"), ["user1", "user2", "user3"]);
      expect(result).toHaveLength(3);
      expect(result[0].amount_base.toString()).toBe("33.3334");
      expect(result[1].amount_base.toString()).toBe("33.3333");
      expect(result[2].amount_base.toString()).toBe("33.3333");
      
      const sum = result.reduce((acc, curr) => acc.plus(curr.amount_base), new Decimal(0));
      expect(sum.toString()).toBe("100");
    });
  });

  describe("calculateUnequalSplit", () => {
    it("should return splits matching raw inputs", () => {
      const splits = [
        { member_id: "user1", split_method_value: "30" },
        { member_id: "user2", split_method_value: "70" },
      ];
      const result = calculateUnequalSplit(new Decimal("100"), splits);
      expect(result).toHaveLength(2);
      expect(result[0].amount_base.toString()).toBe("30");
      expect(result[1].amount_base.toString()).toBe("70");
    });

    it("should handle default 0 when no split_method_value is provided", () => {
      const splits = [
        { member_id: "user1", split_method_value: "50" },
        { member_id: "user2" },
      ];
      const result = calculateUnequalSplit(new Decimal("50"), splits);
      expect(result[0].amount_base.toString()).toBe("50");
      expect(result[1].amount_base.toString()).toBe("0");
    });
  });

  describe("calculatePercentageSplit", () => {
    it("should split amount according to percentages", () => {
      const splits = [
        { member_id: "user1", split_method_value: "25" },
        { member_id: "user2", split_method_value: "75" },
      ];
      const result = calculatePercentageSplit(new Decimal("200"), splits);
      expect(result).toHaveLength(2);
      expect(result[0].amount_base.toString()).toBe("50");
      expect(result[1].amount_base.toString()).toBe("150");
    });

    it("should adjust rounding errors on the first member to sum up exactly", () => {
      const splits = [
        { member_id: "user1", split_method_value: "33.33" },
        { member_id: "user2", split_method_value: "33.33" },
        { member_id: "user3", split_method_value: "33.34" },
      ];
      const result = calculatePercentageSplit(new Decimal("100"), splits);
      
      const sum = result.reduce((acc, curr) => acc.plus(curr.amount_base), new Decimal(0));
      expect(sum.toString()).toBe("100");
    });
  });

  describe("calculateShareSplit", () => {
    it("should split amount based on shares weight", () => {
      const splits = [
        { member_id: "user1", split_method_value: "1" },
        { member_id: "user2", split_method_value: "2" },
      ];
      const result = calculateShareSplit(new Decimal("150"), splits);
      expect(result).toHaveLength(2);
      expect(result[0].amount_base.toString()).toBe("50");
      expect(result[1].amount_base.toString()).toBe("100");
    });

    it("should throw error if total shares weight is zero", () => {
      const splits = [
        { member_id: "user1", split_method_value: "0" },
        { member_id: "user2", split_method_value: "0" },
      ];
      expect(() => calculateShareSplit(new Decimal("100"), splits)).toThrow("Total shares cannot be zero");
    });

    it("should handle share split rounding and balance with first member", () => {
      const splits = [
        { member_id: "user1", split_method_value: "1" },
        { member_id: "user2", split_method_value: "1" },
        { member_id: "user3", split_method_value: "1" },
      ];
      const result = calculateShareSplit(new Decimal("100"), splits);
      
      const sum = result.reduce((acc, curr) => acc.plus(curr.amount_base), new Decimal(0));
      expect(sum.toString()).toBe("100");
    });
  });
});
